# OAuth Workers for Remote Repository Integration

This directory contains Cloudflare Workers for handling GitHub and GitLab OAuth flows.

## Why Workers?

OAuth requires a backend to securely exchange authorization codes for access tokens. These lightweight Cloudflare Workers provide:

- ✅ Secure token exchange
- ✅ No server maintenance
- ✅ Free tier (100k requests/day)
- ✅ Global edge network (fast everywhere)

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create OAuth Applications

#### GitHub

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Markdown++ Remote Access
   - **Homepage URL**: https://your-app.com
   - **Authorization callback URL**: https://oauth-github.YOUR-SUBDOMAIN.workers.dev/auth/github/callback
4. Save the **Client ID** and **Client Secret**

#### GitLab

1. Go to https://gitlab.com/-/profile/applications
2. Fill in:
   - **Name**: Markdown++ Remote Access
   - **Redirect URI**: https://oauth-gitlab.YOUR-SUBDOMAIN.workers.dev/auth/gitlab/callback
   - **Scopes**: api, read_user, read_repository, write_repository
3. Save the **Application ID** and **Secret**

### 4. Configure Workers

Create `wrangler.toml` files for each worker:

#### `wrangler-github.toml`

```toml
name = "oauth-github"
main = "workers/oauth-github.ts"
compatibility_date = "2024-01-01"

[vars]
APP_URL = "https://your-app.com"

[[env.production.vars]]
GITHUB_CLIENT_ID = "your_client_id"
GITHUB_CLIENT_SECRET = "your_client_secret"
```

#### `wrangler-gitlab.toml`

```toml
name = "oauth-gitlab"
main = "workers/oauth-gitlab.ts"
compatibility_date = "2024-01-01"

[vars]
APP_URL = "https://your-app.com"

[[env.production.vars]]
GITLAB_CLIENT_ID = "your_application_id"
GITLAB_CLIENT_SECRET = "your_secret"
```

**⚠️ Security Note**: Never commit secrets to git! Use Wrangler secrets:

```bash
wrangler secret put GITHUB_CLIENT_SECRET -c wrangler-github.toml
wrangler secret put GITLAB_CLIENT_SECRET -c wrangler-gitlab.toml
```

### 5. Deploy Workers

```bash
# Deploy GitHub worker
wrangler deploy -c wrangler-github.toml

# Deploy GitLab worker
wrangler deploy -c wrangler-gitlab.toml
```

### 6. Update Frontend

In `RemoteConnectionModal.tsx`, update the OAuth URLs:

```typescript
const handleOAuthLogin = (provider: 'github' | 'gitlab') => {
  const authUrl = provider === 'github' 
    ? 'https://oauth-github.YOUR-SUBDOMAIN.workers.dev/auth/github/login'
    : 'https://oauth-gitlab.YOUR-SUBDOMAIN.workers.dev/auth/gitlab/login';
  
  window.location.href = authUrl;
};
```

## Testing

### Test GitHub OAuth

1. Visit: `https://oauth-github.YOUR-SUBDOMAIN.workers.dev/health`
2. Should return: `{"status":"ok","provider":"github"}`

### Test GitLab OAuth

1. Visit: `https://oauth-gitlab.YOUR-SUBDOMAIN.workers.dev/health`
2. Should return: `{"status":"ok","provider":"gitlab"}`

### Test Full Flow

1. Click "Connect Remote" in the app
2. Select GitHub or GitLab
3. You should be redirected to OAuth login
4. After authorization, you'll be redirected back with a token

## Alternative: Token-Based Access

If you don't want to deploy OAuth workers, users can still use Personal Access Tokens:

### GitHub

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy token and paste in the app

### GitLab

1. Go to https://gitlab.com/-/user_settings/personal_access_tokens
2. Create new token
3. Select `write_repository` scope
4. Copy token and paste in the app

## Troubleshooting

### Worker Not Found

- Check worker is deployed: `wrangler deployments list`
- Verify the URL matches your subdomain

### OAuth Error: redirect_uri_mismatch

- Update callback URL in GitHub/GitLab OAuth app settings
- Must match exactly: `https://YOUR-WORKER.workers.dev/auth/{provider}/callback`

### CORS Error

- Check `APP_URL` environment variable matches your frontend URL
- Include protocol (https://) and no trailing slash

### Token Exchange Failed

- Verify secrets are set: `wrangler secret list`
- Check Client ID/Secret are correct
- Look at worker logs: `wrangler tail`

## Cost

Cloudflare Workers Free Tier:
- ✅ 100,000 requests per day
- ✅ First 10ms CPU time per request
- ✅ No credit card required

For a typical use case (1-2 OAuth logins per user per day), this is more than enough and completely free.

## Security

- ✅ Secrets stored in Cloudflare (not in code)
- ✅ CORS restricts access to your app domain
- ✅ State parameter prevents CSRF attacks
- ✅ HTTPS enforced
- ✅ No user data stored

## Local Development

```bash
# Run GitHub worker locally
wrangler dev -c wrangler-github.toml

# Run GitLab worker locally
wrangler dev -c wrangler-gitlab.toml
```

For local testing, update OAuth callback URLs to `http://localhost:8787/auth/{provider}/callback`.

