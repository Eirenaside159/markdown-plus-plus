/**
 * Cloudflare Worker for GitLab OAuth Flow
 * 
 * Setup:
 * 1. Create a GitLab OAuth Application: https://gitlab.com/-/profile/applications
 *    - Redirect URI: https://your-worker.workers.dev/auth/gitlab/callback
 *    - Scopes: api, read_user, read_repository, write_repository
 * 
 * 2. Set environment variables in Cloudflare Workers:
 *    - GITLAB_CLIENT_ID: Your OAuth App Application ID
 *    - GITLAB_CLIENT_SECRET: Your OAuth App Secret
 *    - APP_URL: Your frontend app URL (e.g., https://markdown-plus-plus.com)
 *    - GITLAB_URL: (Optional) GitLab instance URL, defaults to https://gitlab.com
 * 
 * Deploy:
 * ```bash
 * npx wrangler deploy workers/oauth-gitlab.ts
 * ```
 */

interface Env {
  GITLAB_CLIENT_ID: string;
  GITLAB_CLIENT_SECRET: string;
  APP_URL: string;
  GITLAB_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const gitlabUrl = env.GITLAB_URL || 'https://gitlab.com';
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // Step 1: Redirect to GitLab OAuth
      if (url.pathname === '/auth/gitlab/login') {
        const state = crypto.randomUUID();
        const redirectUri = `${url.origin}/auth/gitlab/callback`;
        
        const authUrl = new URL(`${gitlabUrl}/oauth/authorize`);
        authUrl.searchParams.set('client_id', env.GITLAB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'api read_user read_repository write_repository');
        authUrl.searchParams.set('state', state);
        
        return Response.redirect(authUrl.toString(), 302);
      }
      
      // Step 2: Handle callback from GitLab
      if (url.pathname === '/auth/gitlab/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        if (!code) {
          return redirectToApp(env.APP_URL, {
            error: 'missing_code',
            error_description: 'Authorization code not provided',
          });
        }
        
        const redirectUri = `${url.origin}/auth/gitlab/callback`;
        
        // Exchange code for access token
        const tokenResponse = await fetch(`${gitlabUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITLAB_CLIENT_ID,
            client_secret: env.GITLAB_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        
        if (!tokenResponse.ok) {
          return redirectToApp(env.APP_URL, {
            error: 'token_exchange_failed',
            error_description: 'Failed to exchange code for token',
          });
        }
        
        const tokenData = await tokenResponse.json() as any;
        
        if (tokenData.error) {
          return redirectToApp(env.APP_URL, {
            error: tokenData.error,
            error_description: tokenData.error_description,
          });
        }
        
        // Redirect back to app with token
        return redirectToApp(env.APP_URL, {
          provider: 'gitlab',
          token: tokenData.access_token,
          state,
        });
      }
      
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            provider: 'gitlab',
            gitlab_url: gitlabUrl,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
      
      // Default: Show usage info
      return new Response(
        JSON.stringify({
          name: 'GitLab OAuth Worker',
          endpoints: {
            login: '/auth/gitlab/login',
            callback: '/auth/gitlab/callback',
            health: '/health',
          },
          gitlab_url: gitlabUrl,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
      
    } catch (error) {
      console.error('OAuth error:', error);
      
      return redirectToApp(env.APP_URL, {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};

/**
 * Redirect to app with query parameters
 */
function redirectToApp(appUrl: string, params: Record<string, string>): Response {
  const url = new URL(appUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return Response.redirect(url.toString(), 302);
}

