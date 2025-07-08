# Grade Guardian AI Assist

## 🚀 Production Deployment (Vercel + Supabase)

### 1. Vercel (Frontend) Environment Variables
- **VITE_SUPABASE_URL**: `https://dgzjrpkdkwhwesotkovn.supabase.co`
- **VITE_SUPABASE_ANON_KEY**: (your Supabase anon public key)

Set these in your Vercel dashboard under Project Settings > Environment Variables. **Do NOT** set any OpenAI API key in Vercel.

### 2. Supabase (Edge Functions) Environment Variables
- **OPENAI_API_KEY**: (your OpenAI API key, set in Supabase dashboard only)
- **SITE_URL**: `https://myhwchecker.com` (for webhooks/redirects)
- **STRIPE_SECRET_KEY**: (if using Stripe webhooks)
- **SUPABASE_SERVICE_ROLE_KEY**: (if needed for backend operations)

Set these in the Supabase dashboard under Edge Functions > Environment Variables.

### 3. Edge Function Deployment
- Deploy your Edge Functions (e.g., `ai-analysis`) to your Supabase project using the Supabase CLI:
  ```sh
  supabase functions deploy ai-analysis --project-ref dgzjrpkdkwhwesotkovn
  ```

### 4. No Localhost in Production
- Your frontend and backend must use production URLs only. No references to `localhost` or `127.0.0.1` should exist in your deployed code or Vercel env vars.

---

# (rest of your README below) 