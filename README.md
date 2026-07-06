# DentistApp Online — AI Smile Preview & Lead Capture

State-of-the-art lead capture landing page for dental practices worldwide. Patients upload a photo,
see an AI-generated smile transformation in ~30 seconds, and their contact details are captured for
follow-up — with optional CRM sync.

> This is the standalone (non-marketplace) edition. The GoHighLevel Marketplace app lives in the
> original repo: [waroxa/dentist-app-netlify](https://github.com/waroxa/dentist-app-netlify).

## Features

- **Premium landing page** — dark glass hero with interactive before/after slider, live stats,
  animated sections, FAQ, and conversion-focused CTAs. Fully responsive.
- **Lead capture first** — patients enter contact details before generating a preview; leads are
  stored in Supabase and optionally synced to a CRM.
- **AI smile preview** — three styles (Subtle / Natural / Hollywood) generated from a single photo.
- **AI smile video** — optional short video of the new smile (Veo).
- **Practice dashboard** — staff login at `/admin` to review leads, patients, and media.
- **SEO ready** — Open Graph, Twitter cards, JSON-LD structured data, canonical URL.

## Stack

- React 18 + TypeScript + Vite 6
- Tailwind CSS v4 (via `@tailwindcss/vite`) + Radix UI + Motion
- Netlify Functions (serverless API) + Supabase (database & storage)

## Local development

```bash
cd smileai-netlify
npm install
npm run dev        # http://localhost:3000
npm run build      # production build to build/
```

## Database setup

The full schema lives in [`smileai-netlify/supabase/schema.sql`](smileai-netlify/supabase/schema.sql) —
one consolidated file you can run against a brand-new Supabase project or any Postgres instance to
create every table (leads, smile jobs, CRM connections, audit log, staff accounts, OAuth state) in
one shot. It also documents the two required storage buckets and every environment variable the
backend needs. The dated files in `smileai-netlify/supabase/migrations/` are the same schema split
into its historical steps — useful if you're migrating an existing database instead of starting fresh.

```bash
# Fresh Supabase project: paste schema.sql into SQL Editor and run it
# Self-hosted Postgres: psql "$DATABASE_URL" -f smileai-netlify/supabase/schema.sql
```

## Deployment (Netlify)

The repo is Netlify-ready — `smileai-netlify/netlify.toml` sets base, build command, publish dir,
functions, and all `/api/*` redirects. Connect the repo in Netlify, run the database setup above,
then set the environment variables (full list at the bottom of `schema.sql`, details in
`smileai-netlify/DEPLOYMENT_GUIDE.md`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — database access
- `SMILEVISION_ADMIN_SESSION_SECRET`, `SMILEVISION_ADMIN_SETUP_SECRET` — staff auth
- `TOKEN_ENCRYPTION_KEY` — encrypts stored OAuth tokens
- `GEMINI_API_KEY` — smile preview generation
- Video provider keys (optional) — see `VIDEO_SETUP_GUIDE.md`

## Customization

Clinic branding (name, logo, colors, hero image, testimonials, contact/social links) is managed
from the admin dashboard and applied across the landing page automatically.
