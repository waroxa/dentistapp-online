-- SmileVisionPro AI — full database schema (consolidated)
--
-- This is the complete, current-state schema — equivalent to running every file
-- in supabase/migrations/ in order, on a brand-new database. Use this when
-- standing up a fresh Supabase project or a self-hosted Postgres instance.
-- (The individual dated files in migrations/ remain the source of truth for
-- history / diffing an existing database — this file is the one-shot version.)
--
-- Usage: paste this whole file into the Supabase SQL editor (or `psql -f schema.sql`)
-- against an empty database, then set the environment variables described at
-- the bottom of this file.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- ── Leads captured from the public landing page ──────────────────────────
create table if not exists leads (
  id uuid primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  interested_in text,
  notes text,
  source text,
  created_at timestamptz not null default now()
);

-- ── AI smile preview / video generation jobs ──────────────────────────────
create table if not exists smile_jobs (
  id uuid primary key,
  lead_id uuid references leads(id) on delete set null,
  type text not null,
  status text not null,
  provider text,
  model text,
  provider_job_id text,
  input_image_data_url text,
  output_image_data_url text,
  output_asset_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── GoHighLevel (or other CRM) OAuth connections, one row per location ───
create table if not exists integration_connections (
  provider text not null,
  location_id text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scope text,
  expires_at timestamptz,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (provider, location_id)
);

-- ── Append-only audit trail for admin/auth/lead events ───────────────────
create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Legacy single owner password per workspace (kept for backwards compat) ─
create table if not exists admin_credentials (
  workspace_key text primary key default 'default',
  password_hash text not null,
  activated_at timestamptz not null default now(),
  password_updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- ── Single-use OAuth CSRF state store ──────────────────────────────────────
create table if not exists oauth_states (
  state text primary key,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_expires_at_idx on oauth_states (expires_at);

alter table oauth_states enable row level security;
drop policy if exists "service_role_only_oauth_states" on oauth_states;
create policy "service_role_only_oauth_states" on oauth_states
  using (auth.role() = 'service_role');

-- ── Named staff accounts (multiple per workspace, admin + staff roles) ────
create table if not exists staff_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null default 'default',
  email text not null,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  password_hash text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (workspace_key, email)
);

create index if not exists staff_accounts_workspace_idx on staff_accounts (workspace_key);

alter table staff_accounts enable row level security;

-- ── End of schema ──────────────────────────────────────────────────────────
--
-- Required Supabase Storage buckets (create in Dashboard → Storage, or via API):
--   - make-c5a5d193-smile-images   (public)  — uploaded photos + AI preview images
--   - ai Videos                    (public)  — generated smile videos
-- Bucket names can be overridden with SUPABASE_IMAGE_BUCKET / SUPABASE_VIDEO_BUCKET.
--
-- Required environment variables (Netlify site settings, or .env for self-hosting):
--   SUPABASE_URL                       — project URL
--   SUPABASE_SERVICE_KEY               — service role key (server-side only, never expose to the client)
--   SMILEVISION_ADMIN_SESSION_SECRET    — random 32+ byte secret, signs admin session cookies
--   SMILEVISION_ADMIN_SETUP_SECRET      — private activation code for first-time setup / password reset
--   TOKEN_ENCRYPTION_KEY                — 32-byte key (hex or base64) for encrypting OAuth tokens
--   GEMINI_API_KEY                      — smile preview image generation
--   (optional) SMILEVISION_ADMIN_PASSWORD — legacy plaintext owner password fallback for the "default" workspace
--   (optional) SUPABASE_IMAGE_BUCKET, SUPABASE_VIDEO_BUCKET — override default bucket names
--   (optional) video provider keys — see VIDEO_SETUP_GUIDE.md
