# Setup Instructions

## Prerequisites

Before starting, you need to set up the following services:

## 1. Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Enter project details:
   - Name: `ai-test-agent`
   - Database Password: (generate a strong password and save it)
   - Region: Choose closest to you
4. Wait for project to finish provisioning (~2 minutes)

### Database Migration

1. In your Supabase dashboard, click on "SQL Editor" in the left sidebar
2. Click "New Query"
3. Run migrations in order:
   - **M1**: Copy contents of `supabase_migrations_m1.sql` → Run
   - **M2**: Copy contents of `supabase_migrations_m2.sql` → Run
   - **M3**: Copy contents of `supabase_migrations_m3.sql` → Run
   - **M2 (Git Local)**: Copy contents of `supabase_migrations_m2_git_local.sql` → Run
   - **M3.5 (AI Review)**: Copy contents of `supabase_migrations_m3.5_ai_review.sql` → Run
4. Verify tables are created by going to "Table Editor"

You should see the following tables:
- `users`
- `projects`
- `issues`
- `test_runs`
- `fix_history`
- `ai_review_settings`
- `pr_reviews`

### Get Supabase Keys

1. Click "Project Settings" (gear icon in left sidebar)
2. Click "API" section
3. Copy the following values:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional for now)
   - **service_role** key → This is your `SUPABASE_SERVICE_KEY` ⚠️ NEVER expose this publicly!

## 2. GitHub OAuth App Setup

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: `AI Test Agent (Dev)`
   - **Homepage URL**: `http://localhost:3050`
   - **Authorization callback URL**: `http://localhost:3050/api/auth/callback/github`
4. Click "Register application"
5. On the next page:
   - Copy the **Client ID** → This is your `GITHUB_CLIENT_ID`
   - Click "Generate a new client secret"
   - Copy the **Client Secret** → This is your `GITHUB_CLIENT_SECRET`

### GitHub Personal Access Token

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `AI Test Agent API`
4. Set expiration (e.g., 90 days)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:user` (Read user profile data)
6. Click "Generate token"
7. Copy the token → This is your `GITHUB_PERSONAL_ACCESS_TOKEN`
   ⚠️ Save it now - you won't be able to see it again!

## 3. Anthropic Claude API

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to "API Keys" section
4. Click "Create Key"
5. Give it a name: `AI Test Agent`
6. Copy the API key → This is your `ANTHROPIC_API_KEY`

## 4. NextAuth Secret

Generate a random secret for NextAuth:

```bash
openssl rand -base64 32
```

Copy the output → This is your `NEXTAUTH_SECRET`

## 5. Create .env.local file

In the root of your project (`ai-test-agent/`), create a file named `.env.local`:

```env
# GitHub OAuth App
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret
GITHUB_PERSONAL_ACCESS_TOKEN=your_pat_for_api_calls

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# NextAuth
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3050

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# GitHub Webhook (for AI Code Review - Milestone 3.5)
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

Replace all the `your_*` placeholders with the actual values you copied above.

## 6. GitHub Webhook Setup (for AI Code Review)

**⚠️ Important:** This is required for AI Code Review & Auto-Merge to work.

1. Generate a webhook secret:
   ```bash
   openssl rand -hex 32
   ```
   Copy the output → This is your `GITHUB_WEBHOOK_SECRET`

2. Go to your GitHub repository → Settings → Webhooks
3. Click "Add webhook"
4. Fill in:
   - **Payload URL**: `https://your-deployed-app.vercel.app/api/webhooks/github`
     - For local testing: `http://localhost:3050/api/webhooks/github`
     - ⚠️ Note: Local webhooks won't work unless you use ngrok or similar tunneling tool
   - **Content type**: `application/json`
   - **Secret**: Paste the secret you generated above
   - **Which events**: Select "Pull requests"
   - **Active**: ✅ Check this box
5. Click "Add webhook"

### Testing Webhook

1. Make a test PR in your repo
2. Go to Settings → Webhooks → Your webhook → Recent Deliveries
3. You should see a successful delivery (green checkmark)

## 7. Run the Application

```bash
npm run dev
```

Open [http://localhost:3050](http://localhost:3050) in your browser.

## Troubleshooting

### Supabase Connection Issues

- Make sure you're using the `service_role` key, not the `anon` key
- Verify the URL has `https://` and doesn't have trailing slashes

### GitHub OAuth Issues

- Callback URL must be exactly: `http://localhost:3050/api/auth/callback/github`
- Make sure you copied both Client ID and Client Secret

### NextAuth Issues

- If you see "No secret provided", make sure `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again

---

**Ready to go!** 🚀
