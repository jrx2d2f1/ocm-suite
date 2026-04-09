-- ================================================================
-- OCM Suite — Demo-Seed v1.0
-- Ausführen im Supabase SQL Editor (läuft als postgres, RLS bypassed)
--
-- Was wird angelegt:
--   • Organisation: Rohr Consulting
--   • 6 Kunden mit Konzernstruktur (DHL, BMW, SAP)
--   • 5 Engagements (4 aktiv, 1 draft)
--   • Milestones + Tasks für e1 (BVA AI DHL ITS) und e2
--   • 6 Stakeholder DHL ITS + 3 DHL Express (mit Profilen, Beziehungen)
--   • Initiative Canvas mit Phasen + KPIs für e1 (vollständig)
--   • 4 Strategy Goals + Key Results für DHL ITS
-- ================================================================

DO $$
DECLARE
  -- ═══════════════════════════════════════════════════════════════
  -- HIER ANPASSEN (Zeile 20–21)
  -- ═══════════════════════════════════════════════════════════════
  v_user_email text := 'deine@email.de';   -- ← deine Supabase-Login-E-Mail
  v_user_name  text := 'Jürgen Rohr';
  -- ═══════════════════════════════════════════════════════════════

  v_user_id   uuid;
  v_org_id    uuid;

  -- Kunden
  v_dhl       uuid;
  v_dhl_its   uuid;
  v_dhl_exp   uuid;
  v_bmw       uuid;
  v_bmw_ag    uuid;
  v_sap       uuid;

  -- Engagements
  v_e1 uuid; v_e2 uuid; v_e3 uuid; v_e4 uuid; v_e5 uuid;

  -- Canvas
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid;

  -- Milestones e1
  v_m1a uuid; v_m1b uuid; v_m1c uuid; v_m1d uuid;
  -- Milestones e2
  v_m2a uuid; v_m2b uuid; v_m2c uuid;
  -- Milestones e3
  v_m3a uuid; v_m3b uuid; v_m3c uuid;

  -- Stakeholder DHL ITS
  v_sh_mueller   uuid;
  v_sh_koch      uuid;
  v_sh_hahn      uuid;
  v_sh_br        uuid;
  v_sh_poweruser uuid;
  v_sh_anwender  uuid;

  -- Stakeholder DHL Express
  v_sh_becker  uuid;
  v_sh_richter uuid;
  v_sh_it_team uuid;

  -- Strategy Goals DHL ITS
  v_sg1 uuid; v_sg2 uuid; v_sg3 uuid; v_sg4 uuid;
  -- Key Results
  v_kr1 uuid; v_kr2 uuid; v_kr3 uuid; v_kr4 uuid;

BEGIN

  -- ──────────────────────────────────────────────────────────────
  -- 0. USER
  -- ──────────────────────────────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User "%" nicht in auth.users gefunden. E-Mail in Zeile 20 anpassen.', v_user_email;
  END IF;

  -- User-Profil anlegen (normalerweise via Trigger; ON CONFLICT sicher)
  INSERT INTO users (id, email, full_name)
  VALUES (v_user_id, v_user_email, v_user_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ──────────────────────────────────────────────────────────────
  -- 1. ORGANISATION
  -- ──────────────────────────────────────────────────────────────
  INSERT INTO organizations (name, slug, plan)
  VALUES ('Rohr Consulting', 'rohr-consulting', 'professional')
  RETURNING id INTO v_org_id;

  INSERT INTO org_memberships (org_id, user_id, role, accepted_at)
  VALUES (v_org_id, v_user_id, 'owner', now());

  RAISE NOTICE 'Organisation: % (%)', v_org_id, 'Rohr Consulting';

  -- ──────────────────────────────────────────────────────────────
  -- 2. KUNDEN
  -- ──────────────────────────────────────────────────────────────

  -- Konzern-Roots
  INSERT INTO customers (org_id, name, acct_type, created_by)
  VALUES (v_org_id, 'DHL Group', 'Gruppe', v_user_id)
  RETURNING id INTO v_dhl;

  INSERT INTO customers (org_id, name, acct_type, created_by)
  VALUES (v_org_id, 'BMW Group', 'Gruppe', v_user_id)
  RETURNING id INTO v_bmw;

  INSERT INTO customers (org_id, name, acct_type, created_by)
  VALUES (v_org_id, 'SAP SE', 'SE', v_user_id)
  RETURNING id INTO v_sap;

  -- Töchter
  INSERT INTO customers (org_id, parent_id, name, acct_type, created_by)
  VALUES (v_org_id, v_dhl, 'DHL IT Services', 'GmbH', v_user_id)
  RETURNING id INTO v_dhl_its;

  INSERT INTO customers (org_id, parent_id, name, acct_type, created_by)
  VALUES (v_org_id, v_dhl, 'DHL Express', 'GmbH', v_user_id)
  RETURNING id INTO v_dhl_exp;

  INSERT INTO customers (org_id, parent_id, name, acct_type, created_by)
  VALUES (v_org_id, v_bmw, 'BMW AG', 'AG', v_user_id)
  RETURNING id INTO v_bmw_ag;

  -- ──────────────────────────────────────────────────────────────
  -- 3. ENGAGEMENTS
  -- ──────────────────────────────────────────────────────────────
  INSERT INTO engagements (org_id, customer_id, owner_user_id, name, dynamics_eng, eng_alias, status, start_date, end_date)
  VALUES (v_org_id, v_dhl_its, v_user_id, 'BVA AI bei DHL ITS', 'ENG-2024-0842', 'BVA AI', 'active', '2024-01', '2024-12')
  RETURNING id INTO v_e1;

  INSERT INTO engagements (org_id, customer_id, owner_user_id, name, dynamics_eng, eng_alias, status, start_date, end_date)
  VALUES (v_org_id, v_dhl_exp, v_user_id, 'OCM Platform-Rollout', 'ENG-2024-0791', 'OCM Platform', 'active', '2024-03', '2025-02')
  RETURNING id INTO v_e2;

  INSERT INTO engagements (org_id, customer_id, owner_user_id, name, dynamics_eng, eng_alias, status, start_date, end_date)
  VALUES (v_org_id, v_bmw_ag, v_user_id, 'AI Transformation Strategy', 'ENG-2024-0755', 'AI Transform', 'active', '2024-02', '2025-06')
  RETURNING id INTO v_e3;

  INSERT INTO engagements (org_id, customer_id, owner_user_id, name, dynamics_eng, eng_alias, status, start_date, end_date)
  VALUES (v_org_id, v_sap, v_user_id, 'AI Adoption Program', 'ENG-2024-0810', 'AI Adoption', 'active', '2024-04', '2025-03')
  RETURNING id INTO v_e4;

  INSERT INTO engagements (org_id, customer_id, owner_user_id, name, dynamics_eng, eng_alias, status, start_date, end_date)
  VALUES (v_org_id, v_dhl_its, v_user_id, 'Change Readiness Assessment', 'ENG-2025-0101', 'CRA 2025', 'draft', '2025-02', '2025-06')
  RETURNING id INTO v_e5;

  -- ──────────────────────────────────────────────────────────────
  -- 4. MILESTONES
  -- ──────────────────────────────────────────────────────────────

  -- e1 — BVA AI
  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e1, 'Kick-off & Stakeholder-Analyse', '2024-03-31', 'done', 0)
  RETURNING id INTO v_m1a;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e1, 'Pilotphase & Erprobung', '2024-06-30', 'progress', 1)
  RETURNING id INTO v_m1b;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e1, 'Rollout Phase 1', '2024-09-30', 'planned', 2)
  RETURNING id INTO v_m1c;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e1, 'Go-Live & Hypercare', '2024-12-20', 'planned', 3)
  RETURNING id INTO v_m1d;

  -- e2 — OCM Platform
  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e2, 'Ist-Analyse & Gap Assessment', '2024-05-31', 'done', 0)
  RETURNING id INTO v_m2a;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e2, 'Plattform-Rollout Welle 1', '2024-09-30', 'progress', 1)
  RETURNING id INTO v_m2b;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e2, 'Go-Live Full Scope', '2025-02-28', 'planned', 2)
  RETURNING id INTO v_m2c;

  -- e3 — BMW AI Transform
  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e3, 'AI Readiness Assessment', '2024-04-30', 'done', 0)
  RETURNING id INTO v_m3a;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e3, 'Change Roadmap & Governance', '2024-08-31', 'progress', 1)
  RETURNING id INTO v_m3b;

  INSERT INTO milestones (engagement_id, name, due, status, sort_order)
  VALUES (v_e3, 'Transformation Phase 1', '2025-06-30', 'planned', 2)
  RETURNING id INTO v_m3c;

  -- ──────────────────────────────────────────────────────────────
  -- 5. TASKS
  -- ──────────────────────────────────────────────────────────────

  -- e1 — BVA AI (alle Kategorien, alle Status)
  INSERT INTO tasks (engagement_id, milestone_id, title, status, category, due, beschreibung, sort_order) VALUES
    (v_e1, v_m1a, 'Kick-off Workshop vorbereiten',              'Done',       'Kommunikation', '2024-02-15', 'Agenda, Präsentation und Stakeholder-Liste für Auftakt-Workshop', 0),
    (v_e1, v_m1a, 'Stakeholder-Interviews Führungsebene',       'Done',       'Sounding',      '2024-03-15', '1:1 Interviews mit CIO, Head of Digital und BR-Vorsitzender', 1),
    (v_e1, v_m1a, 'Sponsoring-Vereinbarung mit CIO',            'Done',       'Sponsoring',    '2024-03-20', 'Formale Sponsor-Erklärung und Budget-Freigabe durch Thomas Müller', 2),
    (v_e1, v_m1b, 'Change Impact Assessment durchführen',       'In Progress','Erwartung',     '2024-05-31', 'Betroffenheitsanalyse für alle Nutzergruppen', 3),
    (v_e1, v_m1b, 'Kommunikationsplan erstellen',               'In Progress','Kommunikation', '2024-05-15', 'Zielgruppen-spezifische Kommunikation für Phase 1 und 2', 4),
    (v_e1, v_m1b, 'BR-Workshop Datenschutz & KI',               'In Progress','Sponsoring',    '2024-06-15', 'Betriebsrat-Workshop zu rechtlichen Rahmenbedingungen und Mitbestimmungsrechten', 5),
    (v_e1, v_m1b, 'Poweruser-Programm aufsetzen',               'Review',     'Enablement',    '2024-07-01', 'Key User Community: Auswahl, Schulung, Community-Plattform', 6),
    (v_e1, v_m1b, 'Steering-Committee-Reporting Q2',            'Review',     'Reporting',     '2024-06-28', 'Quartals-Update für Steering Committee: Status, Risiken, Next Steps', 7),
    (v_e1, v_m1c, 'Rollout-Kommunikation Welle 1',              'Backlog',    'Kommunikation', '2024-08-15', 'Ankündigungs-Mails, Intranet-Artikel, Manager-Briefing', 8),
    (v_e1, v_m1c, 'End-User-Training Pilotgruppe (80 MA)',      'Backlog',    'Enablement',    '2024-09-01', 'Schulungskonzept und Durchführung für 80 Pilotnutzer', 9),
    (v_e1, v_m1d, 'Go-Live-Kommunikation konzernweit',          'Backlog',    'Kommunikation', '2024-12-01', 'Unternehmensweite Ankündigung, FAQ-Seite, Manager-Toolkit', 10),
    (v_e1, v_m1d, 'Hypercare-Reporting Setup',                  'Backlog',    'Reporting',     '2024-12-15', 'Weekly Status Reports für Steering Committee während Hypercare-Phase', 11);

  -- e2 — OCM Platform DHL Express (Kurzset)
  INSERT INTO tasks (engagement_id, milestone_id, title, status, category, due, sort_order) VALUES
    (v_e2, v_m2a, 'As-is Prozessanalyse DHL Express',           'Done',       'Erwartung',     '2024-04-30', 0),
    (v_e2, v_m2a, 'Stakeholder Mapping DHL Express',            'Done',       'Sounding',      '2024-05-15', 1),
    (v_e2, v_m2b, 'Platform Demo Workshop mit Fachbereichen',   'In Progress','Kommunikation', '2024-07-31', 2),
    (v_e2, v_m2b, 'Train-the-Trainer Programm',                 'Backlog',    'Enablement',    '2024-09-01', 3),
    (v_e2, v_m2c, 'Go-Live Hypercare Support',                  'Backlog',    'Reporting',     '2025-02-01', 4);

  -- ──────────────────────────────────────────────────────────────
  -- 6. STAKEHOLDER (customer-scoped, v2.0)
  -- ──────────────────────────────────────────────────────────────

  -- DHL IT Services
  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, sort_order)
  VALUES (v_dhl_its, 'Thomas Müller', 'person', 'Chief Information Officer', 'IT Leadership', 'TM', '#4f8ef7', 0)
  RETURNING id INTO v_sh_mueller;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, sort_order)
  VALUES (v_dhl_its, 'Sandra Koch', 'person', 'Head of Digital', 'Digital Office', 'SK', '#22c55e', 1)
  RETURNING id INTO v_sh_koch;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, sort_order)
  VALUES (v_dhl_its, 'Petra Hahn', 'person', 'BR-Vorsitzende', 'Betriebsrat', 'PH', '#f59e0b', 2)
  RETURNING id INTO v_sh_hahn;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, group_size, sort_order)
  VALUES (v_dhl_its, 'Betriebsrat DHL', 'group', 'Arbeitnehmervertretung', 'Betriebsrat', 'BR', '#8b5cf6', 12, 3)
  RETURNING id INTO v_sh_br;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, group_size, sort_order)
  VALUES (v_dhl_its, 'Poweruser', 'group', 'Key User Gruppe', 'IT / Fachbereiche', 'PU', '#06b6d4', 8, 4)
  RETURNING id INTO v_sh_poweruser;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, group_size, sort_order)
  VALUES (v_dhl_its, 'Anwender', 'group', 'Alle Mitarbeitenden DHL ITS', 'Alle Bereiche', 'AN', '#94a3b8', 680, 5)
  RETURNING id INTO v_sh_anwender;

  -- DHL Express
  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, sort_order)
  VALUES (v_dhl_exp, 'Michael Becker', 'person', 'COO DHL Express DE', 'Operations', 'MB', '#ef4444', 0)
  RETURNING id INTO v_sh_becker;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, sort_order)
  VALUES (v_dhl_exp, 'Anna Richter', 'person', 'Head of Operations Excellence', 'Operations', 'AR', '#10b981', 1)
  RETURNING id INTO v_sh_richter;

  INSERT INTO stakeholders (customer_id, name, type, role, department, initials, color, group_size, sort_order)
  VALUES (v_dhl_exp, 'IT-Team DHL Express', 'group', 'IT Operations', 'IT', 'IT', '#6366f1', 45, 2)
  RETURNING id INTO v_sh_it_team;

  -- ──────────────────────────────────────────────────────────────
  -- 7. INITIATIVE_STAKEHOLDERS (Zuordnung Stakeholder ↔ Engagement)
  -- ──────────────────────────────────────────────────────────────

  -- e1 — BVA AI (mit Power/Interest-Matrix-Positionen)
  INSERT INTO initiative_stakeholders (engagement_id, stakeholder_id, pos_x, pos_y) VALUES
    (v_e1, v_sh_mueller,   0.85, 0.92),
    (v_e1, v_sh_koch,      0.75, 0.80),
    (v_e1, v_sh_hahn,      0.12, 0.82),
    (v_e1, v_sh_br,        0.15, 0.62),
    (v_e1, v_sh_poweruser, 0.72, 0.45),
    (v_e1, v_sh_anwender,  0.50, 0.22);

  -- e5 — CRA 2025 (Folgeauftrag, gleiche Stakeholder DHL ITS)
  INSERT INTO initiative_stakeholders (engagement_id, stakeholder_id) VALUES
    (v_e5, v_sh_mueller),
    (v_e5, v_sh_hahn),
    (v_e5, v_sh_br),
    (v_e5, v_sh_anwender);

  -- e2 — OCM Platform DHL Express
  INSERT INTO initiative_stakeholders (engagement_id, stakeholder_id, pos_x, pos_y) VALUES
    (v_e2, v_sh_becker,  0.80, 0.85),
    (v_e2, v_sh_richter, 0.70, 0.72),
    (v_e2, v_sh_it_team, 0.55, 0.50);

  -- ──────────────────────────────────────────────────────────────
  -- 8. STAKEHOLDER_PROFILES (Profil pro Stakeholder × Engagement)
  -- ──────────────────────────────────────────────────────────────

  -- e1 — BVA AI DHL ITS
  INSERT INTO stakeholder_profiles
    (stakeholder_id, engagement_id, power, interest, classification, risk_flag, rel_to_consultant,
     haltung, beschreibung, gewinnt, verliert, strategy)
  VALUES
    (v_sh_mueller, v_e1, 5, '++', 'Schlüssel-Unterstützer', false, 'Sponsor',
     'Stark pro KI — sieht strategische Notwendigkeit und persönliches Mandat',
     'Hauptsponsor des BVA-AI-Projekts; treibt AI-Agenda für DHL ITS voran',
     'Strategische Führungsrolle, Effizienzgewinne im IT-Portfolio',
     'Investitionsrisiko wenn Projekt scheitert oder sich verzögert',
     'Regelmäßige Executive-Updates, bei kritischen Entscheidungen einbinden, Erfolge sichtbar machen'),

    (v_sh_koch, v_e1, 4, '+', 'Unterstützer', false, 'Champion',
     'Offen und pragmatisch — sieht Chance für ihren Digitalbereich',
     'Operativer Treiber der Digitalisierung; koordiniert IT und Business',
     'Sichtbarkeit als Digital-Leader, bessere Tools und Prozesse für ihr Team',
     'Risiko bei schlechter User Experience im Rollout',
     'Als Champion für Pilotgruppe gewinnen, früh und tief einbinden'),

    (v_sh_hahn, v_e1, 4, '--', 'Kritischer Stakeholder', true, 'Blocker',
     'Skeptisch: primäre Sorgen um Datenschutz und Jobverlust-Ängste im BR',
     'BR-Vorsitzende mit formaler Mitbestimmungsrolle für alle digitalen Systeme',
     'Modernere Arbeitsplätze und bessere Bedingungen — wenn Ängste ausgeräumt werden',
     'Kontrollverlust, Datenschutz-Haftung, Vertrauensverlust bei BR-Mitgliedern',
     'Betriebsvereinbarung proaktiv gestalten, Datenschutz-Workshop, 1:1-Gespräche'),

    (v_sh_br, v_e1, 3, '--', 'Kritische Gruppe', true, 'Blocker',
     'Kollektive Skepsis — wartet auf Haltung der BR-Vorsitzenden',
     'Formale Mitbestimmungsinstanz; kann Rollout formal blockieren',
     'Bessere Arbeitsbedingungen durch KI-Entlastung von Routinearbeit',
     'Arbeitsplatzsicherheit, Datenschutz, Kontrollverlust',
     'Betriebsrat-Workshop "KI und Mitbestimmung", Einblick in Systemdesign geben'),

    (v_sh_poweruser, v_e1, 2, '+', 'Multiplikator', false, 'Champion',
     'Neugierig, technisch affin, bereit zum Testen — wollen Pioniere sein',
     'Key User für Pilotphase; First Adopter und spätere Multiplikatoren',
     'Neue Skills, Expertenstatus im Team, Karriere-Sichtbarkeit',
     'Mehraufwand in Pilotphase neben regulärem Job',
     'Poweruser-Community aufbauen, Feedback-Kanal etablieren, Anerkennung sichern'),

    (v_sh_anwender, v_e1, 1, '0', 'Neutrale Gruppe', false, 'Informiert',
     'Abwartend und wenig informiert — kaum Meinung pro oder contra',
     'Größte Nutzergruppe; direkter Impact durch Systemwechsel im Alltag',
     'Einfachere Workflows, weniger manuelle Arbeit, modernere Tools',
     'Lernaufwand, Umstellungs-Stress, Angst vor Fehlern im neuen System',
     'Kommunikationskampagne "Was ändert sich für mich?", Change Story, Training');

  -- e2 — OCM Platform DHL Express
  INSERT INTO stakeholder_profiles
    (stakeholder_id, engagement_id, power, interest, classification, risk_flag, rel_to_consultant)
  VALUES
    (v_sh_becker,  v_e2, 5, '+',  'Schlüssel-Unterstützer', false, 'Sponsor'),
    (v_sh_richter, v_e2, 4, '++', 'Unterstützer',           false, 'Champion'),
    (v_sh_it_team, v_e2, 2, '0',  'Neutrale Gruppe',        false, 'Informiert');

  -- ──────────────────────────────────────────────────────────────
  -- 9. STAKEHOLDER_RELATIONSHIPS (e1 — BVA AI)
  -- ──────────────────────────────────────────────────────────────
  INSERT INTO stakeholder_relationships
    (engagement_id, from_id, to_id, type, strength, bidirectional, notes)
  VALUES
    (v_e1, v_sh_mueller, v_sh_koch,      'Berichtslinie', 4, false, 'Koch berichtet direkt an Müller'),
    (v_e1, v_sh_mueller, v_sh_hahn,      'Peer',          3, true,  'Regelmäßiger Austausch auf Augenhöhe'),
    (v_e1, v_sh_hahn,    v_sh_br,        'Champion',      5, false, 'Hahn repräsentiert und leitet den BR'),
    (v_e1, v_sh_koch,    v_sh_poweruser, 'Sponsor',       4, false, 'Koch sponsert das Poweruser-Programm');

  -- ──────────────────────────────────────────────────────────────
  -- 10. CANVAS DATA
  -- ──────────────────────────────────────────────────────────────

  -- e1 — BVA AI DHL ITS (vollständig)
  INSERT INTO canvas_data (
    engagement_id,
    ausgangslage, strategischer_kontext, treiber, risiken_bei_nicht_handeln,
    ziele_org, ziele_funktional, ziele_people, ziele_tech,
    start_date, end_date, erfolg_narrativ
  ) VALUES (
    v_e1,
    'DHL ITS betreibt die zentrale IT-Plattform der DHL Group mit ca. 680 Mitarbeitenden. Das bestehende BVA-System (Betriebliche Verwaltungsanwendung) ist technologisch veraltet, wartungsintensiv und schränkt Effizienz und Nutzerzufriedenheit massiv ein.',
    'DHL Group hat 2024 KI als strategische Priorität im Programm "AI@DHL" definiert. DHL ITS soll als IT-Tochtergesellschaft Vorreiter für den konzernweiten Rollout sein und bis Q4 2024 "AI-Ready" sein.',
    'Effizienzsteigerung 30 % in Verwaltungsprozessen angestrebt; Wettbewerbsdruck durch KI-affine Wettbewerber; explizite Konzernvorgabe AI-Readiness bis Q4 2024',
    'Technologischer Rückstand; wachsende Frustration bei Mitarbeitenden; Risiko für das Konzernprogramm AI@DHL; höhere Wartungskosten bei Legacy-System',
    ARRAY['Digitale Transformation der Verwaltungsprozesse bis Q4 2024 abschließen', 'DHL ITS als KI-Vorreiter im DHL-Konzern positionieren'],
    ARRAY['Verwaltungsprozesse um 30 % effizienter gestalten', 'Manuelle Dateneingabe um 60 % reduzieren', 'Bearbeitungszeit kritischer Prozesse halbieren'],
    ARRAY['Akzeptanzrate > 80 % nach 3 Monaten Live-Betrieb', 'Alle 680 MA bis Go-Live geschult und zertifiziert', 'Poweruser-Community mit 8 Key Usern fest etabliert', 'Change Readiness Score ≥ 3.8 / 5.0'],
    ARRAY['BVA-Nachfolgesystem vollständig deployed und stabil', 'KI-Funktionen für alle Kernprozesse aktiviert und produktiv genutzt'],
    '2024-01', '2024-12',
    'Alle 680 Mitarbeitenden der DHL ITS arbeiten ab Januar 2025 produktiv im neuen KI-gestützten System. Die Akzeptanzrate liegt bei über 80 %, die Poweruser-Community ist aktiv und sichtbar, und DHL ITS gilt konzernweit als Referenz für erfolgreichen AI-Change. Das Projekt wird intern als Blaupause für weitere Rollouts verwendet.'
  ) RETURNING id INTO v_c1;

  -- Canvas Phasen (e1)
  INSERT INTO canvas_phases (canvas_id, title, start_date, end_date, dates_label, color, description, goal, sort_order) VALUES
    (v_c1, 'Analyse & Setup', '2024-01', '2024-03', 'Jan – Mär 2024', '#4f8ef7',
     'Stakeholder-Analyse, Change-Impact-Assessment, Kick-off-Workshop, Change-Strategie',
     'Change-Strategie durch Steering Committee verabschiedet; alle Key Stakeholder eingebunden und aligned', 0),

    (v_c1, 'Pilotphase', '2024-04', '2024-06', 'Apr – Jun 2024', '#22c55e',
     'Pilotbetrieb mit 80 Powerusern, Feedback-Schleifen, BR-Workshop, Kommunikationsplan',
     'Pilotphase erfolgreich abgeschlossen, Feedback integriert, Rollout-Plan finalisiert und freigegeben', 1),

    (v_c1, 'Rollout Phase 1', '2024-07', '2024-09', 'Jul – Sep 2024', '#f59e0b',
     'Stufenweiser Rollout auf alle Bereiche, End-User-Trainings, Manager-Briefings',
     'Mindestens 50 % der 680 Nutzer produktiv und zertifiziert im neuen System', 2),

    (v_c1, 'Go-Live & Hypercare', '2024-10', '2024-12', 'Okt – Dez 2024', '#ef4444',
     'Vollständiger Go-Live, intensive Begleitung, Hypercare-Support, Lessons Learned',
     'Alle 680 Nutzer produktiv; Hypercare-Phase erfolgreich abgeschlossen; Change-Report veröffentlicht', 3);

  -- Canvas KPIs (e1)
  INSERT INTO canvas_kpis (canvas_id, name, sub, baseline, target_value, current_value, methode, ampel, sort_order) VALUES
    (v_c1, 'User Akzeptanzrate',      'Anteil Nutzer, die System aktiv verwenden',  '0 %',   '≥ 80 %',    '62 %',  'Analytics-Dashboard',      'yellow', 0),
    (v_c1, 'Schulungsabdeckung',      'Anteil trainierter Mitarbeitender',           '0 %',   '100 %',     '35 %',  'LMS-Tracking',             'yellow', 1),
    (v_c1, 'Prozesseffizienz',        'Reduktion manueller Verwaltungsschritte',    '100 %', '≤ 40 %',    '75 %',  'Finance-Controlling',      'green',  2),
    (v_c1, 'Change Readiness Score',  'Puls-Survey Mitarbeitende (Skala 1–5)',       '2.1',   '≥ 3.8',     '3.2',   'Puls-Survey',              'green',  3),
    (v_c1, 'Support-Ticket-Rate',     'Tickets pro 100 Nutzer pro Woche',            '–',     '< 5',       '12',    'Meilenstein-Tracking',     'red',    4);

  -- e2–e5: minimale Canvas-Einträge
  INSERT INTO canvas_data (engagement_id, ausgangslage, start_date, end_date) VALUES
    (v_e2, 'DHL Express DE führt neue OCM-Plattform ein. Ca. 450 MA in 12 Standorten betroffen.', '2024-03', '2025-02')
  RETURNING id INTO v_c2;

  INSERT INTO canvas_data (engagement_id, ausgangslage, start_date, end_date) VALUES
    (v_e3, 'BMW AG startet konzernweite AI-Transformation. Change-Readiness-Assessment für 3 Pilotbereiche (F&E, HR, Finance).', '2024-02', '2025-06')
  RETURNING id INTO v_c3;

  INSERT INTO canvas_data (engagement_id, ausgangslage, start_date, end_date) VALUES
    (v_e4, 'SAP SE führt AI Copilot für interne Prozesse ein. Rollout zunächst in Finance & HR (ca. 800 MA).', '2024-04', '2025-03')
  RETURNING id INTO v_c4;

  INSERT INTO canvas_data (engagement_id, ausgangslage, start_date, end_date) VALUES
    (v_e5, 'Folgeauftrag: Messung des Change-Reifegrads bei DHL ITS nach abgeschlossenem BVA-AI-Rollout.', '2025-02', '2025-06')
  RETURNING id INTO v_c5;

  -- ──────────────────────────────────────────────────────────────
  -- 11. STRATEGY GOALS — DHL IT Services
  -- ──────────────────────────────────────────────────────────────
  INSERT INTO strategy_goals (org_id, customer_id, type, title, description, owner, color, review_period, sort_order)
  VALUES (v_org_id, v_dhl_its, 'strategic',
    'Digitale Transformation & AI-Leadership',
    'DHL ITS positioniert sich als KI-Vorreiter im DHL-Konzern und modernisiert alle Kernprozesse bis Ende 2025.',
    'Thomas Müller (CIO)', '#4f8ef7', 'H2 2024', 0)
  RETURNING id INTO v_sg1;

  INSERT INTO strategy_goals (org_id, customer_id, type, title, description, owner, color, review_period, sort_order)
  VALUES (v_org_id, v_dhl_its, 'functional',
    'Workforce AI-Readiness',
    'Alle Mitarbeitenden sind befähigt, KI-Tools sicher und produktiv zu nutzen.',
    'Sandra Koch (Head of Digital)', '#22c55e', 'H2 2024', 0)
  RETURNING id INTO v_sg2;

  INSERT INTO strategy_goals (org_id, customer_id, type, title, description, owner, color, review_period, sort_order)
  VALUES (v_org_id, v_dhl_its, 'operational',
    'AI-Akzeptanzrate > 80 % bis Q1 2025',
    'Messung über Analytics-Dashboard. Baseline: 0 %. Ziel: ≥ 80 % bis März 2025.',
    'Sandra Koch (Head of Digital)', '#f59e0b', 'Q4 2024', 0)
  RETURNING id INTO v_sg3;

  INSERT INTO strategy_goals (org_id, customer_id, type, title, description, owner, color, review_period, engagement_id, sort_order)
  VALUES (v_org_id, v_dhl_its, 'program',
    'BVA AI Rollout Programm',
    'Übergreifendes Programm für den Ersatz des BVA-Legacy-Systems durch KI-gestützte Lösung.',
    'Thomas Müller (CIO)', '#8b5cf6', 'H2 2024', v_e1, 0)
  RETURNING id INTO v_sg4;

  -- Goal-Hierarchie
  INSERT INTO strategy_goal_parents (parent_id, child_id) VALUES (v_sg1, v_sg2);
  INSERT INTO strategy_goal_parents (parent_id, child_id) VALUES (v_sg2, v_sg3);
  INSERT INTO strategy_goal_parents (parent_id, child_id) VALUES (v_sg1, v_sg4);

  -- ──────────────────────────────────────────────────────────────
  -- 12. KEY RESULTS
  -- ──────────────────────────────────────────────────────────────
  INSERT INTO key_results (goal_id, text, current_value, target_value, sort_order) VALUES
    (v_sg2, 'Schulungsabdeckung aller MA auf neuem System', '35 %',  '100 % bis Dez 2024',      0) RETURNING id INTO v_kr1;
  INSERT INTO key_results (goal_id, text, current_value, target_value, sort_order) VALUES
    (v_sg2, 'Change Readiness Score (Puls-Survey 1–5)',     '3.2',   '≥ 3.8 bis Dez 2024',      1) RETURNING id INTO v_kr2;
  INSERT INTO key_results (goal_id, text, current_value, target_value, sort_order) VALUES
    (v_sg3, 'User Akzeptanzrate im Analytics-Dashboard',    '62 %',  '≥ 80 % bis Mär 2025',     0) RETURNING id INTO v_kr3;
  INSERT INTO key_results (goal_id, text, current_value, target_value, sort_order) VALUES
    (v_sg3, 'Support-Ticket-Rate pro 100 Nutzer/Woche',     '12',    '< 5 bis Feb 2025',         1) RETURNING id INTO v_kr4;

  -- KPI ↔ KR verknüpfen (optional: canvas_kpis.kr_id setzen)
  UPDATE canvas_kpis SET kr_id = v_kr3 WHERE canvas_id = v_c1 AND name = 'User Akzeptanzrate';
  UPDATE canvas_kpis SET kr_id = v_kr2 WHERE canvas_id = v_c1 AND name = 'Change Readiness Score';
  UPDATE canvas_kpis SET kr_id = v_kr4 WHERE canvas_id = v_c1 AND name = 'Support-Ticket-Rate';

  -- Engagement ↔ Key Result Bridge
  INSERT INTO engagement_key_results (engagement_id, key_result_id, contribution_note) VALUES
    (v_e1, v_kr1, 'BVA-AI-Rollout ist das primäre Vehikel zur Schulungsabdeckung'),
    (v_e1, v_kr2, 'Change-Management-Maßnahmen im Projekt erhöhen direkt den Readiness Score'),
    (v_e1, v_kr3, 'Go-Live und Hypercare treiben die Akzeptanzrate'),
    (v_e1, v_kr4, 'Qualitätssicherung und Support-Konzept reduzieren Ticket-Rate');

  -- ──────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '✅ Seed erfolgreich abgeschlossen!';
  RAISE NOTICE '   Organisation : % (%)', 'Rohr Consulting', v_org_id;
  RAISE NOTICE '   Kunden       : 6 (DHL Group, DHL ITS, DHL Express, BMW Group, BMW AG, SAP SE)';
  RAISE NOTICE '   Engagements  : 5 (4 aktiv, 1 draft)';
  RAISE NOTICE '   Stakeholder  : 9 (6 DHL ITS, 3 DHL Express)';
  RAISE NOTICE '   Strategy     : 4 Goals, 4 Key Results';
  RAISE NOTICE '';

END;
$$;
