# nosalgo

Simple public directory for educational YouTube videos, playlists, and channels.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Start locally:

```bash
npm run dev
```

Deploy to Vercel with the same environment variables.
