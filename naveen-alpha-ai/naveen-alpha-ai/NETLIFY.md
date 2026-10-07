# Deploy to Netlify

1. Push this folder to GitHub (node_modules/.next/.env are git-ignored).
2. Netlify -> Add new site -> Import from Git -> pick the repo. Build settings are read from netlify.toml.
3. Site settings -> Environment variables: add at least one key, e.g.
   GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, MISTRAL_API_KEY,
   DEEPSEEK_API_KEY, XAI_API_KEY, TOGETHER_API_KEY, OPENROUTER_API_KEY
   and optionally the model maps, e.g. NAVEEN_ALPHA_MODEL=groq:llama-3.3-70b-versatile
4. Deploy. Never put keys in NEXT_PUBLIC_* variables.

CLI alternative: npm i -g netlify-cli && netlify login && netlify init && netlify deploy --build --prod

Notes
- Rate limiting is in-memory per function instance; use Upstash/Redis for strict limits at scale.
- Function timeouts depend on your Netlify plan; long answers can be cut off on very short limits.
- Netlify caps request bodies (~6 MB on functions), so large uploads/images may be rejected there.
