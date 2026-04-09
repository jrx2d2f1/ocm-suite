# OCM Suite — Project Context for Claude Code

## Was dieses Projekt ist

SaaS-Applikation für **Organizational Change Management Consultants**.
Zielgruppe: Externe Change-Berater (initial: Jürgen Rohr, ServiceNow Senior Principal Strategist).
Zielmarkt: DACH, Freemium-Modell €39–49/User/Monat.
Zweck aktuell: Demo-Applikation, Daten werden manuell eingepflegt.

---

## Tech Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Sprache | TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Stil: `radix-nova`, Basisfarbe: Zinc) |
| Datenbank | Supabase (PostgreSQL + Auth + RLS) |
| Deployment | Vercel |
| Visualisierung | Recharts, D3.js (geplant) |

### Supabase Client Setup
```typescript
// Immer @supabase/ssr verwenden — NICHT @supabase/auth-helpers-nextjs (deprecated)
import { createBrowserClient } from '@supabase/ssr'   // Client Components
import { createServerClient } from '@supabase/ssr'     // Server Components / Route Handlers
```

### Umgebungsvariablen (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```
**Wichtig:** `.env.local` darf NIEMALS committet werden. Steht in `.gitignore`.

---

## Datenmodell — 20 Tabellen (siehe ocm_schema.sql)

### Kern-Hierarchie
```
organizations (Tenant-Root, Multi-Tenancy)
  └── org_memberships (User ↔ Org mit Rolle: owner/admin/member/viewer)
  └── customers (selbstreferenziell: Gruppe → Tochtergesellschaft)
        └── engagements (ein Projekt beim Kunden)
              ├── milestones
              ├── tasks (Kanban: Backlog/In Progress/Review/Done)
              ├── stakeholders
              │     └── stakeholder_profiles (pro Engagement separat!)
              ├── stakeholder_relationships
              └── canvas_data (1:1 mit engagement)
                    ├── canvas_phases
                    └── canvas_kpis (→ optional verknüpft mit key_results)
```

### Strategy Map (Kundenbezogen, nicht Engagement-bezogen)
```
customers
  └── strategy_goals (type: strategic/functional/operational/initiative)
        ├── strategy_goal_parents (m:n Eltern-Kind-Hierarchie)
        ├── key_results (Zielaussagen: "was ist Erfolg?")
        └── engagement_key_results (Bridge: Engagement trägt zu KR bei)
```

### Wichtige Design-Entscheidungen
- **Stakeholder-Profile sind engagement-spezifisch** — gleiche Person kann in zwei Projekten unterschiedliche Profile haben (`stakeholder_profiles` Tabelle, unique auf stakeholder_id + engagement_id)
- **KPI ≠ Key Result** — `canvas_kpis` = Messinstrument auf Engagement-Ebene (mit Baseline, Methode, Ampel); `key_results` = Zielaussage auf Strategy-Goal-Ebene. Verbindung via `canvas_kpis.kr_id` (optional)
- **Multi-Tenancy via org_id** — alle RLS-Policies laufen über `is_org_member(org_id)` und `is_org_admin(org_id)`
- **`users.id`** ist plain UUID (kein FK auf auth.users — wird App-seitig verwaltet)

### RLS-Hilfsfunktionen (bereits im Schema)
```sql
is_org_member(p_org_id uuid) → boolean
is_org_admin(p_org_id uuid)  → boolean
```

### Convenience Views
- `v_stakeholders_with_profile` — Stakeholder + aktuelles Profil per JOIN
- `v_engagement_overview` — Dashboard-Karten mit Zählern (milestones, tasks, stakeholders)
- `v_goal_kr_progress` — Strategy-Ziel mit aggregierten KRs als JSONB

---

## Enums (PostgreSQL)

```sql
org_member_role:    owner, admin, member, viewer
engagement_status:  active, draft, hold, closed
milestone_status:   planned, progress, done, delayed
task_status:        Backlog, In Progress, Review, Done
task_category:      Kommunikation, Enablement, Sounding, Sponsoring, Reporting, Erwartung
stakeholder_type:   person, group
interest_value:     --, -, 0, +, ++
relationship_type:  Sponsor, Champion, Berichtslinie, Peer, Influencer, Blocker
kpi_ampel:          green, yellow, red, gray
goal_type:          strategic, functional, operational, initiative
```

---

## Features & Views (nach Prototyp, noch zu implementieren)

### 1. Dashboard — Gantt-Übersicht
- Kunden → Engagements → Milestones als Zeitleiste
- Ein-/ausklappbare Kundenblöcke
- Milestone-Dots auf Zeitleiste, farbig nach Status
- Heute-Linie
- Filterbar nach Quartal/Halbjahr/Jahr

### 2. Initiative Canvas (pro Engagement)
- **Warum-Block:** Ausgangslage, Strategischer Kontext, Treiber, Risiken bei Nicht-Handeln
- **Ziele:** 4 Tabs — Org-Ziele, Funktionale Ziele, People-Ziele, Tech-Ziele
- **Zeithorizont:** Phasen mit Monat+Jahr-Picker
- **Erfolg & Messung:** KPI-Tabelle (Name, Baseline, Zielwert, Istwert, Methode, RAG-Ampel)
- **Verknüpfte Ziele:** aus Strategy Map, mit KR-Fortschrittsbalken
- Edit-Mode mit Bestätigung beim ungespeicherten Verlassen
- Canvas-Header: Kunden-Filter + Engagement-Pills

### 3. Kanban Board
- Swimlane-Layout: Zeilen = 6 Task-Kategorien, Spalten = 4 Status
- Drag & Drop
- Task-Detailpanel (alle Felder editierbar): Titel, Beschreibung, Ziel, Kategorie, Status, Fälligkeit, Verantwortlicher, Mitarbeitende, verknüpfte Stakeholder

### 4. Power/Interest-Matrix
- Freie SVG-Canvas Positionierung per Drag & Drop
- X-Achse: Interest (--/−/0/+/++), Y-Achse: Power (0–5)
- Beziehungslinien als SVG-Layer
  - Richtungspfeile (uni- und bidirektional)
  - Hover-Tooltip mit Beziehungstyp und Notizen
  - Klick auf Linie öffnet Bearbeitungs-Panel
- Stakeholder als Dots mit Initialen, Farbe nach Klassifizierung
- Risiko-Ring für flagged Stakeholder
- Seitenliste mit Interest/Power-Badges

### 5. Strategy Map
- 4 Spalten: Strategische Ziele → Funktionale Ziele → Operative Ziele → Initiativen
- Karten mit KR-Fortschrittsbalken (Istwert vs. Zielwert)
- Eltern-Badges (Verknüpfung zur übergeordneten Ebene)
- Initiative-Karten: „→ Initiative Canvas öffnen" Link direkt in Engagement-Canvas
- Modal zum Anlegen/Bearbeiten mit KR-Liste (inline editierbar)

### 6. Kalender
- Monatsraster mit Tasks nach Fälligkeitsdatum
- Klick auf Task öffnet Detailpanel

---

## Beispieldaten (für Seed-Skript)

### Kunden
| ID | Name | Typ | Parent |
|---|---|---|---|
| dhl | DHL Group | Gruppe | — |
| dhl-its | DHL IT Services | GmbH | dhl |
| dhl-exp | DHL Express | GmbH | dhl |
| bmw | BMW Group | Gruppe | — |
| bmw-ag | BMW AG | AG | bmw |
| sap | SAP SE | SE | — |

### Engagements
| ID | Kunde | Name | Dynamics-Nr | Status |
|---|---|---|---|---|
| e1 | dhl-its | BVA AI bei DHL ITS | ENG-2024-0842 | active |
| e2 | dhl-exp | OCM Platform-Rollout | ENG-2024-0791 | active |
| e3 | bmw-ag | AI Transformation Strategy | ENG-2024-0755 | active |
| e4 | sap | AI Adoption Program | ENG-2024-0810 | active |
| e5 | dhl-its | Change Readiness Assessment | ENG-2025-0101 | draft |

### Stakeholder (Beispiel e1 — BVA AI DHL)
- Thomas Müller, CIO DHL ITS — Power 5, Interest ++, Sponsor, Farbe #4f8ef7
- Sandra Koch, Head of Digital — Power 4, Interest +, Champion
- Petra Hahn, BR-Vorsitzende — Power 4, Interest --, Blocker (risk_flag=true)
- Betriebsrat DHL (group, 12 Personen) — Power 3, Interest --
- Poweruser DHL (group, 8 Personen) — Power 2, Interest +
- Anwender (group, 680 Personen) — Power 1, Interest 0

---

## Entwicklungsreihenfolge (Phasen)

```
Phase 0 ✅  Konten, Tools, Schema deployed
Phase 1     Auth + Navigation Shell (Login, Middleware, Sidebar)
Phase 2     Seed-Skript (Demo-Daten aus Prototyp)
Phase 3     Dashboard (Gantt), Kanban, Initiative Canvas
Phase 4     Power/Interest-Matrix, Strategy Map
Phase 5     CRUD für alle Entitäten, PDF-Export, Polish
```

---

## Coding-Konventionen

- **Sprache:** Deutsch für UI-Labels und Kommentare, Englisch für Code/Variablen
- **Komponenten:** shadcn/ui als Basis, angepasst mit Tailwind
- **Server vs. Client:** Default Server Components, `'use client'` nur wenn nötig
- **Datenbankzugriff:** immer über Supabase-Client, niemals direkte SQL-Queries im Frontend
- **RLS:** Alle Tabellen haben RLS — kein `service role` Client im Browser
- **Typen:** Aus Supabase-Schema generieren via `supabase gen types typescript`

---

## Referenz-Dateien im Projekt

- `ocm_schema.sql` — vollständiges Datenbankschema (962 Zeilen, 20 Tabellen)
- `ocm-prototype.html` — funktionaler HTML-Prototyp mit allen Views als Referenz für UX/Layout
- `OCM_Suite_Setup_Guide.docx` — Setup-Anleitung

Der Prototyp (`ocm-prototype-v3.html`) ist die **primäre UX-Referenz** — alle Views sind dort implementiert und können direkt im Browser geöffnet werden. Bei Fragen zu Layout, Interaktionen oder Datenwerten: Prototyp konsultieren.
