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
        
        // Get client_id from query parameter or fallback to environment variable
        const queryClientId = url.searchParams.get('client_id');
        const envClientId = env.GITLAB_CLIENT_ID;
        
        console.log('[Worker Debug] Query client_id:', queryClientId);
        console.log('[Worker Debug] Env client_id:', envClientId);
        
        // Prefer query parameter, fallback to env variable
        const clientId = (queryClientId && queryClientId !== 'undefined' && queryClientId.trim()) 
          ? queryClientId.trim() 
          : (envClientId && envClientId !== 'undefined' && envClientId.trim() 
            ? envClientId.trim() 
            : null);
        
        console.log('[Worker Debug] Final clientId:', clientId);
        
        if (!clientId) {
          return new Response(
            JSON.stringify({ 
              error: 'client_id is required',
              details: {
                queryClientId: queryClientId || 'not provided',
                envClientId: envClientId ? 'provided' : 'not provided'
              }
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }
        
        const authUrl = new URL(`${gitlabUrl}/oauth/authorize`);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'api read_user read_repository write_repository');
        authUrl.searchParams.set('state', state);
        
        console.log('[Worker Debug] Redirecting to GitLab:', authUrl.toString());
        
        return Response.redirect(authUrl.toString(), 302);
      }
      
      // Step 2: Handle callback from GitLab
      if (url.pathname === '/auth/gitlab/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        console.log('[Worker] GitLab callback received, code:', code ? 'present' : 'missing');
        
        if (!code) {
          return redirectToApp(env.APP_URL, {
            error: 'missing_code',
            error_description: 'Authorization code not provided',
          });
        }
        
        const redirectUri = `${url.origin}/auth/gitlab/callback`;
        
        console.log('[Worker] Exchanging code for token...');
        console.log('[Worker] Client ID:', env.GITLAB_CLIENT_ID ? 'present' : 'missing');
        console.log('[Worker] Client Secret:', env.GITLAB_CLIENT_SECRET ? 'present' : 'missing');
        
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
        
        console.log('[Worker] Token response status:', tokenResponse.status);
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('[Worker] Token exchange failed:', errorText);
          return redirectToApp(env.APP_URL, {
            error: 'token_exchange_failed',
            error_description: 'Failed to exchange code for token',
          });
        }
        
        const tokenData = await tokenResponse.json() as any;
        
        console.log('[Worker] Token data received, access_token:', tokenData.access_token ? 'present' : 'missing');
        
        if (tokenData.error) {
          console.error('[Worker] Token data contains error:', tokenData.error);
          return redirectToApp(env.APP_URL, {
            error: tokenData.error,
            error_description: tokenData.error_description,
          });
        }
        
        if (!tokenData.access_token) {
          console.error('[Worker] No access_token in response:', tokenData);
          return redirectToApp(env.APP_URL, {
            error: 'no_access_token',
            error_description: 'Access token not provided in response',
          });
        }
        
        console.log('[Worker] Redirecting to app with token (length:', tokenData.access_token.length, ')');
        
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

