/**
 * Cloudflare Worker for GitHub OAuth Flow
 * 
 * Setup:
 * 1. Create a GitHub OAuth App: https://github.com/settings/applications/new
 *    - Homepage URL: https://your-app.com
 *    - Callback URL: https://your-worker.workers.dev/auth/github/callback
 * 
 * 2. Set environment variables in Cloudflare Workers:
 *    - GITHUB_CLIENT_ID: Your OAuth App Client ID
 *    - GITHUB_CLIENT_SECRET: Your OAuth App Client Secret
 *    - APP_URL: Your frontend app URL (e.g., https://markdown-plus-plus.com)
 * 
 * Deploy:
 * ```bash
 * npx wrangler deploy workers/oauth-github.ts
 * ```
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  APP_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
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
      // Step 1: Redirect to GitHub OAuth
      if (url.pathname === '/auth/github/login') {
        const state = crypto.randomUUID();
        const redirectUri = `${url.origin}/auth/github/callback`;
        
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'repo');
        authUrl.searchParams.set('state', state);
        
        return Response.redirect(authUrl.toString(), 302);
      }
      
      // Step 2: Handle callback from GitHub
      if (url.pathname === '/auth/github/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        if (!code) {
          return redirectToApp(env.APP_URL, {
            error: 'missing_code',
            error_description: 'Authorization code not provided',
          });
        }
        
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
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
          provider: 'github',
          token: tokenData.access_token,
          state,
        });
      }
      
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            provider: 'github',
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
          name: 'GitHub OAuth Worker',
          endpoints: {
            login: '/auth/github/login',
            callback: '/auth/github/callback',
            health: '/health',
          },
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

