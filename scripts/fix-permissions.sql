-- ================================================================
-- OCM Suite — Permissions & RLS Fix
-- Ausführen im Supabase SQL Editor (als postgres)
--
-- Behebt drei Bugs aus ocm_schema.sql:
--   1. Schema-Zugriff: anon/authenticated haben kein USAGE auf public
--      (PostgreSQL 15+ vergibt das nicht mehr automatisch)
--   2. Infinite Recursion in org_memberships SELECT-Policy
--      (Subquery auf dieselbe Tabelle innerhalb der Policy)
--   3. Broken Policy in stakeholder_task_templates
--      (referenziert s.engagement_id, das in v2.0 nicht mehr existiert)
-- ================================================================

-- ── 1. Schema-Zugriff ───────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Gilt automatisch für alle zukünftigen Tabellen
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines  to anon, authenticated, service_role;

-- ── 2. org_memberships: Recursion-freie RLS-Policies ───────────
-- Bug: Die alte SELECT-Policy queried org_memberships innerhalb
-- der org_memberships-Policy → PostgreSQL erkennt Rekursion.
-- Fix: Nur user_id = auth.uid() — reicht für alle App-Queries.

drop policy if exists "orgmem_select" on org_memberships;
create policy "orgmem_select" on org_memberships
  for select using (user_id = auth.uid());

-- Write-Policies (fehlten komplett)
drop policy if exists "orgmem_insert" on org_memberships;
create policy "orgmem_insert" on org_memberships
  for insert with check (user_id = auth.uid());

drop policy if exists "orgmem_update" on org_memberships;
create policy "orgmem_update" on org_memberships
  for update using (is_org_admin(org_id));

drop policy if exists "orgmem_delete" on org_memberships;
create policy "orgmem_delete" on org_memberships
  for delete using (is_org_admin(org_id));

-- ── 3. organizations: fehlende Insert-Policy ───────────────────
drop policy if exists "org_insert" on organizations;
create policy "org_insert" on organizations
  for insert with check (true);

-- ── 4. stakeholder_task_templates: v2.0 Breaking Change ────────
-- Bug: Policy joind auf s.engagement_id, das in v2.0 weggefallen ist
-- (Stakeholder sind jetzt customer-scoped, nicht engagement-scoped).

drop policy if exists "sh_templates_all" on stakeholder_task_templates;
create policy "sh_templates_all" on stakeholder_task_templates
  for all using (
    exists (
      select 1
      from stakeholders s
      join customers c on c.id = s.customer_id
      where s.id = stakeholder_id
        and is_org_member(c.org_id)
    )
  );

-- ── Fertig ──────────────────────────────────────────────────────
do $$ begin
  raise notice '✅ Permissions und RLS-Policies korrigiert.';
end $$;
