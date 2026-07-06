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

## Deployment (Netlify)

The repo is Netlify-ready — `smileai-netlify/netlify.toml` sets base, build command, publish dir,
functions, and all `/api/*` redirects. Connect the repo in Netlify and set the environment
variables (see `smileai-netlify/DEPLOYMENT_GUIDE.md`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — lead storage
- `GEMINI_API_KEY` — smile preview generation
- Video provider keys (optional) — see `VIDEO_SETUP_GUIDE.md`

## Customization

Clinic branding (name, logo, colors, hero image, testimonials, contact/social links) is managed
from the admin dashboard and applied across the landing page automatically.
