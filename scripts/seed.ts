// ================================================================
// OCM Suite — Seed Script v2.0
// Ausführen: npx ts-node scripts/seed.ts
// Voraussetzung: Organization + User in Supabase angelegt
// ================================================================
// Konfiguration: ORG_ID und USER_ID vor dem Start anpassen
// ================================================================
 
import { createClient } from '@supabase/supabase-js'
 
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY  = process.env.SUPABASE_SECRET_KEY!
const ORG_ID        = process.env.SEED_ORG_ID  || 'HIER_ORG_UUID_EINTRAGEN'
const USER_ID       = process.env.SEED_USER_ID || 'HIER_USER_UUID_EINTRAGEN'
 
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
 
// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────
async function insert<T>(table: string, rows: T | T[]): Promise<any[]> {
  const data = Array.isArray(rows) ? rows : [rows]
  const { data: result, error } = await sb.from(table).insert(data).select()
  if (error) throw new Error(`[${table}] ${error.message}`)
  console.log(`  ✓ ${table}: ${result.length} Zeilen`)
  return result
}
 
async function upsert<T>(table: string, rows: T | T[], onConflict: string): Promise<any[]> {
  const data = Array.isArray(rows) ? rows : [rows]
  const { data: result, error } = await sb.from(table).upsert(data, { onConflict }).select()
  if (error) throw new Error(`[${table}] ${error.message}`)
  console.log(`  ✓ ${table}: ${result.length} Zeilen`)
  return result
}
 
// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 OCM Suite Seed v2.0 startet...\n')
  console.log(`  Org:  ${ORG_ID}`)
  console.log(`  User: ${USER_ID}\n`)
 
  // ── 1. CUSTOMERS ─────────────────────────────────────────────
  console.log('── 1. Customers')
  const [dhl] = await insert('customers', {
    org_id: ORG_ID, name: 'DHL Group', acct_type: 'Gruppe',
    dynamics_acct: 'DYN-10042', parent_id: null, created_by: USER_ID,
  })
  const [dhlIts] = await insert('customers', {
    org_id: ORG_ID, name: 'DHL IT Services', acct_type: 'GmbH',
    dynamics_acct: 'DYN-10043', parent_id: dhl.id, created_by: USER_ID,
  })
  const [dhlExp] = await insert('customers', {
    org_id: ORG_ID, name: 'DHL Express', acct_type: 'GmbH',
    dynamics_acct: 'DYN-10044', parent_id: dhl.id, created_by: USER_ID,
  })
  const [bmw] = await insert('customers', {
    org_id: ORG_ID, name: 'BMW Group', acct_type: 'Gruppe',
    dynamics_acct: 'DYN-20011', parent_id: null, created_by: USER_ID,
  })
  const [bmwAg] = await insert('customers', {
    org_id: ORG_ID, name: 'BMW AG', acct_type: 'AG',
    dynamics_acct: 'DYN-20012', parent_id: bmw.id, created_by: USER_ID,
  })
  const [sap] = await insert('customers', {
    org_id: ORG_ID, name: 'SAP SE', acct_type: 'SE',
    dynamics_acct: 'DYN-30007', parent_id: null, created_by: USER_ID,
  })
 
  const customers = { dhl, dhlIts, dhlExp, bmw, bmwAg, sap }
 
  // ── 2. ENGAGEMENTS ───────────────────────────────────────────
  console.log('\n── 2. Engagements (Initiativen)')
  const [e1] = await insert('engagements', {
    org_id: ORG_ID, customer_id: dhlIts.id, owner_user_id: USER_ID,
    name: 'BVA AI bei DHL ITS', dynamics_eng: 'ENG-2024-0842',
    eng_alias: 'BVA AI DHL', status: 'active', start_date: '2025-01', end_date: '2025-06',
  })
  const [e2] = await insert('engagements', {
    org_id: ORG_ID, customer_id: dhlExp.id, owner_user_id: USER_ID,
    name: 'OCM Platform-Rollout', dynamics_eng: 'ENG-2024-0791',
    eng_alias: 'OCM Platform', status: 'active', start_date: '2025-02', end_date: '2025-09',
  })
  const [e3] = await insert('engagements', {
    org_id: ORG_ID, customer_id: bmwAg.id, owner_user_id: USER_ID,
    name: 'AI Transformation Strategy', dynamics_eng: 'ENG-2024-0755',
    eng_alias: 'Strategy BMW', status: 'active', start_date: '2025-01', end_date: '2025-12',
  })
  const [e4] = await insert('engagements', {
    org_id: ORG_ID, customer_id: sap.id, owner_user_id: USER_ID,
    name: 'AI Adoption Program', dynamics_eng: 'ENG-2024-0810',
    eng_alias: 'Adoption SAP', status: 'active', start_date: '2025-01', end_date: '2025-12',
  })
  const [e5] = await insert('engagements', {
    org_id: ORG_ID, customer_id: dhlIts.id, owner_user_id: USER_ID,
    name: 'Change Readiness Assessment', dynamics_eng: 'ENG-2025-0101',
    eng_alias: 'CRA DHL', status: 'draft', start_date: '2025-04', end_date: '2025-07',
  })
 
  const engs = { e1, e2, e3, e4, e5 }
 
  // ── 3. MILESTONES ────────────────────────────────────────────
  console.log('\n── 3. Milestones')
  const milestones = await insert('milestones', [
    { engagement_id: e1.id, name: 'Stakeholder-Analyse',     due: '2025-02-15', status: 'done',     sort_order: 1 },
    { engagement_id: e1.id, name: 'BVA Workshop',             due: '2025-03-20', status: 'done',     sort_order: 2 },
    { engagement_id: e1.id, name: 'Roadmap-Präsentation',     due: '2025-04-30', status: 'progress', sort_order: 3 },
    { engagement_id: e2.id, name: 'Change Impact Assessment', due: '2025-03-01', status: 'delayed',  sort_order: 1 },
    { engagement_id: e2.id, name: 'Kommunikationsplan',       due: '2025-04-15', status: 'progress', sort_order: 2 },
    { engagement_id: e3.id, name: 'Discovery Workshop',       due: '2025-02-10', status: 'done',     sort_order: 1 },
    { engagement_id: e3.id, name: 'Strategy Paper',           due: '2025-04-01', status: 'progress', sort_order: 2 },
    { engagement_id: e4.id, name: 'Kickoff',                  due: '2025-01-20', status: 'done',     sort_order: 1 },
    { engagement_id: e4.id, name: 'Pilotgruppe Q1',           due: '2025-03-31', status: 'delayed',  sort_order: 2 },
  ])
  // Index by sort+engagement for task references
  const m = {
    m1: milestones[0], m2: milestones[1], m3: milestones[2],
    m4: milestones[3], m5: milestones[4],
    m6: milestones[5], m7: milestones[6],
    m8: milestones[7], m9: milestones[8],
  }
 
  // ── 4. STAKEHOLDERS (customer-scoped) ────────────────────────
  console.log('\n── 4. Stakeholders (customer-scoped)')
 
  // DHL IT Services
  const dhlItsStakeholders = await insert('stakeholders', [
    { customer_id: dhlIts.id, name: 'Thomas Müller',   role: 'CIO DHL ITS',               type: 'person', color: '#4f8ef7', initials: 'TM' },
    { customer_id: dhlIts.id, name: 'Sandra Koch',     role: 'VP Operations',              type: 'person', color: '#22c55e', initials: 'SK' },
    { customer_id: dhlIts.id, name: 'Petra Hahn',      role: 'Works Council Lead',         type: 'person', color: '#f43f5e', initials: 'PH' },
    { customer_id: dhlIts.id, name: 'Betriebsrat DHL', role: 'Arbeitnehmervertreter',      type: 'group',  color: '#f59e0b', initials: 'BR', group_size: 12, speaker: 'Karl Steinberg' },
    { customer_id: dhlIts.id, name: 'Poweruser DHL',   role: 'Key User / Multiplikatoren', type: 'group',  color: '#a78bfa', initials: 'PU', group_size: 28, speaker: 'Kathrin Baum' },
    { customer_id: dhlIts.id, name: 'Anwender',        role: 'Endnutzer IT-Systeme',       type: 'group',  color: '#2dd4bf', initials: 'AN', group_size: 450 },
  ])
  const [shTM, shSK, shPH, shBR, shPU, shAN_its] = dhlItsStakeholders
 
  // DHL Express
  const dhlExpStakeholders = await insert('stakeholders', [
    { customer_id: dhlExp.id, name: 'Klaus Fischer',          role: 'COO Express',             type: 'person', color: '#4f8ef7', initials: 'KF' },
    { customer_id: dhlExp.id, name: 'Arbeitnehmervertreter',  role: 'Betriebsrat Express DE',  type: 'group',  color: '#f59e0b', initials: 'AV', group_size: 7, speaker: 'Martin Weck' },
    { customer_id: dhlExp.id, name: 'Regulierungsbehörde',    role: 'Compliance / Datenschutz',type: 'group',  color: '#fb923c', initials: 'RG', group_size: 3, speaker: 'DSB-Stelle' },
    { customer_id: dhlExp.id, name: 'Anwender',               role: 'Endnutzer Express-Ops',   type: 'group',  color: '#2dd4bf', initials: 'AN', group_size: 680 },
  ])
  const [shKF, shAV, shRG_exp, shAN_exp] = dhlExpStakeholders
 
  // BMW AG
  const bmwStakeholders = await insert('stakeholders', [
    { customer_id: bmwAg.id, name: 'Dr. Werner Albers', role: 'CDO BMW AG',         type: 'person', color: '#4f8ef7', initials: 'WA' },
    { customer_id: bmwAg.id, name: 'Ines Schmitt',      role: 'Head of AI',         type: 'person', color: '#22c55e', initials: 'IS' },
    { customer_id: bmwAg.id, name: 'Robert Klee',       role: 'CFO Office',         type: 'person', color: '#f59e0b', initials: 'RK' },
    { customer_id: bmwAg.id, name: 'Monika Wolf',       role: 'Legal & Compliance', type: 'person', color: '#f43f5e', initials: 'MW' },
  ])
  const [shWA, shIS, shRK, shMW] = bmwStakeholders
 
  // SAP SE
  const sapStakeholders = await insert('stakeholders', [
    { customer_id: sap.id, name: 'Karsten Brandt',    role: 'CPO SAP SE',        type: 'person', color: '#4f8ef7', initials: 'KB' },
    { customer_id: sap.id, name: 'Poweruser',         role: 'Key User SAP',      type: 'group',  color: '#a78bfa', initials: 'PU', group_size: 35 },
    { customer_id: sap.id, name: 'Regulierungsbehörde', role: 'Compliance / DSGVO', type: 'group', color: '#fb923c', initials: 'RG', group_size: 2 },
  ])
  const [shKB, shPU_sap, shRG_sap] = sapStakeholders
 
  // ── 5. INITIATIVE_STAKEHOLDERS (Bridge + Matrix-Positionen) ──
  console.log('\n── 5. initiative_stakeholders (Bridge)')
  await insert('initiative_stakeholders', [
    // e1 — BVA AI DHL ITS
    { engagement_id: e1.id, stakeholder_id: shTM.id,    pos_x: 0.80, pos_y: 0.10 },
    { engagement_id: e1.id, stakeholder_id: shSK.id,    pos_x: 0.65, pos_y: 0.30 },
    { engagement_id: e1.id, stakeholder_id: shBR.id,    pos_x: 0.15, pos_y: 0.20 },
    { engagement_id: e1.id, stakeholder_id: shPH.id,    pos_x: 0.10, pos_y: 0.25 },
    { engagement_id: e1.id, stakeholder_id: shPU.id,    pos_x: 0.55, pos_y: 0.70 },
    { engagement_id: e1.id, stakeholder_id: shAN_its.id, pos_x: 0.55, pos_y: 0.85 },
    // e2 — OCM Platform
    { engagement_id: e2.id, stakeholder_id: shKF.id,    pos_x: 0.75, pos_y: 0.15 },
    { engagement_id: e2.id, stakeholder_id: shAV.id,    pos_x: 0.20, pos_y: 0.25 },
    { engagement_id: e2.id, stakeholder_id: shRG_exp.id, pos_x: 0.10, pos_y: 0.15 },
    { engagement_id: e2.id, stakeholder_id: shAN_exp.id, pos_x: 0.50, pos_y: 0.75 },
    // e3 — AI Transformation BMW
    { engagement_id: e3.id, stakeholder_id: shWA.id,    pos_x: 0.85, pos_y: 0.10 },
    { engagement_id: e3.id, stakeholder_id: shIS.id,    pos_x: 0.75, pos_y: 0.25 },
    { engagement_id: e3.id, stakeholder_id: shRK.id,    pos_x: 0.70, pos_y: 0.30 },
    { engagement_id: e3.id, stakeholder_id: shMW.id,    pos_x: 0.15, pos_y: 0.30 },
    // e4 — AI Adoption SAP
    { engagement_id: e4.id, stakeholder_id: shKB.id,     pos_x: 0.80, pos_y: 0.10 },
    { engagement_id: e4.id, stakeholder_id: shPU_sap.id, pos_x: 0.60, pos_y: 0.55 },
    { engagement_id: e4.id, stakeholder_id: shRG_sap.id, pos_x: 0.10, pos_y: 0.15 },
    // e5 — Change Readiness Assessment
    { engagement_id: e5.id, stakeholder_id: shTM.id,    pos_x: 0.75, pos_y: 0.15 },
    { engagement_id: e5.id, stakeholder_id: shBR.id,    pos_x: 0.25, pos_y: 0.20 },
    { engagement_id: e5.id, stakeholder_id: shAN_its.id, pos_x: 0.45, pos_y: 0.80 },
  ])
 
  // ── 6. STAKEHOLDER_PROFILES (Verhaltens-Profil pro Initiative) ─
  console.log('\n── 6. stakeholder_profiles')
  await insert('stakeholder_profiles', [
    // e1
    { stakeholder_id: shTM.id, engagement_id: e1.id, power: 5, interest: '++', rel_to_consultant: 'Sponsor',    risk_flag: false, haltung: 'stark befürwortend', beschreibung: 'Auftraggeber und Budget-Owner. Treibt KI-Adoption strategisch.', gewinnt: 'Marktpositionierung als KI-Vorreiter.', verliert: 'Kurzfristig Ressourcen.', bedenken: 'Umsetzungsgeschwindigkeit.', strategy: 'Monatliches Steering-Update.' },
    { stakeholder_id: shSK.id, engagement_id: e1.id, power: 3, interest: '+',  rel_to_consultant: 'Champion',   risk_flag: false, haltung: 'befürwortend', beschreibung: 'Operativer Champion. Koordiniert Change-Aktivitäten.', gewinnt: 'Sichtbarkeit und Führungsrolle.', verliert: 'Bandbreite.', bedenken: 'Überbelastung des Teams.', strategy: 'Regelmäßige 1:1s, frühzeitige Einbindung.' },
    { stakeholder_id: shBR.id, engagement_id: e1.id, power: 5, interest: '-',  rel_to_consultant: 'Influencer', risk_flag: true,  haltung: 'skeptisch', beschreibung: 'Formelles Mitbestimmungsrecht. Blockiert bei fehlender Transparenz.', gewinnt: 'Mitbestimmungsrecht gewahrt.', verliert: 'Einfluss wenn KI-Entscheidungen automatisiert werden.', bedenken: 'Datenschutz, Überwachung.', strategy: 'Frühe Information, Betriebsvereinbarung parallel entwickeln.' },
    { stakeholder_id: shPH.id, engagement_id: e1.id, power: 4, interest: '-',  rel_to_consultant: 'Influencer', risk_flag: true,  haltung: 'ablehnend', beschreibung: 'BR-Vorsitzende. Formeller Einspruch möglich.', gewinnt: 'Stärkung BR-Position.', verliert: 'Kontrolle bei KI-Entscheidungen.', bedenken: 'DSGVO, Algorithmen-Transparenz.', strategy: 'Bilateral adressieren, Bedenken ernst nehmen.' },
    { stakeholder_id: shPU.id, engagement_id: e1.id, power: 2, interest: '++', rel_to_consultant: 'Champion',   risk_flag: false, haltung: 'befürwortend', beschreibung: 'Key-User als Multiplikatoren kritisch für Adoption.', gewinnt: 'Neue Kompetenzen.', verliert: 'Zeit durch Schulungsaufgaben.', bedenken: 'Überlastung.', strategy: 'Als Change Agents ausbilden.' },
    { stakeholder_id: shAN_its.id, engagement_id: e1.id, power: 1, interest: '+', rel_to_consultant: 'Champion', risk_flag: false, haltung: 'neutral-positiv', beschreibung: 'Endnutzer. Adoption entscheidet über Projekterfolg.', gewinnt: 'Bessere Tools.', verliert: 'Gewohnte Prozesse.', bedenken: 'Lernaufwand.', strategy: 'Kommunikation, Training, Quick-Wins zeigen.' },
    // e2
    { stakeholder_id: shKF.id,    engagement_id: e2.id, power: 5, interest: '+',  rel_to_consultant: 'Sponsor',    risk_flag: false, haltung: 'befürwortend', beschreibung: 'COO Express. Operativer Hauptverantwortlicher.', gewinnt: 'Effizienzgewinne.', verliert: '', bedenken: 'Rollout-Zeitplan.', strategy: 'Steering-Updates, Meilenstein-Reviews.' },
    { stakeholder_id: shAV.id,    engagement_id: e2.id, power: 3, interest: '0',  rel_to_consultant: 'Influencer', risk_flag: true,  haltung: 'neutral', beschreibung: 'Betriebsrat Express. Muss bei Datenschutz eingebunden werden.', gewinnt: 'Mitbestimmung.', verliert: '', bedenken: 'Datenschutz.', strategy: 'Anonymität sicherstellen.' },
    { stakeholder_id: shRG_exp.id, engagement_id: e2.id, power: 5, interest: '-', rel_to_consultant: 'Influencer', risk_flag: true,  haltung: 'formal', beschreibung: 'DSB mit formalem Stopp-Recht.', gewinnt: 'Ordnungsgemäße Dokumentation.', verliert: '', bedenken: 'DSGVO.', strategy: 'Compliance früh klären.' },
    { stakeholder_id: shAN_exp.id, engagement_id: e2.id, power: 1, interest: '+', rel_to_consultant: 'Champion',   risk_flag: false, haltung: 'neutral', beschreibung: 'Endnutzer Express-Ops.', gewinnt: 'Bessere Tools.', verliert: '', bedenken: 'Schulungsaufwand.', strategy: 'Training, Quick-Wins.' },
    // e3
    { stakeholder_id: shWA.id, engagement_id: e3.id, power: 5, interest: '++', rel_to_consultant: 'Sponsor',    risk_flag: false, haltung: 'stark befürwortend', beschreibung: 'CDO BMW. Hauptsponsor mit Vorstandsmandat.', gewinnt: 'Strategische Führungsrolle.', verliert: '', bedenken: 'Schnittstellenprobleme.', strategy: 'Monatliches Executive Update.' },
    { stakeholder_id: shIS.id, engagement_id: e3.id, power: 4, interest: '++', rel_to_consultant: 'Champion',   risk_flag: false, haltung: 'sehr befürwortend', beschreibung: 'Head of AI. Fachliche Treiberin.', gewinnt: 'Kompetenzen, Sichtbarkeit.', verliert: '', bedenken: 'Ressourcenverfügbarkeit.', strategy: 'Enge Zusammenarbeit, Co-Ownership.' },
    { stakeholder_id: shRK.id, engagement_id: e3.id, power: 4, interest: '-',  rel_to_consultant: 'Influencer', risk_flag: false, haltung: 'skeptisch-rational', beschreibung: 'CFO-Büro. Kann Budget stoppen.', gewinnt: 'ROI-Transparenz.', verliert: 'Budget-Spielraum.', bedenken: 'ROI und Payback-Zeit.', strategy: 'Business Case, CFO-Bilateral.' },
    { stakeholder_id: shMW.id, engagement_id: e3.id, power: 3, interest: '--', rel_to_consultant: 'Influencer', risk_flag: true,  haltung: 'ablehnend', beschreibung: 'Legal & Compliance. Veto-Potenzial.', gewinnt: 'Ordnungsgemäße Dokumentation.', verliert: '', bedenken: 'Regulatorische Risiken.', strategy: 'Legal frühzeitig einbinden.' },
    // e4
    { stakeholder_id: shKB.id,     engagement_id: e4.id, power: 5, interest: '++', rel_to_consultant: 'Sponsor',  risk_flag: false, haltung: 'stark befürwortend', beschreibung: 'CPO. Budget-Owner. Treibt KI-Adoption.', gewinnt: 'Marktpositionierung.', verliert: '', bedenken: 'Qualität der Umsetzung.', strategy: 'Monatliches Steering-Update.' },
    { stakeholder_id: shPU_sap.id, engagement_id: e4.id, power: 2, interest: '++', rel_to_consultant: 'Champion', risk_flag: false, haltung: 'befürwortend', beschreibung: 'Key-User. Als Multiplikatoren kritisch.', gewinnt: 'Neue Kompetenzen.', verliert: '', bedenken: 'Überlastung.', strategy: 'Als Change Agents ausbilden.' },
    { stakeholder_id: shRG_sap.id, engagement_id: e4.id, power: 5, interest: '-',  rel_to_consultant: 'Influencer', risk_flag: true, haltung: 'formal', beschreibung: 'DSB mit Stopp-Recht.', gewinnt: '', verliert: '', bedenken: 'DSGVO.', strategy: 'Compliance früh klären.' },
    // e5
    { stakeholder_id: shTM.id, engagement_id: e5.id, power: 5, interest: '+',  rel_to_consultant: 'Sponsor',    risk_flag: false, haltung: 'befürwortend', beschreibung: 'Auftraggeber des Assessments.', gewinnt: 'Entscheidungsgrundlage.', verliert: '', bedenken: 'Niedrige Beteiligungsquote.', strategy: 'Sichtbares Sponsoring kommunizieren.' },
    { stakeholder_id: shBR.id, engagement_id: e5.id, power: 5, interest: '0',  rel_to_consultant: 'Influencer', risk_flag: false, haltung: 'neutral', beschreibung: 'Muss bei datenbezogenen Erhebungen eingebunden werden.', gewinnt: 'Mitbestimmung.', verliert: '', bedenken: 'Datenschutz.', strategy: 'Anonymität des Surveys sicherstellen.' },
    { stakeholder_id: shAN_its.id, engagement_id: e5.id, power: 1, interest: '0', rel_to_consultant: 'Champion', risk_flag: false, haltung: 'neutral', beschreibung: 'Survey-Teilnehmende.', gewinnt: 'Gehört werden.', verliert: 'Zeit.', bedenken: 'Anonymität.', strategy: 'Nutzwert kommunizieren, kurzer Survey.' },
  ])
 
  // ── 7. STAKEHOLDER_RELATIONSHIPS ─────────────────────────────
  console.log('\n── 7. stakeholder_relationships')
  await insert('stakeholder_relationships', [
    // e1
    { engagement_id: e1.id, from_id: shTM.id, to_id: shSK.id,    type: 'Sponsor',       strength: 4, notes: 'TM hat SK aktiv als Champion nominiert.' },
    { engagement_id: e1.id, from_id: shBR.id, to_id: shPH.id,    type: 'Berichtslinie', strength: 5, notes: 'PH ist BR-Vertreterin, direkte Linie.' },
    { engagement_id: e1.id, from_id: shPH.id, to_id: shTM.id,    type: 'Blocker',       strength: 3, notes: 'PH blockiert KI-Projekte via formellen BR-Einwand.' },
    { engagement_id: e1.id, from_id: shSK.id, to_id: shAN_its.id, type: 'Champion',     strength: 4, notes: 'SK motiviert ihr Team aktiv zur Adoption.' },
    { engagement_id: e1.id, from_id: shPU.id, to_id: shAN_its.id, type: 'Influencer',   strength: 3, notes: 'Key-User fungieren als Multiplikatoren.' },
    { engagement_id: e1.id, from_id: shTM.id, to_id: shBR.id,    type: 'Sponsor',       strength: 2, notes: 'TM versucht Vertrauen aufzubauen, bisher distanziert.' },
    // e2
    { engagement_id: e2.id, from_id: shKF.id,     to_id: shAV.id,     type: 'Sponsor',    strength: 3, notes: 'KF hat AV formell eingebunden.' },
    { engagement_id: e2.id, from_id: shAV.id,     to_id: shRG_exp.id, type: 'Influencer', strength: 2, notes: 'AV koordiniert DSGVO-Anforderungen mit DSB.' },
    { engagement_id: e2.id, from_id: shAN_exp.id, to_id: shAV.id,     type: 'Berichtslinie', strength: 4, notes: 'Anwender eskalieren Bedenken via Betriebsrat.' },
    // e3
    { engagement_id: e3.id, from_id: shWA.id, to_id: shIS.id, type: 'Sponsor',    strength: 5, notes: 'WA ist direkter Auftraggeber von IS.' },
    { engagement_id: e3.id, from_id: shMW.id, to_id: shWA.id, type: 'Blocker',    strength: 3, notes: 'MW blockiert via Legal-Veto.' },
    { engagement_id: e3.id, from_id: shRK.id, to_id: shWA.id, type: 'Influencer', strength: 3, notes: 'RK kann Budget stoppen.' },
    { engagement_id: e3.id, from_id: shIS.id, to_id: shRK.id, type: 'Peer',       strength: 2, notes: 'Peer-Abstimmung ROI vs. Innovation.' },
  ])
 
  // ── 8. TASKS (Maßnahmen) ──────────────────────────────────────
  console.log('\n── 8. tasks (Maßnahmen)')
  const tasks = await insert('tasks', [
    { engagement_id: e1.id, milestone_id: m.m3.id, title: 'Executive Summary ausarbeiten',     status: 'In Progress', category: 'Kommunikation', due: '2025-04-20', owner_user_id: USER_ID, beschreibung: 'Managementtaugliche Zusammenfassung der BVA-Ergebnisse für das Steerco-Meeting.', ziel: 'Sponsor-Commitment sichern und Budgetfreigabe für Phase 2 erwirken.', sort_order: 1 },
    { engagement_id: e1.id, milestone_id: m.m3.id, title: 'ROI-Kalkulation finalisieren',      status: 'Review',      category: 'Sponsoring',    due: '2025-04-18', owner_user_id: USER_ID, beschreibung: 'Business-Case-Kalkulation mit Finance-Team abschließen. Baseline-Kosten validieren.', ziel: 'Belastbare ROI-Grundlage für CFO-Präsentation.', sort_order: 2 },
    { engagement_id: e1.id, milestone_id: m.m3.id, title: 'Betriebsrat informieren',           status: 'Backlog',     category: 'Kommunikation', due: '2025-05-05', owner_user_id: USER_ID, beschreibung: 'Formale Informationsrunde mit dem Betriebsrat zur KI-Initiative.', ziel: 'Betriebsrat ist informiert und blockiert nicht.', sort_order: 3 },
    { engagement_id: e1.id, milestone_id: m.m3.id, title: 'Feedback-Runde Poweruser',          status: 'Backlog',     category: 'Sounding',      due: '2025-04-28', owner_user_id: USER_ID, beschreibung: 'Strukturierte Feedback-Session mit 8 ausgewählten Powerusern zum Prototyp.', ziel: 'Poweruser als Champions aktivieren.', sort_order: 4 },
    { engagement_id: e2.id, milestone_id: m.m5.id, title: 'Stakeholder-Interviews durchführen', status: 'In Progress', category: 'Sounding',     due: '2025-04-25', owner_user_id: USER_ID, beschreibung: '12 leitfadengestützte Interviews mit Schlüssel-Stakeholdern aus Operations und BR.', ziel: 'Change-Impact vollständig verstehen.', sort_order: 1 },
    { engagement_id: e2.id, milestone_id: m.m5.id, title: 'Impact-Matrix befüllen',            status: 'Backlog',     category: 'Erwartung',     due: '2025-05-01', owner_user_id: USER_ID, beschreibung: 'Strukturierte Erfassung aller Change-Impacts pro Benutzergruppe.', ziel: 'Vollständiges Bild der Betroffenheit.', sort_order: 2 },
    { engagement_id: e2.id, milestone_id: m.m5.id, title: 'Trainingskonzept erstellen',        status: 'Backlog',     category: 'Enablement',    due: '2025-05-15', owner_user_id: USER_ID, beschreibung: 'Modulares Trainingskonzept für 680 Anwendende entwickeln.', ziel: 'Alle Nutzenden sind zum Go-Live-Datum kompetent.', sort_order: 3 },
    { engagement_id: e3.id, milestone_id: m.m7.id, title: 'Competitive Landscape analysieren', status: 'Done',        category: 'Reporting',     due: '2025-03-30', owner_user_id: USER_ID, beschreibung: 'Analyse der KI-Strategien von Tesla, BYD und deutschen OEMs.', ziel: 'Differenzierungspotenziale ableiten.', sort_order: 1 },
    { engagement_id: e3.id, milestone_id: m.m7.id, title: 'Use-Case-Katalog erstellen',        status: 'In Progress', category: 'Erwartung',     due: '2025-04-22', owner_user_id: USER_ID, beschreibung: 'Strukturierte Sammlung und Priorisierung von 30+ KI-Use-Cases.', ziel: 'Priorisierter Umsetzungsfahrplan für KI-Piloten Q3.', sort_order: 2 },
    { engagement_id: e3.id, milestone_id: m.m7.id, title: 'CFO-Alignment Meeting',             status: 'In Progress', category: 'Sponsoring',    due: '2025-04-15', owner_user_id: USER_ID, beschreibung: 'Bilaterales Gespräch mit CFO-Büro zur Absicherung der Budgetlinie.', ziel: 'CFO-Büro ist passiver Unterstützer.', sort_order: 3 },
    { engagement_id: e4.id, milestone_id: m.m9.id, title: 'Pilotgruppe-Onboarding vorbereiten', status: 'Review',     category: 'Enablement',    due: '2025-04-10', owner_user_id: USER_ID, beschreibung: 'Onboarding-Materialien für die 28-köpfige Pilotgruppe vorbereiten.', ziel: 'Pilotgruppe ist ab Tag 1 handlungsfähig.', sort_order: 1 },
    { engagement_id: e4.id, milestone_id: m.m9.id, title: 'Anforderungskatalog abstimmen',     status: 'Backlog',     category: 'Erwartung',     due: '2025-04-28', owner_user_id: USER_ID, beschreibung: 'Anforderungen mit Datenschutzbeauftragten und Compliance-Team abstimmen.', ziel: 'Rechtssicherer Rollout ohne Compliance-Blockaden.', sort_order: 2 },
  ])
 
  // task_stakeholders (m:n)
  console.log('\n── 8b. task_stakeholders')
  const taskMap = tasks.reduce((acc: any, t: any, i: number) => { acc[i] = t; return acc }, {})
  await insert('task_stakeholders', [
    { task_id: taskMap[0].id, stakeholder_id: shTM.id,     role_in_task: 'Owner' },
    { task_id: taskMap[0].id, stakeholder_id: shSK.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[1].id, stakeholder_id: shTM.id,     role_in_task: 'Informed' },
    { task_id: taskMap[2].id, stakeholder_id: shBR.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[2].id, stakeholder_id: shPH.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[3].id, stakeholder_id: shPU.id,     role_in_task: 'Owner' },
    { task_id: taskMap[4].id, stakeholder_id: shAV.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[4].id, stakeholder_id: shAN_exp.id, role_in_task: 'Consulted' },
    { task_id: taskMap[4].id, stakeholder_id: shKF.id,     role_in_task: 'Informed' },
    { task_id: taskMap[7].id, stakeholder_id: shWA.id,     role_in_task: 'Informed' },
    { task_id: taskMap[7].id, stakeholder_id: shIS.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[8].id, stakeholder_id: shIS.id,     role_in_task: 'Owner' },
    { task_id: taskMap[8].id, stakeholder_id: shWA.id,     role_in_task: 'Informed' },
    { task_id: taskMap[8].id, stakeholder_id: shRK.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[9].id, stakeholder_id: shRK.id,     role_in_task: 'Consulted' },
    { task_id: taskMap[10].id, stakeholder_id: shPU_sap.id, role_in_task: 'Consulted' },
    { task_id: taskMap[11].id, stakeholder_id: shRG_sap.id, role_in_task: 'Consulted' },
  ])
 
  // ── 9. CANVAS_DATA + PHASES + KPIS ───────────────────────────
  console.log('\n── 9. canvas_data')
  const canvases = await insert('canvas_data', [
    {
      engagement_id: e1.id,
      ausgangslage: 'DHL ITS betreibt über 200 Applikationen mit stark fragmentiertem Tool-Stack. Manuelle Prozesse in Finance, HR und Logistik verursachen jährlich geschätzte €12–18 Mio. ineffiziente Arbeitszeit.',
      strategischer_kontext: 'DHL Group Digitalstrategie 2025 sieht KI-Enablement aller Kernfunktionen vor. IT-Budget für KI wurde 2024 um 40% erhöht.',
      treiber: 'SAP S/4HANA-Migration (Deadline Q4 2025) erzwingt Prozessüberprüfung. Wettbewerber (FedEx, UPS) haben KI-Adoption bereits vollzogen.',
      risiken_bei_nicht_handeln: 'Ohne aktives Change Management drohen Adoption-Raten unter 30%. Widerstand des Betriebsrats kann Timelines um 6–12 Monate verzögern.',
      ziele_org:       ['Reduktion manueller Prozesskosten um 20–25% bis Ende 2026', 'DHL ITS als KI-Vorreiter innerhalb der DHL Group positionieren', 'Time-to-Decision um 40% senken'],
      ziele_funktional:['Finance: Automatisierung von 60% der Reporting-Routinen', 'HR: KI-gestütztes Candidate Screening', 'IT Operations: Predictive Maintenance'],
      ziele_people:    ['Alle 450 Anwender können KI-Tools eigenständig nutzen', 'Führungskräfte treiben Adoption aktiv voran', 'Bedenken zu Jobsicherheit adressiert'],
      ziele_tech:      ['Nahtlose Integration KI-Layer in bestehende SAP-Landschaft', 'Single Sign-On für alle KI-Applikationen bis Q2 2025', 'DSGVO-Compliance vollständig gewährleistet'],
      start_date: '2025-01', end_date: '2025-06',
      erfolg_narrativ: 'Die Initiative gilt als erfolgreich, wenn Mitarbeitende die neuen KI-Tools nicht als Bedrohung, sondern als echten Arbeitsassistenten erleben.',
    },
    {
      engagement_id: e2.id,
      ausgangslage: 'DHL Express DACH nutzt 12 verschiedene Systeme ohne zentrale Datenbasis. Fehlerrate im Sendungs-Tracking liegt bei 3,2%, Ziel ist <0,5%.',
      strategischer_kontext: 'Express-Strategie „First Choice" erfordert digitale Plattform als Backbone. ServiceNow als konzernweiter Standard festgelegt.',
      treiber: 'Vertragliche Deadline mit Großkunden (Q3 2025). EU-Lieferkettensorgfaltspflichten erfordern lückenlose Dokumentation.',
      risiken_bei_nicht_handeln: 'Datenmigration aus Legacy-Systemen ist technisch kritisch. Regulatorische Nicht-Compliance kann Bußgelder bis €5 Mio. auslösen.',
      ziele_org:       ['Einheitliche Datenbasis für alle DACH-Operations bis Q3 2025', 'Service-Fehlerrate von 3,2% auf <0,5% reduzieren', 'Basis für europaweiten Rollout schaffen'],
      ziele_funktional:['Operations: Real-time Sendungs-Tracking ohne Medienbrüche', 'Customer Service: Single Source of Truth', 'Compliance: Automatisierte Lieferketten-Dokumentation'],
      ziele_people:    ['680 Mitarbeitende trainiert und sicher', 'Customer Service Teams können eigenständig reporten', 'Führungskräfte nutzen Dashboards aktiv'],
      ziele_tech:      ['ServiceNow als Single Platform', 'API-Integration zu 12 Legacy-Systemen', 'DSGVO-konforme Datenhaltung'],
      start_date: '2025-02', end_date: '2025-09',
      erfolg_narrativ: 'Erfolg bedeutet, dass Operations-Teams die neue Plattform als echte Arbeitserleichterung wahrnehmen — nicht als Kontroll-Instrument.',
    },
    {
      engagement_id: e3.id,
      ausgangslage: 'BMW AG steht vor tiefgreifendstem Wandel seit Jahrzehnten. 65% der Führungskräfte fühlen sich auf KI-Ära nicht vorbereitet (intern Survey 2024).',
      strategischer_kontext: 'BMW Strategie "New Class" definiert KI als Kernkompetenz bis 2027. CDO Dr. Albers hat direktes Mandat des Vorstands.',
      treiber: 'Tesla und chinesische OEMs demonstrieren Geschwindigkeit von Software-first. EU AI Act erfordert Governance-Framework bis 2026.',
      risiken_bei_nicht_handeln: 'Kulturwandel scheitert in 70% der Fälle wenn Top-Management nicht sichtbar vorangeht. Zu viele parallele Initiativen erzeugen Change-Fatigue.',
      ziele_org:       ['BMW AI Governance Framework bis Q2 2026 implementiert', 'Top-100-Führungskräfte sind KI-kompetent', 'Time-to-Market für KI-Features um 35% beschleunigt'],
      ziele_funktional:['F&E: Generative Design im Standardprozess', 'HR: AI-Recruiting als Standard', 'Legal/Compliance: AI Governance Framework operativ'],
      ziele_people:    ['Keine ungewollten Kündigungen wegen KI-Angst', 'Alle Mitarbeitenden verstehen "KI arbeitet für mich"', 'Führungskräfte gehen als Rollenmodell voran'],
      ziele_tech:      ['Einheitliche AI-Plattform als Standard', 'DataMesh-Architektur für KI-fähige Datenprodukte', 'AI-Ethics-Governance-Tool deployed'],
      start_date: '2025-01', end_date: '2025-12',
      erfolg_narrativ: 'Erfolgreich wenn nicht mehr über "ob KI" diskutiert wird, sondern nur noch über "wie KI".',
    },
    {
      engagement_id: e5.id,
      ausgangslage: 'DHL ITS hat keine systematische Datenbasis zur Wandlungsbereitschaft. Historische Initiativen zeigen Muster von late-stage Widerstand ohne frühzeitige Warnsignale.',
      strategischer_kontext: 'Assessment als Grundlage für alle weiteren OCM-Investitionen in 2025–2026.',
      treiber: 'BVA AI Initiative (e1) erfordert verlässliche Readiness-Basis. Geschäftsführung fordert evidenzbasierte OCM-Steuerung.',
      risiken_bei_nicht_handeln: 'Ohne Baseline keine Möglichkeit zur gezielten Intervention. Ressourcen fließen in falsche Maßnahmen.',
      ziele_org:       ['Evidenzbasierte Entscheidungsgrundlage für OCM-Investitionen', 'Systematisches Frühwarnsystem für Change-Risiken'],
      ziele_funktional:['Quantitative Readiness-Scores für alle 12 DHL ITS Bereiche', 'Qualitative Interviews mit 25 Schlüssel-Stakeholdern', 'Abgeleiteter Maßnahmenplan'],
      ziele_people:    ['Führungskräfte erhalten konkretes Feedback', 'Mitarbeitende fühlen sich wertgeschätzt', 'Ängste frühzeitig identifiziert'],
      ziele_tech:      ['Digitales Survey-Tool für skalierbare Erhebung', 'Analyse-Dashboard für Echtzeit-Auswertung'],
      start_date: '2025-04', end_date: '2025-07',
      erfolg_narrativ: 'Das Assessment ist erfolgreich wenn DHL ITS eine fundierte, datenbasierte Entscheidungsgrundlage für alle weiteren OCM-Investitionen erhält.',
    },
  ])
  const [cv1, cv2, cv3, cv5] = canvases
 
  // Canvas Phases
  console.log('\n── 9b. canvas_phases')
  await insert('canvas_phases', [
    { canvas_id: cv1.id, title: 'Diagnose & Stakeholder-Alignment',  start_date: '2025-01', end_date: '2025-02', dates_label: 'Jan – Feb 2025', color: '#4f8ef7', description: 'Stakeholder-Analyse abschließen, Change-Readiness-Baseline erheben, Betriebsrat einbinden.', goal: 'Alle Schlüssel-Stakeholder informiert, Fahrplan abgestimmt.', sort_order: 1 },
    { canvas_id: cv1.id, title: 'Kommunikation & Early Engagement',  start_date: '2025-02', end_date: '2025-04', dates_label: 'Feb – Apr 2025', color: '#a78bfa', description: 'Change-Story entwickeln, First-Mover-Gruppe aufbauen, Widerstandsquellen adressieren.', goal: 'Mindestens 50 Mitarbeitende aktiv eingebunden, BR-Verhandlung.', sort_order: 2 },
    { canvas_id: cv1.id, title: 'Rollout & Enablement',              start_date: '2025-04', end_date: '2025-06', dates_label: 'Apr – Jun 2025', color: '#22c55e', description: 'Trainings durchführen, Go-Live begleiten, Quick Wins kommunizieren.', goal: 'Adoption Rate ≥ 60%, Change Readiness Score ≥ 3,5.', sort_order: 3 },
    { canvas_id: cv2.id, title: 'Impact Assessment & Planung',       start_date: '2025-02', end_date: '2025-03', dates_label: 'Feb – Mär 2025', color: '#f43f5e', description: 'Change-Impact-Assessment für alle betroffenen Teams, Betriebsrat-Einbindung starten.', goal: 'Vollständiges Change-Impact-Bild, Betriebsrat informiert.', sort_order: 1 },
    { canvas_id: cv2.id, title: 'Kommunikation & Mobilisierung',     start_date: '2025-04', end_date: '2025-05', dates_label: 'Apr – Mai 2025', color: '#4f8ef7', description: 'Kommunikationsplan umsetzen, Betriebsvereinbarung abschließen.', goal: 'BV unterzeichnet, Trainings starten.', sort_order: 2 },
    { canvas_id: cv2.id, title: 'Training & Go-Live',                start_date: '2025-06', end_date: '2025-07', dates_label: 'Jun – Jul 2025', color: '#22c55e', description: 'Flächendeckende Trainings (680 Personen), begleitetes Go-Live, Hypercare.', goal: 'Go-Live ohne kritische Unterbrechungen, Adoption ≥ 70%.', sort_order: 3 },
    { canvas_id: cv2.id, title: 'Stabilisierung & Optimierung',      start_date: '2025-08', end_date: '2025-09', dates_label: 'Aug – Sep 2025', color: '#a78bfa', description: 'Fehler-Nacharbeitung, Advanced Features, Lessons Learned für EU-Rollout.', goal: 'Fehlerrate <1%, Plattform stabil, EU-Blueprint fertig.', sort_order: 4 },
    { canvas_id: cv3.id, title: 'Diagnose & Governance-Design',      start_date: '2025-01', end_date: '2025-03', dates_label: 'Jan – Mär 2025', color: '#4f8ef7', description: 'Use-Case-Inventur, AI Governance Framework entwerfen, Piloten auswählen.', goal: 'Framework-Entwurf abgestimmt, 3 Piloten definiert.', sort_order: 1 },
    { canvas_id: cv3.id, title: 'Führungskräfte-Programm & Piloten', start_date: '2025-04', end_date: '2025-08', dates_label: 'Apr – Aug 2025', color: '#a78bfa', description: 'AI-Governance-Framework entwickeln, 3 Piloten starten, Führungskräfte-Programm.', goal: 'Framework verabschiedet, Piloten gestartet, 20 Führungskräfte geschult.', sort_order: 2 },
    { canvas_id: cv3.id, title: 'Skalierung & Kulturverankerung',    start_date: '2025-09', end_date: '2025-12', dates_label: 'Sep – Dez 2025', color: '#22c55e', description: 'Erfolgreiche Use Cases skalieren, KI-Communities starten, Employer Branding.', goal: '≥ 70% Führungskräfte aktiv, 5+ skalierte Use Cases.', sort_order: 3 },
    { canvas_id: cv5.id, title: 'Vorbereitung & Design',             start_date: '2025-04', end_date: '2025-04', dates_label: 'Apr 2025',      color: '#4f8ef7', description: 'Survey-Design, Interviewleitfaden, Stakeholder-Liste, Tool-Setup.', goal: 'Assessment-Konzept abgestimmt und freigegeben.', sort_order: 1 },
    { canvas_id: cv5.id, title: 'Erhebung',                          start_date: '2025-05', end_date: '2025-06', dates_label: 'Mai – Jun 2025', color: '#a78bfa', description: 'Online-Survey ausrollen, 25 qualitative Interviews durchführen.', goal: 'Rücklauf ≥ 75%, alle Interviews abgeschlossen.', sort_order: 2 },
    { canvas_id: cv5.id, title: 'Analyse & Reporting',               start_date: '2025-07', end_date: '2025-07', dates_label: 'Jul 2025',      color: '#22c55e', description: 'Datenanalyse, Readiness-Profile erstellen, Maßnahmen ableiten, Management-Report.', goal: 'Abschlussbericht und Maßnahmenplan freigegeben.', sort_order: 3 },
  ])
 
  // Canvas KPIs
  console.log('\n── 9c. canvas_kpis')
  await insert('canvas_kpis', [
    { canvas_id: cv1.id, name: 'Tool-Adoption Rate',         sub: 'Aktive Nutzer / Gesamt-Zielgruppe',          baseline: '0%',    target_value: '≥ 75%',             methode: 'Analytics-Dashboard',         ampel: 'yellow', sort_order: 1 },
    { canvas_id: cv1.id, name: 'Change Readiness Score',     sub: 'Survey alle 6 Wochen (Skala 1–5)',           baseline: '2,8',   target_value: '≥ 4,0',             methode: 'Puls-Survey',                 ampel: 'yellow', sort_order: 2 },
    { canvas_id: cv1.id, name: 'Sponsor Engagement',         sub: 'Aktive Teilnahme an Steerco',                baseline: 'Passiv',target_value: 'Aktiv champion',     methode: 'Qual. Assessment / QBR',     ampel: 'green',  sort_order: 3 },
    { canvas_id: cv1.id, name: 'Betriebsrat-Zustimmung',     sub: 'Formelle Betriebsvereinbarung unterzeichnet',baseline: 'Offen', target_value: 'Unterzeichnet Q3',  methode: 'Meilenstein-Tracking',        ampel: 'red',    sort_order: 4 },
    { canvas_id: cv1.id, name: 'Prozesskosten-Reduktion',    sub: 'Einsparung in Ziel-Prozessen (€)',           baseline: '€0',    target_value: '€2–3 Mio./Jahr',   methode: 'Finance-Controlling',         ampel: 'gray',   sort_order: 5 },
    { canvas_id: cv2.id, name: 'System-Adoption Operations', sub: 'Tägl. aktive Nutzer / Gesamt',              baseline: '0%',    target_value: '≥ 85%',             methode: 'Analytics-Dashboard',         ampel: 'yellow', sort_order: 1 },
    { canvas_id: cv2.id, name: 'Service-Fehlerrate',         sub: 'Fehler im Sendungs-Tracking',               baseline: '3,2%',  target_value: '< 0,5%',            methode: 'Beobachtung',                 ampel: 'red',    sort_order: 2 },
    { canvas_id: cv2.id, name: 'Training Completion',        sub: 'Abgeschlossene Trainings / Zielgruppe',     baseline: '0%',    target_value: '100% vor Go-Live',  methode: 'LMS-Tracking',                ampel: 'yellow', sort_order: 3 },
    { canvas_id: cv2.id, name: 'Betriebsvereinbarung',       sub: 'Unterzeichnet vor Go-Live',                 baseline: 'Entwurf',target_value: 'Unterzeichnet Mai', methode: 'Meilenstein-Tracking',        ampel: 'yellow', sort_order: 4 },
    { canvas_id: cv2.id, name: 'Kundenzufriedenheit (NPS)',  sub: 'Betroffene Großkunden',                     baseline: '+12',   target_value: '+35',               methode: 'NPS-Survey',                  ampel: 'gray',   sort_order: 5 },
    { canvas_id: cv3.id, name: 'KI-Kompetenz Führungskräfte', sub: '% geschulte FKs (Top 100)',               baseline: '15%',   target_value: '≥ 80%',             methode: 'LMS-Tracking',                ampel: 'yellow', sort_order: 1 },
    { canvas_id: cv3.id, name: 'Employee Sentiment KI',      sub: 'Positiv / Neutral / Negativ',              baseline: '30% positiv', target_value: '≥ 70% positiv', methode: 'Puls-Survey',                ampel: 'red',    sort_order: 2 },
    { canvas_id: cv3.id, name: 'Aktive KI-Use-Cases',        sub: 'Produktiv laufende Use Cases',             baseline: '0',     target_value: '≥ 5',               methode: 'Analytics-Dashboard',         ampel: 'yellow', sort_order: 3 },
    { canvas_id: cv5.id, name: 'Survey-Rücklaufquote',       sub: 'Teilnehmende / Gesamt-Zielgruppe',         baseline: '0%',    target_value: '≥ 75%',             methode: 'Analytics-Dashboard',         ampel: 'gray',   sort_order: 1 },
    { canvas_id: cv5.id, name: 'Readiness-Score Gesamt',     sub: 'Aggregierter Score (Skala 1–5)',           baseline: 'n/a',   target_value: '≥ 3,5',             methode: 'Beobachtung',                 ampel: 'gray',   sort_order: 2 },
    { canvas_id: cv5.id, name: 'Maßnahmen abgeleitet',       sub: 'Priorisierte Handlungsempfehlungen',       baseline: '0',     target_value: '≥ 15',              methode: 'Interview',                   ampel: 'gray',   sort_order: 3 },
  ])
 
  // ── 10. STRATEGY GOALS (DHL) ──────────────────────────────────
  console.log('\n── 10. strategy_goals (DHL)')
  const [sg1, sg2, sg3] = await insert('strategy_goals', [
    { org_id: ORG_ID, customer_id: dhl.id, type: 'strategic', title: 'Digitale Betriebsplattform', description: 'Konsolidierung auf ServiceNow als Rückgrat.', owner: 'Thomas Müller', color: '#4f8ef7', sort_order: 1 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'strategic', title: 'KI-gestützte Entscheidungen', description: 'KI als Standard-Tool für operative Entscheidungen.', owner: 'Thomas Müller', color: '#a78bfa', sort_order: 2 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'strategic', title: 'Wandelbereitschaft & Kompetenz', description: 'Lernende Organisation als Wettbewerbsvorteil.', owner: 'HR Leadership', color: '#22c55e', sort_order: 3 },
  ])
  const [sf1, sf2, sf3, sf4] = await insert('strategy_goals', [
    { org_id: ORG_ID, customer_id: dhl.id, type: 'functional', title: 'Einheitliches Sendungs-Tracking', description: 'Real-time Sichtbarkeit ohne Medienbrüche.', owner: 'VP Operations', color: '#4f8ef7', sort_order: 1 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'functional', title: 'Compliance-Dokumentation automatisiert', description: 'DSGVO-konforme Lieferkettendokumentation.', owner: 'Legal', color: '#4f8ef7', sort_order: 2 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'functional', title: 'Predictive Operations Analytics', description: 'Vorhersage von Engpässen und Qualitätsproblemen.', owner: 'Data Team', color: '#a78bfa', sort_order: 3 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'functional', title: 'Change Readiness als Kernkompetenz', description: 'Systematische Messung von Wandlungsfähigkeit.', owner: 'HR', color: '#22c55e', sort_order: 4 },
  ])
  const [so1, so2, so3, so4] = await insert('strategy_goals', [
    { org_id: ORG_ID, customer_id: dhl.id, type: 'operational', title: 'Trainingsquote ≥ 85 % vor Go-Live', description: '680 Mitarbeitende trainiert bis Juni 2025.', owner: 'Change Team', color: '#4f8ef7', sort_order: 1 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'operational', title: 'Fehlerrate Tracking < 0,5 %', description: 'Von 3,2 % auf unter 0,5 % reduzieren.', owner: 'QA', color: '#4f8ef7', sort_order: 2 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'operational', title: 'AI Adoption Rate ≥ 70 %', description: 'Aktive Nutzung KI-Tools durch Führungskräfte.', owner: 'Change Team', color: '#a78bfa', sort_order: 3 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'operational', title: 'Change Readiness Score ≥ 3,5/5', description: 'Basiswert aus Assessment Q1 2025.', owner: 'HR', color: '#22c55e', sort_order: 4 },
  ])
  const [si1, si2, si3] = await insert('strategy_goals', [
    { org_id: ORG_ID, customer_id: dhl.id, type: 'program', title: 'OCM Platform-Rollout', description: 'ServiceNow als Single Platform für Operations-Steuerung.', owner: 'J. Rohr', color: '#22c55e', engagement_id: e2.id, sort_order: 1 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'program', title: 'BVA AI DHL ITS', description: 'KI-gestützte Business Value Analyse für DHL ITS.', owner: 'J. Rohr', color: '#22c55e', engagement_id: e1.id, sort_order: 2 },
    { org_id: ORG_ID, customer_id: dhl.id, type: 'program', title: 'Change Readiness Assessment', description: 'Baseline-Messung Wandlungsbereitschaft DACH.', owner: 'J. Rohr', color: '#22c55e', engagement_id: e5.id, sort_order: 3 },
  ])
 
  // Strategy Goal Parents (Hierarchie)
  console.log('\n── 10b. strategy_goal_parents')
  await insert('strategy_goal_parents', [
    { child_id: sf1.id, parent_id: sg1.id },
    { child_id: sf2.id, parent_id: sg1.id },
    { child_id: sf3.id, parent_id: sg2.id },
    { child_id: sf4.id, parent_id: sg3.id },
    { child_id: so1.id, parent_id: sf1.id },
    { child_id: so2.id, parent_id: sf1.id },
    { child_id: so2.id, parent_id: sf2.id },
    { child_id: so3.id, parent_id: sf3.id },
    { child_id: so4.id, parent_id: sf4.id },
    { child_id: si1.id, parent_id: so1.id },
    { child_id: si1.id, parent_id: so2.id },
    { child_id: si2.id, parent_id: so3.id },
    { child_id: si3.id, parent_id: so4.id },
  ])
 
  // Key Results
  console.log('\n── 10c. key_results')
  await insert('key_results', [
    { goal_id: sg1.id, text: 'Fehlerrate Tracking',      current_value: '3,2 %',    target_value: '< 0,5 %',         sort_order: 1 },
    { goal_id: sg1.id, text: 'Systemkonsolidierung',     current_value: '12 Systeme', target_value: '12 → 1 Platform', sort_order: 2 },
    { goal_id: sg2.id, text: 'AI Adoption Rate',         current_value: '12 %',     target_value: '≥ 70 %',          sort_order: 1 },
    { goal_id: sg2.id, text: 'KI-Kernprozesse',         current_value: '0',        target_value: '≥ 5',             sort_order: 2 },
    { goal_id: sg3.id, text: 'Change Readiness Score',   current_value: '—',        target_value: '≥ 3,5 / 5',      sort_order: 1 },
    { goal_id: sg3.id, text: 'Trainingsquote',          current_value: '0 %',      target_value: '100 %',           sort_order: 2 },
    { goal_id: si1.id, text: 'Go-Live-Termin',          current_value: 'In Plan',  target_value: 'Jul 2025',        sort_order: 1 },
    { goal_id: si1.id, text: 'Kritische Meilensteine',  current_value: '1 / 4',   target_value: '4 / 4',           sort_order: 2 },
    { goal_id: si2.id, text: 'Stakeholder-Akzeptanz',   current_value: '62 %',     target_value: '≥ 80 %',          sort_order: 1 },
    { goal_id: si3.id, text: 'Survey-Rücklaufquote',    current_value: '—',        target_value: '≥ 80 %',          sort_order: 1 },
  ])
 
  console.log('\n✅ Seed abgeschlossen!\n')
  console.log('Übersicht:')
  console.log('  6 Kunden · 5 Initiativen · 9 Milestones')
  console.log('  18 Stakeholder (customer-scoped)')
  console.log('  20 Initiative-Stakeholder-Zuordnungen')
  console.log('  20 Stakeholder-Profile')
  console.log('  13 Stakeholder-Beziehungen')
  console.log('  12 Maßnahmen · 17 Task-Stakeholder-Links')
  console.log('  4 Canvas · 13 Phasen · 16 KPIs')
  console.log('  11 Strategy Goals · 13 Hierarchie-Links · 10 Key Results')
}
 
seed().catch(err => {
  console.error('\n❌ Fehler:', err.message)
  process.exit(1)
})
 










