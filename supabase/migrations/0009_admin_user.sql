-- Admin-gating table. A row here grants access to `/admin` and
-- `/api/admin/metrics`. RLS is enabled with NO policies, so the table is only
-- readable through the service_role key (BFF) — never from a client. Adding or
-- removing an admin is a plain INSERT/DELETE, no redeploy.
create table admin_user (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table admin_user enable row level security;

insert into admin_user (email) values ('santiago.penenory@humand.co') on conflict do nothing;
