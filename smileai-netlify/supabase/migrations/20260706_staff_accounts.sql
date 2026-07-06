-- Named staff accounts (multiple per workspace) managed by the workspace admin.
-- The legacy single admin password in admin_credentials keeps working as the "owner" login.
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
