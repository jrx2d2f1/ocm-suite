-- ================================================================
-- OCM SaaS — Supabase PostgreSQL Schema
-- Version : 2.0  |  2026-04-09
-- Author  : Jürgen Rohr / Claude
-- Changes v2.0 : Stakeholder customer-scoped; goal_type 'initiative'→'program';
--                new bridges goal_stakeholders + initiative_stakeholders;
--                strategy_goals + owner_user_id + review_period;
--                tasks + goal_id
-- ================================================================
-- Conventions
--   • UUIDs via gen_random_uuid()
--   • created_at / updated_at on every mutable table (trigger)
--   • Soft-delete via deleted_at  (NULL = active)
--   • RLS on every table; access always via org_id chain
--   • Multi-Tenancy root: organizations → org_memberships
--   • Enums for all controlled vocabularies
-- ================================================================

-- ================================================================
-- IDEMPOTENCY NOTE
--   This schema uses IF NOT EXISTS guards and DROP IF EXISTS
--   before triggers/policies so it can be safely re-run on an
--   existing database without errors.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ────────────────────────────────────────────────────────────────
-- SHARED TRIGGER: set updated_at on every UPDATE
-- ────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────────
do $$ begin
  create type org_member_role  as enum ('owner', 'admin', 'member', 'viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type engagement_status as enum ('active', 'draft', 'hold', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type milestone_status  as enum ('planned', 'progress', 'done', 'delayed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type task_status       as enum ('Backlog', 'In Progress', 'Review', 'Done');
exception when duplicate_object then null; end $$;
do $$ begin
  create type task_category     as enum (
    'Kommunikation', 'Enablement', 'Sounding',
    'Sponsoring', 'Reporting', 'Erwartung'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type stakeholder_type  as enum ('person', 'group');
exception when duplicate_object then null; end $$;
do $$ begin
  create type interest_value    as enum ('--', '-', '0', '+', '++');
exception when duplicate_object then null; end $$;
do $$ begin
  create type relationship_type as enum (
    'Sponsor', 'Champion', 'Berichtslinie', 'Peer', 'Influencer', 'Blocker'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type kpi_ampel         as enum ('green', 'yellow', 'red', 'gray');
exception when duplicate_object then null; end $$;
do $$ begin
  create type goal_stakeholder_role as enum (
    'Sponsor', 'Champion', 'Betroffener', 'Treiber', 'Blocker', 'Informiert'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type goal_type         as enum (
    'strategic', 'functional', 'operational', 'program'
    -- 'program' = übergeordnete Initiative (Programm-Ebene, optional mit Engagement verknüpft)
    -- Hinweis: operative Initiativen heißen im UI 'Initiative', in DB 'engagement'
  );
exception when duplicate_object then null; end $$;



-- ================================================================
-- 1. ORGANIZATIONS  (tenant root)
-- ================================================================
create table if not exists organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,          -- URL-safe identifier
  logo_url        text,
  plan            text not null default 'free',  -- 'free' | 'professional' | 'team' | 'enterprise'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_organizations_updated_at on organizations;
create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

alter table organizations enable row level security;
-- NOTE: RLS policies for organizations reference org_memberships,
-- which is created later. Policies are defined after org_memberships below.


-- ================================================================
-- 2. USERS  (mirrors auth.users; extended profile)
-- ================================================================
create table if not exists users (
  id              uuid primary key,  -- matches auth.users.id; FK enforced at app layer
  email           text not null,
  full_name       text not null,
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

alter table users enable row level security;

drop policy if exists "users_select_self" on users;
create policy "users_select_self" on users
  for select using (auth.uid() = id);

drop policy if exists "users_update_self" on users;
create policy "users_update_self" on users
  for update using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Auto-create user profile trigger (only installed when auth.users exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function handle_new_auth_user();
  end if;
end;
$$;


-- ================================================================
-- 3. ORG_MEMBERSHIPS  (user ↔ org, with role)
-- ================================================================
create table if not exists org_memberships (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            org_member_role not null default 'member',
  invited_by      uuid references users(id),
  invited_at      timestamptz,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (org_id, user_id)
);

drop trigger if exists trg_org_memberships_updated_at on org_memberships;
create trigger trg_org_memberships_updated_at
  before update on org_memberships
  for each row execute function set_updated_at();

create index if not exists idx_orgmem_user on org_memberships(user_id);
create index if not exists idx_orgmem_org  on org_memberships(org_id);

alter table org_memberships enable row level security;

-- Members see their own membership; admins see all in their org
drop policy if exists "orgmem_select" on org_memberships;
create policy "orgmem_select" on org_memberships
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from org_memberships om
      where om.org_id = org_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
        and om.deleted_at is null
    )
  );

-- Helper: check if current user is a member of a given org
create or replace function is_org_member(p_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_memberships
    where org_id = p_org_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$;

-- Helper: check if current user is admin/owner of a given org
create or replace function is_org_admin(p_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_memberships
    where org_id = p_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and deleted_at is null
  );
$$;

-- Organizations: RLS policies (deferred here because they reference org_memberships)
drop policy if exists "org_select_members" on organizations;
create policy "org_select_members" on organizations
  for select using (
    exists (
      select 1 from org_memberships om
      where om.org_id = id
        and om.user_id = auth.uid()
        and om.deleted_at is null
    )
  );

drop policy if exists "org_update_admins" on organizations;
create policy "org_update_admins" on organizations
  for update using (is_org_admin(id));


-- ================================================================
-- 4. CUSTOMERS  (self-referential hierarchy, org-scoped)
-- ================================================================
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  dynamics_acct   text,                -- Dynamics CRM account number (read-only sync)
  parent_id       uuid references customers(id) on delete set null,
  acct_type       text,                -- 'Gruppe', 'GmbH', 'AG', 'KGaA', etc.
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_customers_updated_at on customers;
create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create index if not exists idx_customers_org    on customers(org_id);
create index if not exists idx_customers_parent on customers(parent_id);

alter table customers enable row level security;

drop policy if exists "customers_all" on customers;
create policy "customers_all" on customers
  for all using (is_org_member(org_id));


-- ================================================================
-- 5. ENGAGEMENTS
-- ================================================================
create table if not exists engagements (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id),
  owner_user_id   uuid references users(id),
  name            text not null,
  dynamics_eng    text,                -- Dynamics CRM engagement/opportunity number
  eng_alias       text,                -- Short display name for UI chips
  status          engagement_status not null default 'draft',
  start_date      text,                -- 'YYYY-MM' (month precision sufficient)
  end_date        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_engagements_updated_at on engagements;
create trigger trg_engagements_updated_at
  before update on engagements
  for each row execute function set_updated_at();

create index if not exists idx_engagements_org      on engagements(org_id);
create index if not exists idx_engagements_customer on engagements(customer_id);

alter table engagements enable row level security;

drop policy if exists "engagements_all" on engagements;
create policy "engagements_all" on engagements
  for all using (is_org_member(org_id));


-- ================================================================
-- 6. MILESTONES
-- ================================================================
create table if not exists milestones (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  name            text not null,
  due             date,
  status          milestone_status not null default 'planned',
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_milestones_updated_at on milestones;
create trigger trg_milestones_updated_at
  before update on milestones
  for each row execute function set_updated_at();

create index if not exists idx_milestones_engagement on milestones(engagement_id);

alter table milestones enable row level security;

drop policy if exists "milestones_all" on milestones;
create policy "milestones_all" on milestones
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 7. TASKS
-- ================================================================
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  milestone_id    uuid references milestones(id) on delete set null,
  title           text not null,
  status          task_status not null default 'Backlog',
  category        task_category not null default 'Kommunikation',
  due             date,
  owner_user_id   uuid references users(id),
  beschreibung    text,
  ziel            text,
  mitarbeitende   text[],              -- Free-text names; migrate to user refs in v2
  -- Optionaler direkter Bezug zu einem Ziel (Maßnahme dient diesem Ziel)
  -- Ermöglicht Traceability: Maßnahme → Ziel ohne Umweg über KR-Bridge
  goal_id         uuid references strategy_goals(id) on delete set null,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create index if not exists idx_tasks_engagement on tasks(engagement_id);
create index if not exists idx_tasks_milestone  on tasks(milestone_id);
create index if not exists idx_tasks_status     on tasks(status);
create index if not exists idx_tasks_due        on tasks(due);
create index if not exists idx_tasks_goal       on tasks(goal_id);

alter table tasks enable row level security;

drop policy if exists "tasks_all" on tasks;
create policy "tasks_all" on tasks
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 8. STAKEHOLDERS  (core identity — customer-scoped)
--
-- v2.0: Stakeholder-Identität ist jetzt KUNDEN-bezogen, nicht mehr
-- Initiative-bezogen. Thomas Müller wird einmal angelegt und kann
-- dann in beliebig vielen Zielen und Initiativen referenziert werden.
--
-- Verknüpfungen:
--   goal_stakeholders       (m:n: Stakeholder ↔ Ziel, mit Rolle)
--   initiative_stakeholders (m:n: Stakeholder ↔ Initiative/Engagement)
--   stakeholder_profiles    (Verhaltens-Profil pro Stakeholder × Initiative)
-- ================================================================
create table if not exists stakeholders (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  name            text not null,
  type            stakeholder_type not null default 'person',
  role            text,                -- Job title / function
  department      text,                -- Organisationseinheit / Bereich
  initials        text,                -- 2-char display initials
  email           text,                -- optional, für Kommunikations-Tracking
  group_size      int,                 -- Only for type = 'group'
  speaker         text,                -- Group spokesperson name
  color           text,                -- UI accent hex color
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_stakeholders_updated_at on stakeholders;
create trigger trg_stakeholders_updated_at
  before update on stakeholders
  for each row execute function set_updated_at();

create index if not exists idx_stakeholders_customer on stakeholders(customer_id);

alter table stakeholders enable row level security;

drop policy if exists "stakeholders_all" on stakeholders;
create policy "stakeholders_all" on stakeholders
  for all using (
    exists (
      select 1 from customers c
      where c.id = customer_id and is_org_member(c.org_id)
    )
  );


-- ================================================================
-- 9. STAKEHOLDER_PROFILES
--    Behavioral assessment per stakeholder per engagement.
--    Decoupled so the same person can have different profiles
--    across multiple engagements (e.g. different client projects).
-- ================================================================
create table if not exists stakeholder_profiles (
  id              uuid primary key default gen_random_uuid(),
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  engagement_id   uuid not null references engagements(id) on delete cascade,

  -- Power / Interest matrix values
  power           smallint not null default 3
                    check (power between 0 and 5),
  interest        interest_value not null default '0',
  classification  text,                -- Derived: 'Gegner' .. 'Unterstützer'
  risk_flag       boolean not null default false,

  -- Relationship to consultant
  rel_to_consultant text,              -- 'Sponsor', 'Champion', 'Influencer', etc.

  -- Qualitative assessment
  haltung         text,                -- Current attitude (free text)
  beschreibung    text,                -- Role description in this initiative
  gewinnt         text,                -- What they gain
  verliert        text,                -- What they risk losing
  bedenken        text,                -- Concerns / objections
  strategy        text,                -- Engagement strategy for this stakeholder

  unique (stakeholder_id, engagement_id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_sh_profiles_updated_at on stakeholder_profiles;
create trigger trg_sh_profiles_updated_at
  before update on stakeholder_profiles
  for each row execute function set_updated_at();

create index if not exists idx_sh_profiles_stakeholder on stakeholder_profiles(stakeholder_id);
create index if not exists idx_sh_profiles_engagement  on stakeholder_profiles(engagement_id);

alter table stakeholder_profiles enable row level security;

drop policy if exists "sh_profiles_all" on stakeholder_profiles;
create policy "sh_profiles_all" on stakeholder_profiles
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );

-- ================================================================
-- 9b. GOAL_STAKEHOLDERS  (m:n: strategy_goals ↔ stakeholders)
--
-- Identifiziert Stakeholder auf Ziel-Ebene (im Strategie-Workshop).
-- "Wer ist an diesem Ziel interessiert / betroffen / gefährdet es?"
-- Separate von stakeholder_profiles: hier geht es um Identifikation,
-- nicht um das Verhaltens-Profil in einer konkreten Initiative.
-- ================================================================
create table if not exists goal_stakeholders (
  goal_id         uuid not null references strategy_goals(id) on delete cascade,
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  role            goal_stakeholder_role not null default 'Betroffener',
  notes           text,                -- Warum ist diese Person relevant für dieses Ziel?
  primary key (goal_id, stakeholder_id)
);

alter table goal_stakeholders enable row level security;

drop policy if exists "goal_sh_all" on goal_stakeholders;
create policy "goal_sh_all" on goal_stakeholders
  for all using (
    exists (
      select 1 from strategy_goals sg
      where sg.id = goal_id and is_org_member(sg.org_id)
    )
  );


-- ================================================================
-- 9c. INITIATIVE_STAKEHOLDERS  (m:n: engagements ↔ stakeholders)
--
-- Verknüpft Stakeholder mit einer konkreten Initiative.
-- Typischer Workflow: Stakeholder werden im Strategie-Workshop auf
-- Ziel-Ebene identifiziert (goal_stakeholders) und dann beim Start
-- einer Initiative auf diese übertragen / präzisiert.
--
-- pos_x / pos_y: Position auf der Power/Interest-Matrix dieser Initiative
-- (initiative-spezifisch, nicht auf dem Stakeholder selbst)
-- ================================================================
create table if not exists initiative_stakeholders (
  engagement_id   uuid not null references engagements(id) on delete cascade,
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  pos_x           float,               -- % position auf Power/Interest canvas (diese Initiative)
  pos_y           float,
  primary key (engagement_id, stakeholder_id)
);

create index if not exists idx_init_sh_engagement on initiative_stakeholders(engagement_id);
create index if not exists idx_init_sh_stakeholder on initiative_stakeholders(stakeholder_id);

alter table initiative_stakeholders enable row level security;

drop policy if exists "init_sh_all" on initiative_stakeholders;
create policy "init_sh_all" on initiative_stakeholders
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 10. STAKEHOLDER_TASK_TEMPLATES
--     Suggested tasks auto-proposed when a stakeholder is
--     assigned a specific engagement strategy.
-- ================================================================
create table if not exists stakeholder_task_templates (
  id              uuid primary key default gen_random_uuid(),
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  title           text not null,
  category        task_category not null,
  sort_order      smallint not null default 0
);

alter table stakeholder_task_templates enable row level security;

drop policy if exists "sh_templates_all" on stakeholder_task_templates;
create policy "sh_templates_all" on stakeholder_task_templates
  for all using (
    exists (
      select 1 from stakeholders s
      join engagements e on e.id = s.engagement_id
      where s.id = stakeholder_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 11. TASK_STAKEHOLDERS  (m:n: tasks ↔ stakeholders)
-- ================================================================
create table if not exists task_stakeholders (
  task_id         uuid not null references tasks(id) on delete cascade,
  stakeholder_id  uuid not null references stakeholders(id) on delete cascade,
  role_in_task    text,                -- 'Consulted', 'Informed', 'Owner', etc.
  primary key (task_id, stakeholder_id)
);

alter table task_stakeholders enable row level security;

drop policy if exists "task_sh_all" on task_stakeholders;
create policy "task_sh_all" on task_stakeholders
  for all using (
    exists (
      select 1 from tasks t
      join engagements e on e.id = t.engagement_id
      where t.id = task_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 12. STAKEHOLDER_RELATIONSHIPS
-- ================================================================
create table if not exists stakeholder_relationships (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references engagements(id) on delete cascade,
  from_id         uuid not null references stakeholders(id) on delete cascade,
  to_id           uuid not null references stakeholders(id) on delete cascade,
  type            relationship_type not null,
  strength        smallint not null default 3
                    check (strength between 1 and 5),
  bidirectional   boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint no_self_rel check (from_id <> to_id)
);

drop trigger if exists trg_sh_rel_updated_at on stakeholder_relationships;
create trigger trg_sh_rel_updated_at
  before update on stakeholder_relationships
  for each row execute function set_updated_at();

create index if not exists idx_sh_rel_engagement on stakeholder_relationships(engagement_id);
create index if not exists idx_sh_rel_from       on stakeholder_relationships(from_id);
create index if not exists idx_sh_rel_to         on stakeholder_relationships(to_id);

alter table stakeholder_relationships enable row level security;

drop policy if exists "sh_rel_all" on stakeholder_relationships;
create policy "sh_rel_all" on stakeholder_relationships
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 13. CANVAS_DATA  (1:1 with engagement — Initiative Canvas header)
-- ================================================================
create table if not exists canvas_data (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null unique references engagements(id) on delete cascade,

  -- Warum-Block
  ausgangslage    text,
  strategischer_kontext text,
  treiber         text,
  risiken_bei_nicht_handeln text,

  -- Ziele (arrays per dimension)
  ziele_org       text[] not null default '{}',
  ziele_funktional text[] not null default '{}',
  ziele_people    text[] not null default '{}',
  ziele_tech      text[] not null default '{}',

  -- Zeithorizont (dates only; phases in canvas_phases)
  start_date      text,               -- 'YYYY-MM'
  end_date        text,

  -- Erfolg
  erfolg_narrativ text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_canvas_data_updated_at on canvas_data;
create trigger trg_canvas_data_updated_at
  before update on canvas_data
  for each row execute function set_updated_at();

alter table canvas_data enable row level security;

drop policy if exists "canvas_all" on canvas_data;
create policy "canvas_all" on canvas_data
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 14. CANVAS_PHASES  (normalized Zeithorizont phases)
-- ================================================================
create table if not exists canvas_phases (
  id              uuid primary key default gen_random_uuid(),
  canvas_id       uuid not null references canvas_data(id) on delete cascade,
  title           text not null,
  start_date      text,               -- 'YYYY-MM'
  end_date        text,
  dates_label     text,               -- Display: 'Apr – Jun 2025'
  color           text,
  description     text,
  goal            text,               -- Milestone / exit criterion for this phase
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_canvas_phases_updated_at on canvas_phases;
create trigger trg_canvas_phases_updated_at
  before update on canvas_phases
  for each row execute function set_updated_at();

create index if not exists idx_canvas_phases_canvas on canvas_phases(canvas_id);

alter table canvas_phases enable row level security;

drop policy if exists "canvas_phases_all" on canvas_phases;
create policy "canvas_phases_all" on canvas_phases
  for all using (
    exists (
      select 1 from canvas_data cd
      join engagements e on e.id = cd.engagement_id
      where cd.id = canvas_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 15. CANVAS_KPIS  (KPIs measured at engagement / initiative level)
--
-- These are the *measurement instruments* for an engagement.
-- They MAY reference a key_result (kr_id), linking the measurement
-- upward to a strategic goal.  Without kr_id they are
-- engagement-internal metrics only.
-- ================================================================
create table if not exists canvas_kpis (
  id              uuid primary key default gen_random_uuid(),
  canvas_id       uuid not null references canvas_data(id) on delete cascade,
  kr_id           uuid,               -- FK to key_results; set after table created below
  name            text not null,
  sub             text,               -- Sub-label / description
  baseline        text,
  target_value    text,
  current_value   text,
  -- methode: free text + app-layer enum
  -- Values: 'Analytics-Dashboard','Puls-Survey','Meilenstein-Tracking',
  --         'Finance-Controlling','LMS-Tracking','Qual. Assessment / QBR',
  --         'NPS-Survey','Beobachtung','Interview','Sonstiges'
  methode         text,
  ampel           kpi_ampel not null default 'gray',
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_canvas_kpis_updated_at on canvas_kpis;
create trigger trg_canvas_kpis_updated_at
  before update on canvas_kpis
  for each row execute function set_updated_at();

create index if not exists idx_canvas_kpis_canvas on canvas_kpis(canvas_id);
create index if not exists idx_canvas_kpis_kr     on canvas_kpis(kr_id);

alter table canvas_kpis enable row level security;

drop policy if exists "canvas_kpis_all" on canvas_kpis;
create policy "canvas_kpis_all" on canvas_kpis
  for all using (
    exists (
      select 1 from canvas_data cd
      join engagements e on e.id = cd.engagement_id
      where cd.id = canvas_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 16. STRATEGY_GOALS  (customer-scoped; type = level in hierarchy)
--
-- Typen:
--   strategic   = Wohin wollen wir? (Unternehmens-Ebene)
--   functional  = Was muss in einem Bereich funktionieren?
--   operational = Was messen wir konkret bis wann?
--   program     = Übergeordnetes Programm, optional mit Initiative/Engagement verknüpft
--                 (ersetzt den alten Typ 'initiative' um Namens-Konfusion zu vermeiden)
--
-- Stakeholder werden auf Ziel-Ebene über goal_stakeholders identifiziert.
-- ================================================================
create table if not exists strategy_goals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  type            goal_type not null,
  title           text not null,
  description     text,
  owner           text,               -- Free text (Rolle oder Personenname)
  owner_user_id   uuid references users(id) on delete set null,  -- optionaler User-FK
  color           text,               -- UI accent hex
  review_period   text,               -- OKR-Zyklus, z.B. 'Q1 2025' oder 'H1 2025'
  -- Für type = 'program': optionaler Link zur konkreten Initiative (Engagement)
  engagement_id   uuid references engagements(id) on delete set null,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_strategy_goals_updated_at on strategy_goals;
create trigger trg_strategy_goals_updated_at
  before update on strategy_goals
  for each row execute function set_updated_at();

create index if not exists idx_sg_org      on strategy_goals(org_id);
create index if not exists idx_sg_customer on strategy_goals(customer_id);
create index if not exists idx_sg_type     on strategy_goals(type);

alter table strategy_goals enable row level security;

drop policy if exists "sg_all" on strategy_goals;
create policy "sg_all" on strategy_goals
  for all using (is_org_member(org_id));


-- ================================================================
-- 17. STRATEGY_GOAL_PARENTS  (m:n self-join for hierarchy)
--     Allows: one functional goal → multiple strategic goals,
--             one initiative    → multiple operational goals, etc.
-- ================================================================
create table if not exists strategy_goal_parents (
  child_id        uuid not null references strategy_goals(id) on delete cascade,
  parent_id       uuid not null references strategy_goals(id) on delete cascade,
  primary key (child_id, parent_id),
  constraint no_self_parent check (child_id <> parent_id)
);

alter table strategy_goal_parents enable row level security;

drop policy if exists "sgp_all" on strategy_goal_parents;
create policy "sgp_all" on strategy_goal_parents
  for all using (
    exists (
      select 1 from strategy_goals sg
      where sg.id = child_id and is_org_member(sg.org_id)
    )
  );


-- ================================================================
-- 18. KEY_RESULTS  (target states on strategy goals)
--
-- Answers "what does success look like?" for a goal.
-- current_value is updated as progress is tracked.
-- ================================================================
create table if not exists key_results (
  id              uuid primary key default gen_random_uuid(),
  goal_id         uuid not null references strategy_goals(id) on delete cascade,
  text            text not null,       -- e.g. 'AI Adoption Rate ≥ 70 %'
  current_value   text not null default '—',
  target_value    text not null,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_key_results_updated_at on key_results;
create trigger trg_key_results_updated_at
  before update on key_results
  for each row execute function set_updated_at();

create index if not exists idx_kr_goal on key_results(goal_id);

alter table key_results enable row level security;

drop policy if exists "kr_all" on key_results;
create policy "kr_all" on key_results
  for all using (
    exists (
      select 1 from strategy_goals sg
      where sg.id = goal_id and is_org_member(sg.org_id)
    )
  );

-- Now that key_results exists, add the FK on canvas_kpis
alter table canvas_kpis
  add constraint fk_canvas_kpis_kr
  foreign key (kr_id) references key_results(id) on delete set null;


-- ================================================================
-- 19. ENGAGEMENT_KEY_RESULTS  (bridge: engagement contributes to KR)
--     One engagement can contribute to multiple KRs;
--     one KR can be fed by multiple engagements.
-- ================================================================
create table if not exists engagement_key_results (
  engagement_id       uuid not null references engagements(id) on delete cascade,
  key_result_id       uuid not null references key_results(id) on delete cascade,
  contribution_note   text,            -- How this engagement contributes
  primary key (engagement_id, key_result_id)
);

alter table engagement_key_results enable row level security;

drop policy if exists "eng_kr_all" on engagement_key_results;
create policy "eng_kr_all" on engagement_key_results
  for all using (
    exists (
      select 1 from engagements e
      where e.id = engagement_id and is_org_member(e.org_id)
    )
  );


-- ================================================================
-- 20. AUDIT_LOG  (simple: who changed what, when)
--     Assumption: full versioning NOT required; append-only log.
--     Populated by application layer (or pg triggers for critical tables).
-- ================================================================
create table if not exists audit_log (
  id              bigserial primary key,
  org_id          uuid not null references organizations(id) on delete cascade,
  user_id         uuid references users(id) on delete set null,
  table_name      text not null,
  record_id       uuid not null,
  action          text not null        check (action in ('INSERT','UPDATE','DELETE')),
  changed_fields  jsonb,               -- {field: {old, new}} for UPDATE
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_org       on audit_log(org_id);
create index if not exists idx_audit_record    on audit_log(table_name, record_id);
create index if not exists idx_audit_created   on audit_log(created_at desc);

alter table audit_log enable row level security;

-- Only admins can read the audit log
drop policy if exists "audit_select_admins" on audit_log;
create policy "audit_select_admins" on audit_log
  for select using (is_org_admin(org_id));

-- Application inserts via service role (bypasses RLS)
-- No insert policy needed here — app writes with service key


-- ================================================================
-- VIEWS  (convenience queries)
-- ================================================================

-- Stakeholder mit Profil pro Initiative
-- v2.0: Stakeholder sind customer-scoped. Die View zeigt alle Stakeholder eines
-- Kunden zusammen mit ihrem Profil für jede Initiative, in der sie aktiv sind.
-- Ein Stakeholder ohne Initiative-Zuordnung erscheint einmal mit NULL-Profil-Feldern.
create or replace view v_stakeholders_with_profile as
select
  s.id,
  s.customer_id,
  s.name,
  s.type,
  s.role,
  s.department,
  s.email,
  s.initials,
  s.group_size,
  s.speaker,
  s.color,
  s.sort_order,
  -- Initiative-Kontext (NULL wenn nicht in Initiative)
  ist.engagement_id,
  ist.pos_x,
  ist.pos_y,
  -- Profil-Felder (NULL wenn kein Profil für diese Initiative)
  sp.power,
  sp.interest,
  sp.classification,
  sp.risk_flag,
  sp.rel_to_consultant,
  sp.haltung,
  sp.beschreibung,
  sp.gewinnt,
  sp.verliert,
  sp.bedenken,
  sp.strategy
from stakeholders s
left join initiative_stakeholders ist on ist.stakeholder_id = s.id
left join stakeholder_profiles sp
  on sp.stakeholder_id = s.id
  and sp.engagement_id = ist.engagement_id
where s.deleted_at is null;


-- Engagement overview with customer and milestone counts
create or replace view v_engagement_overview as
select
  e.id,
  e.org_id,
  e.name,
  e.eng_alias,
  e.dynamics_eng,
  e.status,
  e.start_date,
  e.end_date,
  c.id         as customer_id,
  c.name       as customer_name,
  c.dynamics_acct,
  p.name       as parent_customer_name,
  count(distinct m.id)  filter (where m.id is not null)  as milestone_count,
  count(distinct t.id)  filter (where t.id is not null and t.deleted_at is null)  as task_count,
  count(distinct sh.id) filter (where sh.id is not null and sh.deleted_at is null) as stakeholder_count
from engagements e
join customers c   on c.id = e.customer_id
left join customers p on p.id = c.parent_id
left join milestones m on m.engagement_id = e.id
left join tasks t      on t.engagement_id = e.id
left join initiative_stakeholders ist_ov on ist_ov.engagement_id = e.id
left join stakeholders sh on sh.id = ist_ov.stakeholder_id
where e.deleted_at is null
  and c.deleted_at is null
group by e.id, c.id, c.name, c.dynamics_acct, p.name;


-- Strategy goal with KR progress summary
create or replace view v_goal_kr_progress as
select
  sg.id,
  sg.org_id,
  sg.customer_id,
  sg.type,
  sg.title,
  sg.owner,
  sg.engagement_id,
  count(kr.id) as kr_count,
  jsonb_agg(
    jsonb_build_object(
      'id',            kr.id,
      'text',          kr.text,
      'current_value', kr.current_value,
      'target_value',  kr.target_value
    ) order by kr.sort_order
  ) filter (where kr.id is not null) as key_results
from strategy_goals sg
left join key_results kr on kr.goal_id = sg.id
where sg.deleted_at is null
group by sg.id;



-- Stakeholder mit Ziel-Rollen (aus Strategie-Workshops)
create or replace view v_stakeholders_with_goals as
select
  s.id,
  s.customer_id,
  s.name,
  s.type,
  s.role,
  s.department,
  s.initials,
  s.color,
  sg.id           as goal_id,
  sg.type         as goal_type,
  sg.title        as goal_title,
  gs.role         as role_in_goal,
  gs.notes        as goal_notes
from stakeholders s
join goal_stakeholders gs on gs.stakeholder_id = s.id
join strategy_goals sg    on sg.id = gs.goal_id
where s.deleted_at is null
  and sg.deleted_at is null;
-- ================================================================
-- SEED: Lookup values reference (comment only — no table needed)
-- ================================================================
-- task_category values:
--   'Kommunikation' | 'Enablement' | 'Sounding' | 'Sponsoring' |
--   'Reporting'     | 'Erwartung'
--
-- kpi_methode values (app-layer enum, stored as text):
--   'Analytics-Dashboard' | 'Puls-Survey' | 'Meilenstein-Tracking' |
--   'Finance-Controlling' | 'LMS-Tracking' | 'Qual. Assessment / QBR' |
--   'NPS-Survey' | 'Beobachtung' | 'Interview' | 'Sonstiges'
--
-- interest_value: '--' | '-' | '0' | '+' | '++'
-- power:          0 (kein) .. 5 (sehr hoch)
--
-- goal_type values:
--   'strategic'   | 'functional' | 'operational' | 'program'
--   (Hinweis: alter Wert 'initiative' ist jetzt 'program')
--
-- goal_stakeholder_role values:
--   'Sponsor' | 'Champion' | 'Betroffener' | 'Treiber' | 'Blocker' | 'Informiert'
--
-- UI-Terminologie (DB-Name → UI-Label):
--   engagements  → Initiative
--   eng_alias    → Initiativ-Kurzname
--   dynamics_eng → Dynamics-Projektnummer
--   tasks        → Maßnahmen
-- ================================================================

-- End of schema
