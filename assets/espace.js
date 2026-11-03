/* Espace praticienne : cockpit du jour, parcours des patients, agenda, fiches, questionnaires, messages,
   statistiques, automatisations, assistant IA (simulé) et conformité. Données fictives en localStorage. */
(function () {
  'use strict';
  const { esc, $, $$, toast } = Site, E = Engine;
  let S = Demo.load();
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const T = E.iso(TODAY);
  const view = $('#view');

  /* ---------- accès aux données ---------- */
  const P = id => S.patients.find(p => p.id === id);
  const name = p => p ? p.first + ' ' + p.last : 'Patient inconnu';
  const lieu = id => Demo.LIEUX.find(l => l.id === id) || Demo.LIEUX[0];
  const appts = () => S.appointments.slice().sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const upcoming = () => appts().filter(a => a.status === 'prevu' && a.date >= T);
  const nowHM = () => new Date().toTimeString().slice(0, 5);
  const nextAppt = () => upcoming().find(a => a.date > T || a.time >= nowHM());
  const subFor = a => S.submissions.filter(s => s.appointment === a.id || (s.patient === a.patient && a.type === 'rdv1')).sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1))[0];
  const subOfPatient = pid => S.submissions.filter(s => s.patient === pid).sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1))[0];
  const qStatus = a => { const s = subFor(a); return E.questionnaireStatus(a.date, s && s.receivedOn, TODAY); };
  const hm = t => (t || '').replace(/^0/, '').replace(':', ' h ');
  const fmtShort = d => E.fmt(d, true).replace(/ \d{4}$/, '');
  const MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const DS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const dm = d => { const x = E.day(d); return x.getDate() + ' ' + MS[x.getMonth()]; };
  const dshort = d => { const x = E.day(d); return DS[x.getDay()] + ' ' + x.getDate() + ' ' + MS[x.getMonth()]; };
  const when = a => (a.date === T ? 'Aujourd’hui, ' : a.date === E.iso(E.addDays(TODAY, 1)) ? 'Demain, ' : dshort(a.date) + ', ') + hm(a.time);
  const ago = d => Math.round((TODAY - E.day(d)) / 86400000);
  const typ = k => Demo.TYPES[k] || Demo.TYPES.suivi;
  const chip = st => `<span class="chip ${esc(st.key)}">${esc(st.label)}</span>`;
  const tyChip = k => `<span class="chip ty-${esc(k)}">${esc(typ(k).short)}</span>`;
  const chChip = m => `<span class="chip ch-${esc(m.channel || 'email')}">${esc(E.CHANNELS[m.channel || 'email'])}</span>`;
  const roleChip = r => `<span class="chip r-${r}">${{ auto: 'Automatique', ia: 'IA · vous validez', vous: 'Vous' }[r]}</span>`;
  function persist() { Demo.save(S); }

  /* ---------- étapes du parcours (une couleur par étape, voir site.css) ---------- */
  const STAGES = [
    { name: 'Questionnaire attendu', short: 'Q. attendu', auto: 'Confirmation et lien envoyés, rappels à J-37 et J-32', you: 'Rien à faire' },
    { name: 'Questionnaire en retard', short: 'Q. en retard', auto: 'Dernier rappel parti, alerte au cabinet à J-30', you: 'Relancer, garder ou libérer le créneau' },
    { name: 'Prêt pour le RDV 1', short: 'Prêt RDV 1', auto: 'Scores calculés, synthèse IA prête, rappel la veille', you: 'Relire la synthèse (2 min)' },
    { name: 'Biologie en attente', short: 'Biologie', auto: 'Demande et consignes du laboratoire envoyées', you: 'Proposer le RDV 2 à réception' },
    { name: 'RDV 2 planifié', short: 'RDV 2', auto: 'Prise de sang lue par l’IA, rappel la veille', you: 'Interpréter la biologie' },
    { name: 'En suivi', short: 'Suivi', auto: 'Compte rendu au médecin préparé', you: 'Relire, planifier le suivi' },
  ];
  const STEPL = ['RDV pris', 'Questionnaire', 'RDV 1', 'Biologie', 'RDV 2', 'Suivi'];
  const POS = [1, 1, 2, 3, 4, 5];
  const stepColors = i => ['c-blue', i === 1 ? 's1' : 's0', 's2', 's3', 's4', 's5'];
  function journey(pid) {
    const list = appts().filter(a => a.patient === pid);
    const done = list.filter(a => a.status === 'fait');
    const nx = list.find(a => a.status === 'prevu' && a.date >= T);
    const sub = subOfPatient(pid);
    const r1 = list.find(a => a.type === 'rdv1' && a.status === 'prevu') || list.find(a => a.type === 'rdv1');
    let i;
    if (done.some(a => a.type === 'rdv2')) i = 5;
    else if (done.some(a => a.type === 'rdv1')) i = nx && nx.type === 'rdv2' ? 4 : 3;
    else if (sub) i = 2;
    else i = r1 && r1.status === 'prevu' && qStatus(r1).key === 'retard' ? 1 : 0;
    return { i, list, done, nx, sub, r1 };
  }
  const stageChip = i => `<span class="chip st s${i}">${esc(STAGES[i].short)}</span>`;
  const jbar = i => `<span class="jbar s${i}" role="img" aria-label="Étape ${POS[i] + 1} sur 6 : ${esc(STAGES[i].name)}">${[0, 1, 2, 3, 4, 5].map(k => `<i class="${k <= POS[i] ? 'on' : ''}"></i>`).join('')}</span>`;
  const jsteps = i => { const sc = stepColors(i), pos = POS[i]; return `<ol class="jsteps">${STEPL.map((l, k) => `<li class="${sc[k]} ${k < pos ? 'done' : k === pos ? 'cur' : ''}">${esc(l)}</li>`).join('')}</ol>`; };

  /* ---------- icônes ---------- */
  const IC = {
    aujourdhui: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    parcours: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    patients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3A6.5 6.5 0 0 1 21.5 20"/>',
    questionnaires: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    emails: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    statistiques: '<path d="M3 21h18"/><path d="M6 17v-5M11 17V7M16 17v-8M21 17v-3"/>',
    automatisations: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    ia: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    conformite: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    reglages: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;

  /* ---------- navigation ---------- */
  const NAV = [
    ['Au quotidien'],
    ['aujourdhui', 'Aujourd’hui', 'brand'], ['parcours', 'Parcours', 'teal'], ['agenda', 'Agenda', 'blue'], ['patients', 'Patients', 'slate'],
    ['questionnaires', 'Questionnaires', 'saffron'], ['emails', 'Messages', 'blue'],
    ['Pilotage'],
    ['statistiques', 'Statistiques', 'pink'], ['automatisations', 'Automatisations', 'blue'], ['ia', 'Assistant IA', 'violet'],
    ['Cabinet'],
    ['conformite', 'Conformité', 'green'], ['reglages', 'Réglages', 'slate'],
  ];
  const lateCount = () => upcoming().filter(a => a.type === 'rdv1' && qStatus(a).key === 'retard').length;
  function nav(cur) {
    const late = lateCount();
    $('#side-nav').innerHTML = NAV.map(([k, l, c]) => !l ? `<div class="grp">${esc(k)}</div>` :
      `<a href="#${k}" style="--ic:var(--${c});--ic50:var(--${c}-50)"${k === cur ? ' aria-current="page"' : ''}>${svg(k)}${l}${k === 'questionnaires' && late ? `<em>${late}</em>` : ''}</a>`).join('');
    const TB = [['aujourdhui', 'Aujourd’hui'], ['parcours', 'Parcours'], ['agenda', 'Agenda'], ['patients', 'Patients']];
    $('#tabbar').innerHTML = TB.map(([k, l]) => `<a href="#${k}"${k === cur ? ' aria-current="page"' : ''}>${svg(k)}${l}${k === 'parcours' && late ? `<em>${late}</em>` : ''}</a>`).join('') + `<button type="button" id="tb-more"${TB.some(x => x[0] === cur) ? '' : ' aria-current="page"'}>${svg('plus')}Plus</button>`;
    $('#tb-more').addEventListener('click', openSide);
    const item = NAV.find(x => x[0] === cur);
    $('#tb-title').textContent = item && item[1] ? item[1] : 'Espace praticienne';
    const ch = S.channels || {};
    $('#tb-ch').innerHTML = Object.entries(E.CHANNELS).map(([k, l]) => `<span class="${ch[k] ? '' : 'off'}" title="${esc(l)} ${ch[k] ? 'connecté' : 'déconnecté'}">${esc(l)}</span>`).join('');
  }
  function openSide() { const o = $('#side').classList.toggle('open'); $('#side-open').setAttribute('aria-expanded', o); }
  $('#side-open').addEventListener('click', openSide);

  /* recherche globale */
  const gs = $('#gsearch'), gr = $('#gs-res');
  gs.addEventListener('input', () => {
    const q = gs.value.trim().toLowerCase();
    if (q.length < 2) { gr.classList.remove('open'); return; }
    const res = S.patients.filter(p => (name(p) + ' ' + p.motif + ' ' + (p.city || '')).toLowerCase().includes(q)).slice(0, 7);
    gr.innerHTML = res.length ? res.map(p => `<a href="#patient/${esc(p.id)}"><span><b>${esc(name(p))}</b><br><small class="muted">${esc(p.motif)}</small></span>${stageChip(journey(p.id).i)}</a>`).join('') : '<div class="empty">Aucun patient ne correspond.</div>';
    gr.classList.add('open');
  });
  gs.addEventListener('keydown', e => { if (e.key === 'Escape') { gs.value = ''; gr.classList.remove('open'); } });
  gr.addEventListener('click', () => { gs.value = ''; gr.classList.remove('open'); });
  document.addEventListener('click', e => { if (!e.target.closest('.tb-search')) gr.classList.remove('open'); });

  /* Sur mobile, les tableaux deviennent des cartes : chaque cellule reçoit l'intitulé de sa colonne */
  function labelTables() {
    $$('table.t', view).forEach(t => {
      const hs = $$('thead th', t).map(th => th.textContent.trim());
      if (hs.length) $$('tbody tr', t).forEach(tr => Array.from(tr.children).forEach((td, i) => { if (hs[i]) td.dataset.label = hs[i]; }));
    });
  }

  function route() {
    S = Demo.load(); S.channels = S.channels || { email: true, sms: true, whatsapp: true };
    const [r, id] = (location.hash.slice(1) || 'aujourdhui').split('/');
    const top = r === 'patient' ? 'patients' : r === 'questionnaire' ? 'questionnaires' : r === 'consultation' ? 'ia' : r;
    nav(top); $('#side').classList.remove('open');
    const fn = { aujourdhui: vToday, parcours: vParcours, agenda: vAgenda, patients: vPatients, patient: () => vPatient(id), questionnaires: vQuestionnaires, questionnaire: () => vQuestionnaire(id), emails: vEmails, statistiques: vStats, automatisations: vAutomations, ia: vIA, consultation: () => vConsult(id), conformite: vConformite, reglages: vSettings }[r] || vToday;
    fn(); labelTables(); view.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
  }
  addEventListener('hashchange', route);

  function head(title, sub, actions) { return `<div class="topline"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`; }
  function dialog(html) { $('#dlg-body').innerHTML = html + '<div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost sm" type="button" id="dlg-close">Fermer</button></div>'; const d = $('#dlg'); d.showModal(); $('#dlg-close').addEventListener('click', () => d.close()); }
  function mailFor(m) {
    const p = P(m.patient), a = S.appointments.find(x => x.id === m.appointment) || {};
    const l = lieu(a.lieu);
    const tpl = Object.assign({}, E.TEMPLATES[m.template], (S.templates || {})[m.template] || {});
    const vars = { prenom: p ? p.first : '', patient: name(p), date: a.date ? E.fmt(a.date, true) : '', heure: hm(a.time), lieu: l.name + ', ' + l.address, echeance: a.date ? E.fmt(E.dueDate(a.date)) : '', lien: 'https://exemple-cabinet.be/questionnaire' };
    const fill = s => s.replace(/\{(\w+)\}/g, (x, k) => (vars[k] != null ? vars[k] : x));
    return { to: p ? p.email : '', subject: fill(tpl.subject), body: fill(tpl.body), name: tpl.name };
  }
  function showMail(m) {
    const x = mailFor(m), ch = m.channel || 'email';
    if (ch !== 'email') {
      const p = P(m.patient), a = S.appointments.find(y => y.id === m.appointment) || {};
      const short = E.render(m.template, { date: a.date ? fmtShort(a.date) : '', heure: hm(a.time), lieuCourt: lieu(a.lieu).short, echeance: a.date ? E.fmt(E.dueDate(a.date)) : '', lien: 'cabinet.be/q/7KD2' }, ch);
      dialog(`<p class="lbl">${esc(x.name)} · ${chChip(m)} · ${m.status === 'envoye' ? 'envoyé le' : 'prévu le'} ${esc(E.fmt(m.at))}</p>
        <div class="phone"><div class="phone-top">${esc(p ? p.phone : '')}${ch === 'whatsapp' ? ' · WhatsApp' : ' · SMS'}</div><div class="bubble ${ch}">${esc(short.body)}<small>${m.status === 'envoye' ? 'Distribué' : 'Planifié'}</small></div></div>
        <p class="small muted" style="margin-top:10px">Message court sans aucune information de santé : la date, l’heure, le cabinet et un lien. Le détail reste dans l’e-mail ou l’espace patient.</p>`);
      return;
    }
    dialog(`<p class="lbl">${esc(x.name)} · ${chChip(m)} · ${m.status === 'envoye' ? 'envoyé le' : 'prévu le'} ${esc(E.fmt(m.at))}</p>
      <div class="mail"><header><span><b>À :</b> ${esc(x.to)}</span><span><b>Objet :</b> ${esc(x.subject)}</span></header><pre>${esc(x.body)}</pre></div>`);
  }

  /* ---------- actions communes ---------- */
  function remind(a) {
    const p = P(a.patient), tpl = qStatus(a).key === 'retard' ? 'rappel2' : 'rappel1';
    const m = Demo.addExtra(S, 'emails', { id: 'm' + Date.now().toString(36), patient: a.patient, appointment: a.id, template: tpl, at: T, status: 'envoye', channel: p.channel || 'email' });
    showMail(m); toast('Rappel envoyé à ' + name(p) + ' par ' + E.CHANNELS[m.channel]);
  }
  function proposeRdv2(pid) {
    const p = P(pid); let d = E.addDays(TODAY, 10);
    while (!E.isConsultationDay(d)) d = E.addDays(d, 1);
    const a = Demo.addExtra(S, 'appointments', { id: 'a' + Date.now().toString(36), patient: pid, type: 'rdv2', lieu: p.lieu, date: E.iso(d), time: '10:30', status: 'prevu', bookedOn: T, web: true });
    Demo.addExtra(S, 'emails', { id: 'm' + Date.now().toString(36) + 'b', patient: pid, appointment: a.id, template: 'confirmation', at: T, status: 'envoye', channel: p.channel || 'email' });
    toast('RDV 2 proposé le ' + fmtShort(a.date) + ' à 10 h 30 · confirmation envoyée'); route();
  }
  function docReport(pid) {
    const p = P(pid), list = appts().filter(a => a.patient === pid);
    const last = list.filter(a => a.status === 'fait').pop() || list[0];
    const x = mailFor({ patient: pid, appointment: last && last.id, template: 'medecin' });
    dialog(`<p class="lbl">Brouillon préparé par l’IA, à relire ${roleChip('ia')}</p><div class="mail"><header><span><b>À :</b> ${esc(p.doctor || 'médecin traitant')}</span><span><b>Objet :</b> ${esc(x.subject)}</span></header><pre>${esc(x.body)}\n\nPièce jointe : synthèse de consultation (${esc(name(p))}).pdf</pre></div><p class="small muted" style="margin-top:8px">Envoyé seulement après votre validation, et uniquement si le patient a accepté le partage avec son médecin.</p><div class="row"><button class="btn sm" type="button" id="doc-ok">Valider et envoyer</button></div>`);
    $('#doc-ok').addEventListener('click', () => { $('#dlg').close(); toast('Compte rendu envoyé à ' + (p.doctor || 'au médecin traitant') + ' (démo)'); });
  }
  function bindActs(root) {
    $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.act, a = b.dataset.a && S.appointments.find(x => x.id === b.dataset.a), pid = b.dataset.p || (a && a.patient);
      if (k === 'remind' && a) remind(a);
      if (k === 'pre') { const s = subOfPatient(pid); if (s) dialog(Ai.preSummaryHtml(s, P(pid))); else toast('Questionnaire pas encore reçu'); }
      if (k === 'rdv2') proposeRdv2(pid);
      if (k === 'doc') docReport(pid);
    }));
  }

  /* ---------- alertes par patient ---------- */
  function alertsFor(pid) {
    const out = [], list = appts().filter(a => a.patient === pid), sub = subOfPatient(pid);
    const nx = list.find(a => a.status === 'prevu' && a.date >= T);
    if (nx && nx.type === 'rdv1') { const st = qStatus(nx); if (st.key === 'retard') out.push({ lvl: 'haute', t: 'Questionnaire en retard', d: 'RDV du ' + fmtShort(nx.date) + ' · échéance dépassée' }); else if (st.key === 'bientot') out.push({ lvl: 'moyenne', t: 'Questionnaire attendu', d: st.label }); }
    if (sub) E.flags(sub.answers).forEach(f => out.push({ lvl: 'haute', t: 'Point de vigilance', d: f }));
    list.filter(a => a.status === 'absent').forEach(a => out.push({ lvl: 'moyenne', t: 'Rendez-vous manqué', d: E.fmt(a.date) + ' · non annulé, à facturer selon la règle du cabinet' }));
    const r1 = list.filter(a => a.type === 'rdv1' && a.status === 'fait').pop();
    if (r1 && !list.some(a => a.type === 'rdv2')) { const days = ago(r1.date); if (days > 21) out.push({ lvl: 'moyenne', t: 'Biologie attendue', d: 'Demandée il y a ' + days + ' jours, pas de RDV 2 planifié' }); }
    if (!nx && list.length && list.every(a => a.status !== 'prevu')) out.push({ lvl: 'basse', t: 'Aucun rendez-vous prévu', d: 'Proposer un suivi' });
    return out;
  }
  const alertChip = n => n ? `<span class="chip retard">${n} alerte${n > 1 ? 's' : ''}</span>` : '';
  const LVL = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };

  function profileBars(sub, max, two) {
    const prof = E.profile(sub.answers, sub.sex).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, max || 99);
    const lv = s => (s >= 67 ? 'l3' : s >= 50 ? 'l2' : s >= 25 ? 'l1' : '');
    return `<div class="bars${two ? ' two-col' : ''}">${prof.map(a => `<div class="bar ${lv(a.score)}" title="${esc(a.name)} : ${a.score}/100"><span>${esc(a.name)}</span><span class="track"><i style="width:${Math.max(2, a.score)}%"></i></span><b>${a.score}</b></div>`).join('')}</div>`;
  }

  /* ===================== Aujourd'hui : tout sur un écran ===================== */
  function vToday() {
    const up = upcoming(), nx = nextAppt(), now = nowHM();
    const todayL = appts().filter(a => a.date === T && a.status !== 'annule');
    const tomorrow = E.iso(E.addDays(TODAY, 1)), tomL = up.filter(a => a.date === tomorrow);
    const week = up.filter(a => a.date < E.iso(E.addDays(TODAY, 7)));
    const rdv1 = up.filter(a => a.type === 'rdv1');
    const late = rdv1.filter(a => qStatus(a).key === 'retard'), pending = rdv1.filter(a => ['attente', 'bientot'].includes(qStatus(a).key));
    const J = S.patients.map(p => ({ p, j: journey(p.id) }));
    const bio = J.filter(r => r.j.i === 3);
    const sent7 = S.emails.filter(m => m.status === 'envoye' && m.at >= E.iso(E.addDays(TODAY, -7))).length;
    const offWeek = !E.isConsultationDay(TODAY) && TODAY.getDay() >= 1 && TODAY.getDay() <= 5;
    const hour = new Date().getHours();
    const kpi = (c, href, v, l, s) => `<a class="kpi ${c}" href="${href}"><b>${v}</b><span>${l}</span><small>${s}</small></a>`;

    /* colonne A : la journée */
    const ev = a => { const p = P(a.patient), isNow = nx && nx.id === a.id, past = a.date === T && a.time < now && !isNow; return `<li><span class="h">${esc(hm(a.time))}</span><a class="ev2 ${esc(a.type)}${past ? ' past' : ''}${isNow ? ' now' : ''}" href="#patient/${esc(a.patient)}"><b>${esc(name(p))}</b><small>${esc(typ(a.type).short)} · ${typ(a.type).minutes} min · ${esc(lieu(a.lieu).short)}${a.type === 'rdv1' ? ' · questionnaire ' + (subFor(a) ? 'reçu' : 'manquant') : ''}${a.status === 'fait' ? ' · fait' : ''}</small></a></li>`; };
    const mon = E.addDays(TODAY, -((TODAY.getDay() + 6) % 7));
    const wk = [0, 1, 2, 3, 4].map(i => { const d = E.addDays(mon, i), iso = E.iso(d), l = S.appointments.filter(a => a.date === iso && a.status !== 'annule'); const by = k => l.filter(a => a.type === k).length; return `<a href="#agenda" class="${iso === T ? 'today' : ''} ${E.isConsultationDay(d) ? '' : 'off'}" title="${esc(fmtShort(iso))} : ${l.length} rendez-vous"><span>${esc(dshort(iso).split(' ').slice(0, 2).join(' '))}</span><b>${l.length}</b><span class="stk">${[['rdv1', 'teal'], ['rdv2', 'pink'], ['suivi', 'green']].map(([k, c]) => by(k) ? `<i style="flex:${by(k)};background:var(--${c})"></i>` : '').join('')}</span></a>`; }).join('');
    const colA = `<div>
      <section class="box"><h2 class="bh">Aujourd’hui<span class="n">${todayL.length} RDV</span></h2>${todayL.length ? `<ol class="dayline">${todayL.map(ev).join('')}</ol>` : `<div class="empty">${offWeek ? 'Troisième semaine du mois : pas de consultation.' : 'Aucune consultation aujourd’hui.'}</div>`}</section>
      <section class="box"><h2 class="bh">Demain<span class="n">${tomL.length}</span></h2>${tomL.length ? `<ol class="dayline">${tomL.map(ev).join('')}</ol>` : '<div class="empty">Aucun rendez-vous demain.</div>'}</section>
      <section class="box"><h2 class="bh">Cette semaine <a href="#agenda">Agenda</a></h2><div class="minweek">${wk}</div><div class="legend" style="margin:8px 0 0">${tyChip('rdv1')}${tyChip('rdv2')}${tyChip('suivi')}</div></section>
    </div>`;

    /* colonne B : prochain patient et parcours */
    let nextHtml = '<section class="box"><h2 class="bh">Prochain rendez-vous</h2><div class="empty">Aucun rendez-vous prévu.</div></section>';
    if (nx) {
      const p = P(nx.patient), j = journey(nx.patient), sub = nx.type === 'rdv1' ? subFor(nx) : subOfPatient(nx.patient), st = qStatus(nx);
      const fl = sub ? E.flags(sub.answers) : [];
      let cd;
      if (nx.date === T) { const [h, m] = nx.time.split(':').map(Number), diff = h * 60 + m - (new Date().getHours() * 60 + new Date().getMinutes()); cd = diff > 0 ? 'dans ' + (diff >= 60 ? Math.floor(diff / 60) + ' h ' + String(diff % 60).padStart(2, '0') : diff + ' min') : 'maintenant'; }
      else cd = 'dans ' + Math.round((E.day(nx.date) - TODAY) / 86400000) + ' j';
      nextHtml = `<section class="box nextp" aria-labelledby="nx-h">
        <h2 class="bh" id="nx-h">Prochain rendez-vous <span>${esc(cd)}</span></h2>
        <div class="top"><div><div class="when">${esc(when(nx))}</div><div class="who"><a href="#patient/${esc(p.id)}">${esc(name(p))}</a>${p.age ? `, ${esc(p.age)} ans` : ''}</div><div class="meta">${esc(typ(nx.type).name)} · ${typ(nx.type).minutes} min · ${esc(lieu(nx.lieu).name)} · rappels par ${esc(E.CHANNELS[p.channel || 'email'])}</div></div>
          <div class="row">${nx.type === 'rdv1' ? chip(st) : sub ? '<span class="chip recu">Questionnaire reçu</span>' : ''}</div></div>
        <p class="motif">« ${esc(p.motif)} »</p>
        ${jsteps(j.i)}
        <div class="cols">
          <div><p class="lbl2">Profil fonctionnel · les 6 axes les plus marqués</p>${sub ? profileBars(sub, 6) : `<p class="small" style="margin:0;color:#C9DAD4">Questionnaire attendu avant le ${esc(E.fmt(E.dueDate(nx.date)))}.</p>`}</div>
          <div><p class="lbl2">À vérifier</p>${fl.length ? `<ul class="vig">${fl.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p class="small" style="margin:0;color:#C9DAD4">Aucun point de vigilance dans les réponses.</p>'}
            <p class="lbl2" style="margin-top:10px">Dossier</p><p class="small" style="margin:0;color:#C9DAD4">Patient depuis le ${esc(E.fmt(p.since))}<br>Envoyé par : ${esc(p.referrer || '·')}<br>Médecin : ${esc(p.doctor || '·')}</p></div>
        </div>
        <div class="row" style="margin-top:12px"><a class="btn hlb sm" href="#patient/${esc(p.id)}">Ouvrir la fiche</a>${sub ? `<button class="btn ai sm" type="button" data-act="pre" data-p="${esc(p.id)}">Synthèse IA</button>` : nx.type === 'rdv1' ? `<button class="btn ghost sm" type="button" data-act="remind" data-a="${esc(nx.id)}">Relancer le questionnaire</button>` : ''}<a class="btn ghost sm" href="#consultation/${esc(nx.id)}">Démarrer la consultation</a></div>
      </section>`;
    }
    const maxS = Math.max(1, ...STAGES.map((s, i) => J.filter(r => r.j.i === i).length));
    const funnel = `<section class="box"><h2 class="bh">Parcours des patients <a href="#parcours">Ouvrir le parcours</a></h2><div class="funnel">${STAGES.map((s, i) => { const n = J.filter(r => r.j.i === i).length; return `<a href="#parcours" class="s${i}" title="${esc(s.name)} : ${n}"><span class="dot">${esc(s.name)}</span><span><i style="width:${Math.round(100 * n / maxS)}%"></i></span><b>${n}</b></a>`; }).join('')}</div></section>`;

    /* colonne C : à faire, puis ce qui part tout seul */
    const todo = [
      ...late.map(a => ({ c: 's1', who: name(P(a.patient)), pid: a.patient, d: 'Questionnaire en retard · RDV ' + dshort(a.date), btn: `<button class="btn xs warn" type="button" data-act="remind" data-a="${esc(a.id)}">Relancer</button>` })),
      ...J.filter(r => r.j.sub && E.flags(r.j.sub.answers).length && r.j.nx && r.j.nx.date <= E.iso(E.addDays(TODAY, 21))).map(r => ({ c: 'c-red', who: name(r.p), pid: r.p.id, d: E.flags(r.j.sub.answers).length + ' point(s) de vigilance avant le RDV du ' + dshort(r.j.nx.date), btn: `<a class="btn xs ghost" href="#patient/${esc(r.p.id)}">Voir</a>` })),
      ...bio.filter(r => { const d = r.j.done.find(a => a.type === 'rdv1'); return d && ago(d.date) > 21; }).map(r => ({ c: 's3', who: name(r.p), pid: r.p.id, d: 'Biologie attendue depuis ' + ago(r.j.done.find(a => a.type === 'rdv1').date) + ' j', btn: `<button class="btn xs" type="button" data-act="rdv2" data-p="${esc(r.p.id)}">Proposer le RDV 2</button>` })),
      ...S.appointments.filter(a => a.status === 'absent' && a.date >= E.iso(E.addDays(TODAY, -21))).map(a => ({ c: 'c-orange', who: name(P(a.patient)), pid: a.patient, d: 'Rendez-vous manqué le ' + dshort(a.date) + ' · à facturer', btn: `<a class="btn xs ghost" href="#patient/${esc(a.patient)}">Voir</a>` })),
      ...tomL.filter(a => a.type === 'rdv1' && subFor(a)).map(a => ({ c: 'c-violet', who: name(P(a.patient)), pid: a.patient, d: 'Synthèse IA prête pour demain ' + hm(a.time), btn: `<button class="btn xs ai" type="button" data-act="pre" data-p="${esc(a.patient)}">Lire</button>` })),
    ];
    const feed = [
      ...S.emails.filter(m => m.at === T && m.status === 'envoye').map(m => ({ t: 'Envoyé', m, r: 'auto' })),
      ...S.submissions.filter(s => s.receivedOn === T).map(s => ({ t: 'Reçu', txt: 'Questionnaire reçu · scores calculés', pid: s.patient, r: 'auto' })),
      ...tomL.filter(a => a.type === 'rdv1' && subFor(a)).map(a => ({ t: 'Prêt', txt: 'Synthèse pré-consultation', pid: a.patient, r: 'ia' })),
      ...S.emails.filter(m => m.at === tomorrow && m.status === 'planifie').map(m => ({ t: 'Demain', m, r: 'auto' })),
    ].slice(0, 9);
    const colC = `<div>
      <section class="box"><h2 class="bh">À faire<span class="n">${todo.length}</span></h2>${todo.length ? `<ul class="list todo scroll" style="--mh:300px">${todo.map(x => `<li class="${x.c}"><i aria-hidden="true"></i><span><a href="#patient/${esc(x.pid)}">${esc(x.who)}</a><small>${esc(x.d)}</small></span>${x.btn}</li>`).join('')}</ul>` : '<div class="empty">Rien à traiter. Les rappels partent tout seuls.</div>'}</section>
      <section class="box"><h2 class="bh">Automatique aujourd’hui <a href="#automatisations">Règles</a></h2>
        <p class="small muted" style="margin:-4px 0 6px">${sent7} messages partis cette semaine, aucun écrit à la main.</p>
        ${feed.length ? `<ul class="list scroll" style="--mh:260px">${feed.map(f => `<li><span class="t">${esc(f.t)}</span><span><a href="#patient/${esc(f.m ? f.m.patient : f.pid)}">${esc(name(P(f.m ? f.m.patient : f.pid)))}</a><small>${esc(f.m ? E.TEMPLATES[f.m.template].name : f.txt)}</small></span><span class="row">${f.m ? chChip(f.m) : ''}<span class="chip r-${f.r}">${f.r === 'ia' ? 'IA' : 'Auto'}</span></span></li>`).join('')}</ul>` : '<div class="empty">Aucun envoi aujourd’hui.</div>'}
      </section>
    </div>`;

    view.innerHTML = head(`${hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'} Annick`, esc(E.fmt(TODAY, true)) + (offWeek ? ' · troisième semaine du mois : pas de consultation' : '')) + `
      <div class="kpis">
        ${kpi('c-teal', '#agenda', todayL.length, 'Rendez-vous aujourd’hui', todayL.filter(a => a.time >= now).length + ' encore à venir')}
        ${kpi('c-slate', '#agenda', week.length, 'Dans les 7 jours', week.filter(a => a.type === 'rdv1').length + ' premières consultations')}
        ${kpi('s0', '#questionnaires', pending.length, 'Questionnaires attendus', 'rappels automatiques actifs')}
        ${kpi('s1', '#questionnaires', late.length, 'Questionnaires en retard', 'moins d’un mois avant le RDV')}
        ${kpi('s3', '#parcours', bio.length, 'Biologies en attente', 'RDV 2 à proposer')}
        ${kpi('c-blue', '#emails', sent7, 'Messages automatiques', '7 derniers jours')}
      </div>
      <div class="cockpit">${colA}<div>${nextHtml}${funnel}</div>${colC}</div>`;
    bindActs(view);
  }

  /* ===================== Parcours : une colonne par étape ===================== */
  function vParcours() {
    const rows = S.patients.map(p => ({ p, j: journey(p.id) }));
    const card = ({ p, j }) => {
      const al = alertsFor(p.id).length;
      let d = '', chips = '', lbl = '', btn = '';
      if (j.i <= 1) {
        const a = j.list.find(x => x.type === 'rdv1' && x.status === 'prevu') || j.r1;
        d = a ? 'RDV 1 · ' + when(a) + ' · ' + lieu(a.lieu).short : 'RDV 1 à planifier'; chips = a ? chip(qStatus(a)) : '';
        lbl = j.i === 1 ? 'À décider' : 'Rappels automatiques'; btn = a ? `<button class="btn xs ${j.i === 1 ? 'warn' : 'ghost'}" type="button" data-act="remind" data-a="${esc(a.id)}">Relancer</button>` : '';
      } else if (j.i === 2) {
        d = j.nx ? 'RDV 1 · ' + when(j.nx) + ' · ' + lieu(j.nx.lieu).short : 'RDV 1 à planifier'; chips = '<span class="chip recu">Questionnaire reçu</span>';
        lbl = 'Synthèse prête'; btn = `<button class="btn xs ai" type="button" data-act="pre" data-p="${esc(p.id)}">Synthèse IA</button>`;
      } else if (j.i === 3) {
        const r1 = j.done.filter(a => a.type === 'rdv1').pop(), n = ago(r1.date);
        d = 'RDV 1 le ' + dm(r1.date) + ' · il y a ' + n + ' j'; chips = n > 21 ? '<span class="chip moyenne">Résultats attendus</span>' : '<span class="chip attente">Au laboratoire</span>';
        lbl = 'À réception des résultats'; btn = `<button class="btn xs" type="button" data-act="rdv2" data-p="${esc(p.id)}">Proposer le RDV 2</button>`;
      } else if (j.i === 4) {
        d = 'RDV 2 · ' + when(j.nx) + ' · ' + lieu(j.nx.lieu).short; chips = '<span class="chip ok">Biologie reçue</span>';
        lbl = 'Lecture IA de la biologie'; btn = `<a class="btn xs ghost" href="#patient/${esc(p.id)}">Préparer</a>`;
      } else {
        d = j.nx ? typ(j.nx.type).short + ' · ' + when(j.nx) : 'Suivi à planifier'; chips = '<span class="chip ok">Hormonologie possible</span>';
        lbl = 'Compte rendu au médecin'; btn = `<button class="btn xs ghost" type="button" data-act="doc" data-p="${esc(p.id)}">Relire</button>`;
      }
      return `<article class="card"><a class="nm" href="#patient/${esc(p.id)}">${esc(name(p))}${p.age ? `<span class="muted" style="font-weight:400">, ${esc(p.age)} ans</span>` : ''}</a><span class="d">${esc(d)}</span><div class="row">${chips}${alertChip(al)}${chChip(p)}</div><div class="act"><span>${esc(lbl)}</span>${btn}</div></article>`;
    };
    const sortKey = r => (r.j.nx ? r.j.nx.date + r.j.nx.time : '9');
    view.innerHTML = head('Parcours des patients', 'Chaque patient à son étape : ce qui part tout seul, et ce qui vous attend.', `<span class="legendbar" style="margin:0">${roleChip('auto')}${roleChip('ia')}${roleChip('vous')}</span>`) + `
      <div class="board">${STAGES.map((s, i) => { const arr = rows.filter(r => r.j.i === i).sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1)); return `<section class="lane s${i}" aria-label="${esc(s.name)}"><header><h2>${esc(s.name)} <b>${arr.length}</b></h2><p>${svg('automatisations')}<span>${esc(s.auto)}</span></p><p class="you"><span>Vous : ${esc(s.you)}</span></p></header>${arr.map(card).join('') || '<div class="empty">Aucun patient à cette étape.</div>'}</section>`; }).join('')}</div>`;
    bindActs(view);
  }

  /* ===================== Agenda ===================== */
  let weekOffset = 0;
  function vAgenda() {
    const mon = E.addDays(TODAY, -((TODAY.getDay() + 6) % 7) + 7 * weekOffset);
    const days = [0, 1, 2, 3, 4].map(i => E.addDays(mon, i));
    const H0 = 8.5, H1 = 18.5, PX = 46;
    const y = t => { const [h, m] = t.split(':').map(Number); return (h + m / 60 - H0) * PX; };
    const evs = iso => S.appointments.filter(a => a.date === iso && a.status !== 'annule').sort((a, b) => (a.time < b.time ? -1 : 1));
    const total = days.reduce((n, d) => n + evs(E.iso(d)).length, 0);
    view.innerHTML = head('Agenda', 'Semaine du ' + esc(E.fmt(mon)) + ' · ' + total + ' rendez-vous', `<button class="btn ghost sm" type="button" id="w-prev">Précédente</button><button class="btn ghost sm" type="button" id="w-now">Cette semaine</button><button class="btn ghost sm" type="button" id="w-next">Suivante</button><a class="btn sm" href="rendez-vous.html">Nouveau rendez-vous</a>`) + `
      <div class="legend">${tyChip('rdv1')}<span class="small muted">90 min, questionnaire requis</span>${tyChip('rdv2')}<span class="small muted">60 min, lecture de la biologie</span>${tyChip('suivi')}<span class="small muted">45 min</span><span class="chip retard">Absent</span><span class="small muted">Rayures : cabinet de Forest · hachures : 3e semaine, pas de consultation</span></div>
      <div class="week" role="grid" aria-label="Rendez-vous de la semaine">
        <div class="h"></div>${days.map(d => `<div class="h${E.iso(d) === T ? ' today' : ''}${E.isConsultationDay(d) ? '' : ' off'}">${esc(dshort(E.iso(d)))} · ${evs(E.iso(d)).length}</div>`).join('')}
        <div class="hours" style="height:${(H1 - H0) * PX}px">${[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => `<span style="top:${(h - H0) * PX - 8}px">${h} h</span>`).join('')}</div>
        ${days.map(d => { const iso = E.iso(d); return `<div class="col${iso === T ? ' today' : ''}${E.isConsultationDay(d) ? '' : ' off'}" style="height:${(H1 - H0) * PX}px">${evs(iso).map(a => { const p = P(a.patient), h = typ(a.type).minutes / 60 * PX - 3; return `<a class="ev ${esc(a.type)} ${esc(a.lieu)} ${esc(a.status)}" href="#patient/${esc(a.patient)}" style="top:${y(a.time)}px;height:${h}px" title="${esc(name(p))} · ${esc(typ(a.type).name)}"><b>${esc(hm(a.time))} · ${esc(name(p))}</b>${esc(typ(a.type).short)} · ${esc(lieu(a.lieu).short)}${a.type === 'rdv1' && a.status === 'prevu' ? ' · Q. ' + (subFor(a) ? 'reçu' : 'manquant') : ''}${a.status === 'fait' ? ' · fait' : a.status === 'absent' ? ' · absent' : ''}</a>`; }).join('')}</div>`; }).join('')}
      </div>
      <div class="daylist">${days.map(d => { const iso = E.iso(d), l = evs(iso); return `<section class="box"><h2 class="bh">${esc(fmtShort(iso))}${iso === T ? ' · aujourd’hui' : ''}<span class="n">${l.length}</span></h2>${l.length ? `<ol class="dayline">${l.map(a => `<li><span class="h">${esc(hm(a.time))}</span><a class="ev2 ${esc(a.type)}${a.status === 'fait' ? ' past' : ''}" href="#patient/${esc(a.patient)}"><b>${esc(name(P(a.patient)))}</b><small>${esc(typ(a.type).short)} · ${esc(lieu(a.lieu).short)}${a.status === 'absent' ? ' · absent' : ''}</small></a></li>`).join('')}</ol>` : `<div class="empty">${E.isConsultationDay(d) ? 'Aucun rendez-vous.' : 'Pas de consultation (3e semaine).'}</div>`}</section>`; }).join('')}</div>`;
    $('#w-prev').onclick = () => { weekOffset--; vAgenda(); }; $('#w-next').onclick = () => { weekOffset++; vAgenda(); }; $('#w-now').onclick = () => { weekOffset = 0; vAgenda(); };
  }

  /* ===================== Patients ===================== */
  let pFilter = 'tous', pSearch = '';
  function vPatients() {
    const all = S.patients.map(p => { const j = journey(p.id); return { p, j, nx: j.nx, al: alertsFor(p.id) }; });
    const rows = all.filter(r => {
      if (pSearch && !(name(r.p) + ' ' + r.p.motif + ' ' + r.p.city).toLowerCase().includes(pSearch.toLowerCase())) return false;
      if (pFilter === 'alertes') return r.al.length > 0;
      if (pFilter.startsWith('s')) return r.j.i === Number(pFilter.slice(1));
      return true;
    }).sort((a, b) => ((a.nx ? a.nx.date : '9') < (b.nx ? b.nx.date : '9') ? -1 : 1));
    const f = (k, l, n) => `<button type="button" data-f="${k}" aria-pressed="${pFilter === k}">${l} · ${n}</button>`;
    view.innerHTML = head('Patients', S.patients.length + ' dossiers · triés par prochain rendez-vous', '<a class="btn sm" href="rendez-vous.html">Nouveau patient</a>') + `
      <div class="row" style="margin-bottom:8px"><input type="search" id="p-q" placeholder="Filtrer : nom, motif, ville" value="${esc(pSearch)}" style="max-width:320px;min-height:36px" aria-label="Filtrer les patients"></div>
      <div class="tabs">${f('tous', 'Tous', all.length)}${f('alertes', 'Avec alertes', all.filter(r => r.al.length).length)}${STAGES.map((s, i) => f('s' + i, s.short, all.filter(r => r.j.i === i).length)).join('')}</div>
      <div class="box" style="padding:4px 14px;overflow-x:auto"><table class="t"><thead><tr><th>Patient</th><th>Motif</th><th>Étape</th><th>Progression</th><th>Prochain RDV</th><th>Questionnaire</th><th>Rappels</th><th>Alertes</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><a href="#patient/${esc(r.p.id)}">${esc(name(r.p))}</a>${r.p.web ? ' <span class="chip bientot">site</span>' : ''}<br><span class="small muted">${r.p.age ? esc(r.p.age) + ' ans · ' : ''}${esc(r.p.city || '')} · ${esc(lieu(r.p.lieu).short)}</span></td><td class="small" style="max-width:240px">${esc(r.p.motif)}</td><td>${stageChip(r.j.i)}</td><td>${jbar(r.j.i)}</td><td>${r.nx ? esc(dshort(r.nx.date)) + ' ' + esc(hm(r.nx.time)) + ' ' + tyChip(r.nx.type) : '<span class="muted">·</span>'}</td><td>${r.j.sub ? '<span class="chip recu">Reçu</span>' : r.nx && r.nx.type === 'rdv1' ? chip(qStatus(r.nx)) : '<span class="muted">·</span>'}</td><td>${chChip(r.p)}</td><td>${alertChip(r.al.length) || '<span class="muted">·</span>'}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">Aucun patient ne correspond.</div></td></tr>'}
      </tbody></table></div>`;
    $('#p-q').addEventListener('input', e => { pSearch = e.target.value; const pos = e.target.selectionStart; vPatients(); labelTables(); const i = $('#p-q'); i.focus(); i.setSelectionRange(pos, pos); });
    $$('[data-f]').forEach(b => b.addEventListener('click', () => { pFilter = b.dataset.f; vPatients(); labelTables(); }));
  }

  /* ===================== Fiche patient : le parcours étape par étape ===================== */
  function flowHtml(id, j) {
    const p = P(id), pos = POS[j.i], r1 = j.r1, sub = j.sub, ch = E.CHANNELS[p.channel || 'email'];
    const r1done = j.done.find(a => a.type === 'rdv1'), r2done = j.done.find(a => a.type === 'rdv2'), nx = j.nx;
    const st = [
      { b: 'Rendez-vous pris', d: r1 ? 'Le ' + E.fmt(r1.bookedOn || p.since) + ' · ' + lieu(r1.lieu).short : 'Aucun rendez-vous', who: [['auto', 'Confirmation · ' + ch]] },
      { b: 'Questionnaire', d: sub ? 'Reçu le ' + E.fmt(sub.receivedOn) : r1 ? qStatus(r1).label : 'Attendu', who: [['auto', 'Rappels J-37, J-32'], ['ia', 'Scores et synthèse']], act: !sub && r1 && r1.status === 'prevu' ? `<button class="btn xs" type="button" data-act="remind" data-a="${esc(r1.id)}">Relancer</button>` : '' },
      { b: 'RDV 1 · 90 min', d: r1done ? 'Fait le ' + E.fmt(r1done.date) : r1 ? when(r1) : 'À planifier', who: [['ia', 'Transcription, résumé'], ['vous', 'Consultation']], act: pos === 2 && r1 && r1.status === 'prevu' ? `<a class="btn xs ai" href="#consultation/${esc(r1.id)}">Démarrer la consultation</a>` : '' },
      { b: 'Biologie', d: pos > 3 ? 'Résultats reçus' : pos === 3 ? 'Demandée il y a ' + ago(r1done.date) + ' j' : 'Demandée au RDV 1', who: [['auto', 'Demande et consignes'], ['ia', 'Lecture du PDF']], act: pos === 3 ? `<button class="btn xs" type="button" data-act="rdv2" data-p="${esc(id)}">Proposer le RDV 2</button>` : '' },
      { b: 'RDV 2 · 60 min', d: r2done ? 'Fait le ' + E.fmt(r2done.date) : pos === 4 && nx ? when(nx) : 'À réception des résultats', who: [['vous', 'Interprétation, ajustement']] },
      { b: 'Suivi et hormonologie', d: pos === 5 ? (nx ? typ(nx.type).short + ' · ' + when(nx) : 'Suivi à planifier') : 'Après deux consultations', who: [['ia', 'Compte rendu médecin'], ['vous', 'Relecture']], act: pos === 5 ? `<button class="btn xs" type="button" data-act="doc" data-p="${esc(id)}">Compte rendu</button>` : '' },
    ];
    const sc = stepColors(j.i);
    return `<div class="flow" aria-label="Parcours du patient">${st.map((s, k) => { const state = k < pos ? 'done' : k === pos ? 'cur' : 'todo'; return `<div class="stp ${sc[k]} ${state}"><span class="k">Étape ${k + 1}<span>${state === 'done' ? '✓ fait' : state === 'cur' ? 'en cours' : 'à venir'}</span></span><b>${esc(s.b)}</b><span class="d">${esc(s.d)}</span><span class="who">${s.who.map(([r, t]) => `<span class="chip r-${r}">${esc(t)}</span>`).join('')}</span>${state === 'cur' ? (s.act || '') : ''}</div>`; }).join('')}</div>`;
  }
  function vPatient(id) {
    const p = P(id); if (!p) { view.innerHTML = head('Patient introuvable') + '<div class="empty">Ce dossier n’existe pas dans la démo. <a href="#patients">Retour aux patients</a></div>'; return; }
    const j = journey(id), list = j.list, sub = j.sub, nx = j.nx;
    const mails = S.emails.filter(m => m.patient === id).sort((a, b) => (a.at < b.at ? 1 : -1));
    const pri = sub ? E.priorities(E.profile(sub.answers, sub.sex)) : [];
    const al = alertsFor(id);
    const stLbl = { prevu: 'Prévu', fait: 'Fait', absent: 'Absent', annule: 'Annulé' };
    view.innerHTML = `<p class="crumbs"><a href="#patients">Patients</a> · <a href="#parcours">Parcours</a></p>` + head(esc(name(p)) + ' ' + stageChip(j.i), `${p.age ? esc(p.age) + ' ans · ' : ''}${p.sex === 'M' ? 'homme' : 'femme'} · ${esc(lieu(p.lieu).name)} · patient depuis le ${esc(E.fmt(p.since))}`,
      `${nx ? `<a class="btn ai sm" href="#consultation/${esc(nx.id)}">Démarrer la consultation</a>` : ''}${sub ? `<button class="btn ghost sm" type="button" data-act="pre" data-p="${esc(id)}">Synthèse IA</button>` : ''}<button class="btn ghost sm" type="button" data-act="doc" data-p="${esc(id)}">Compte rendu au médecin</button><button class="btn ghost sm" type="button" id="pp-export">Exporter le dossier</button>`) + `
      ${flowHtml(id, j)}
      <div class="grid pgrid">
        <div class="grid" style="align-content:start">
          <section class="box"><h2>Profil fonctionnel${sub ? ` <a href="#questionnaire/${esc(sub.id)}">Réponses détaillées</a>` : ''}</h2>
            ${sub ? `<p class="small muted" style="margin:-6px 0 8px">Score de 0 à 100 par axe, calculé à partir des réponses du ${esc(E.fmt(sub.receivedOn))}. Une orientation, jamais un diagnostic.</p>${profileBars(sub, 99, true)}` : `<div class="empty">Questionnaire pas encore reçu.${nx ? ' Attendu avant le ' + esc(E.fmt(E.dueDate(nx.date))) + '.' : ''}</div>`}
          </section>
          ${sub && sub.cortisol && sub.cortisol.length ? `<section class="box"><h2>Fiche cortisol<span class="n">${sub.cortisol.length}</span></h2><div class="row" style="gap:4px">${sub.cortisol.map(c => `<span class="hl small">${esc(c)}</span>`).join(' ')}</div></section>` : ''}
        </div>
        <div class="grid" style="align-content:start">
          <section class="box"><h2>Alertes<span class="n">${al.length}</span></h2>${al.length ? `<ul class="list todo">${al.map(x => `<li class="${x.lvl === 'haute' ? 'c-red' : x.lvl === 'moyenne' ? 'c-orange' : 'c-slate'}"><i aria-hidden="true"></i><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span class="chip ${x.lvl}">${LVL[x.lvl]}</span></li>`).join('')}</ul><p class="small muted" style="margin:6px 0 0">Les points de vigilance viennent des réponses du patient : à vérifier, ce ne sont pas des diagnostics.</p>` : '<div class="empty">Aucune alerte.</div>'}</section>
          <section class="box"><h2>Motif</h2><p style="margin:0">« ${esc(p.motif)} »</p>${pri.length ? `<p class="small muted" style="margin:8px 0 4px">Axes à explorer en priorité</p><div class="row" style="gap:4px">${pri.map(a => `<span class="chip moyenne">${esc(a.name)} · ${a.score}</span>`).join('')}</div>` : ''}</section>
          <section class="box"><h2>Notes de consultation</h2><textarea id="pp-notes" aria-label="Notes de consultation" placeholder="Vos notes, visibles uniquement par vous." style="min-height:110px">${esc((S.notes || {})[id] || '')}</textarea><p class="small muted" id="pp-saved" style="margin:4px 0 0">Enregistrées automatiquement.</p></section>
        </div>
        <div class="grid" style="align-content:start">
          <section class="box"><h2>Coordonnées</h2><dl class="kv"><dt>E-mail</dt><dd>${esc(p.email)}</dd><dt>Téléphone</dt><dd>${esc(p.phone || '·')}</dd><dt>Commune</dt><dd>${esc([p.zip, p.city].filter(Boolean).join(' ') || '·')}</dd><dt>Rappels par</dt><dd><select id="pp-ch" aria-label="Canal des rappels" style="min-height:30px;padding:2px 6px;font-size:.85rem">${Object.entries(E.CHANNELS).map(([k, l]) => `<option value="${k}"${(p.channel || 'email') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></dd><dt>Envoyé par</dt><dd>${esc(p.referrer || '·')}</dd><dt>Médecin</dt><dd>${esc(p.doctor || '·')}</dd></dl></section>
          <section class="box"><h2>Rendez-vous<span class="n">${list.length}</span></h2>${list.length ? `<ul class="list">${list.map(a => `<li><span class="t">${esc(dm(a.date))}</span><span>${tyChip(a.type)} ${esc(hm(a.time))} · ${esc(lieu(a.lieu).short)}</span><span class="chip ${esc(a.status)}">${stLbl[a.status] || esc(a.status)}</span></li>`).join('')}</ul>` : '<div class="empty">Aucun rendez-vous.</div>'}</section>
          <section class="box"><h2>Messages<span class="n">${mails.length}</span> <a href="#emails">Tous</a></h2>${mails.length ? `<ul class="list scroll" style="--mh:220px">${mails.map(m => `<li><span class="t">${esc(dm(m.at))}</span><span><button type="button" class="btn ghost xs" data-mail="${esc(m.id)}" style="border:0;padding:0;text-decoration:underline;min-height:0">${esc(E.TEMPLATES[m.template].name)}</button></span><span class="row">${chChip(m)}<span class="chip ${esc(m.status)}">${m.status === 'envoye' ? 'Envoyé' : 'Planifié'}</span></span></li>`).join('')}</ul>` : '<div class="empty">Aucun message.</div>'}</section>
        </div>
      </div>`;
    bindActs(view);
    $('#pp-ch').addEventListener('change', e => { p.channel = e.target.value; persist(); toast('Rappels par ' + E.CHANNELS[p.channel]); });
    const notes = $('#pp-notes'); notes.addEventListener('input', () => { S.notes = S.notes || {}; S.notes[id] = notes.value; persist(); $('#pp-saved').textContent = 'Enregistrées à ' + new Date().toTimeString().slice(0, 5) + '.'; });
    $$('[data-mail]').forEach(b => b.addEventListener('click', () => showMail(S.emails.find(m => m.id === b.dataset.mail))));
    $('#pp-export').addEventListener('click', () => {
      const data = { patient: p, rendezvous: list, questionnaires: S.submissions.filter(s => s.patient === id), messages: mails, notes: (S.notes || {})[id] || '' };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'dossier-' + p.last.toLowerCase().replace(/[^a-z]/g, '') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Dossier exporté (droit d’accès du patient)');
    });
  }

  /* ===================== Questionnaires ===================== */
  let qTab = 'recus';
  function vQuestionnaires() {
    const rdv1 = upcoming().filter(a => a.type === 'rdv1');
    const pending = rdv1.filter(a => ['attente', 'bientot'].includes(qStatus(a).key)), late = rdv1.filter(a => qStatus(a).key === 'retard');
    const recv = S.submissions.slice().sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1));
    const tab = (k, l, n) => `<button type="button" data-t="${k}" aria-pressed="${qTab === k}">${l} · ${n}</button>`;
    let body = '';
    if (qTab === 'recus') body = `<table class="t"><thead><tr><th>Reçu le</th><th>Patient</th><th>Axes prioritaires</th><th>Vigilance</th><th>Fiche cortisol</th><th></th></tr></thead><tbody>${recv.map(s => { const pr = E.priorities(E.profile(s.answers, s.sex)), f = E.flags(s.answers); return `<tr><td>${esc(E.fmt(s.receivedOn))}</td><td><a href="#questionnaire/${esc(s.id)}">${esc(name(P(s.patient)))}</a>${s.web ? ' <span class="chip bientot">nouveau</span>' : ''}</td><td class="small">${pr.map(a => `<span class="chip moyenne">${esc(a.name)} ${a.score}</span>`).join(' ') || '<span class="muted">aucun axe marqué</span>'}</td><td>${f.length ? `<span class="chip retard">${f.length}</span>` : '<span class="muted">·</span>'}</td><td>${(s.cortisol || []).length || '<span class="muted">·</span>'}</td><td><button class="btn xs ai" type="button" data-act="pre" data-p="${esc(s.patient)}">Synthèse IA</button></td></tr>`; }).join('')}</tbody></table>`;
    else { const arr = qTab === 'attente' ? pending : late; body = arr.length ? `<table class="t"><thead><tr><th>Patient</th><th>Rendez-vous</th><th>Échéance</th><th>Statut</th><th>Rappels par</th><th></th></tr></thead><tbody>${arr.map(a => `<tr><td><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a></td><td>${esc(fmtShort(a.date))} · ${esc(lieu(a.lieu).short)}</td><td>${esc(E.fmt(E.dueDate(a.date)))}</td><td>${chip(qStatus(a))}</td><td>${chChip(P(a.patient))}</td><td><button class="btn xs" type="button" data-act="remind" data-a="${esc(a.id)}">Relancer</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Aucun questionnaire dans cette catégorie.</div>'; }
    view.innerHTML = head('Questionnaires', 'Reçus en ligne, scores calculés à la réception : plus de scan ni de courrier.', '<a class="btn ghost sm" href="questionnaire.html">Voir le questionnaire patient</a>') +
      `<div class="notice info small">Règle du cabinet : le questionnaire arrive au moins un mois avant le rendez-vous. ${roleChip('auto')} rappels à J-37 et J-32, alerte au cabinet à J-30. ${roleChip('ia')} synthèse prête la veille.</div>
      <div class="tabs">${tab('recus', 'Reçus', recv.length)}${tab('attente', 'Attendus', pending.length)}${tab('retard', 'En retard', late.length)}</div><div class="box" style="padding:4px 14px;overflow-x:auto">${body}</div>`;
    $$('[data-t]').forEach(b => b.addEventListener('click', () => { qTab = b.dataset.t; vQuestionnaires(); labelTables(); }));
    bindActs(view);
  }

  function vQuestionnaire(id) {
    const s = S.submissions.find(x => x.id === id); if (!s) { view.innerHTML = head('Questionnaire introuvable'); return; }
    const p = P(s.patient), prof = E.profile(s.answers, s.sex).filter(Boolean), fl = E.flags(s.answers), pri = E.priorities(prof);
    view.innerHTML = `<p class="crumbs"><a href="#questionnaires">Questionnaires</a> · <a href="#patient/${esc(p.id)}">${esc(name(p))}</a></p>` + head('Questionnaire de ' + esc(name(p)), 'Reçu ' + esc(s.source) + ' le ' + esc(E.fmt(s.receivedOn)), `<button class="btn ai sm" type="button" id="qq-ai">Synthèse IA</button><button class="btn ghost sm" type="button" id="qq-print">Imprimer</button>`) + `
      <div class="grid g-main">
        <section class="box"><h2>Profil fonctionnel · ${prof.length} axes</h2>${profileBars(s, 99, true)}</section>
        <div class="grid" style="align-content:start">
          <section class="box"><h2>À explorer en priorité</h2>${pri.length ? pri.map(a => `<p style="margin:0 0 8px"><span class="chip moyenne">${esc(a.name)} · ${a.score}/100</span><br><span class="small muted">${esc(a.top.slice(0, 4).join(', ') || 'signes modérés')}</span></p>`).join('') : '<div class="empty">Aucun axe marqué.</div>'}</section>
          ${fl.length ? `<div class="notice danger"><b>À vérifier</b><ul style="margin:6px 0 0;padding-left:18px">${fl.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
          ${s.cortisol && s.cortisol.length ? `<section class="box"><h2>Fiche cortisol</h2>${s.cortisol.map(c => `<span class="hl">${esc(c)}</span>`).join(' · ')}</section>` : ''}
        </div>
      </div>
      <section class="box" style="margin-top:12px"><h2>Réponses détaillées</h2>
        ${E.AXES.map(a => { const items = E.itemsFor(a, s.sex); if (!items.length) return ''; return `<details class="faq"><summary>${esc(a.name)} · ${prof.find(x => x.id === a.id).score}/100</summary><table class="t" style="margin-top:6px"><tbody>${items.map(({ t, i }) => { const val = Number(s.answers[a.id + ':' + i] || 0); return `<tr><td>${esc(t)}</td><td style="width:200px">${val ? `<span class="${val >= 2 ? 'hl' : ''}">${esc(E.SCALE[val])}</span>` : '<span class="muted">Non / jamais</span>'}</td></tr>`; }).join('')}</tbody></table></details>`; }).join('')}
      </section>`;
    $('#qq-print').addEventListener('click', () => window.print());
    $('#qq-ai').addEventListener('click', () => dialog(Ai.preSummaryHtml(s, p)));
  }

  /* ===================== Messages ===================== */
  let mTab = 'envoye';
  function vEmails() {
    const sent = S.emails.filter(m => m.status === 'envoye').sort((a, b) => (a.at < b.at ? 1 : -1)), planned = S.emails.filter(m => m.status === 'planifie').sort((a, b) => (a.at > b.at ? 1 : -1));
    const byCh = k => S.emails.filter(m => (m.channel || 'email') === k).length;
    let body;
    if (mTab === 'modeles') {
      body = `<div class="grid g-main"><section class="box"><h2>Modèle</h2><div class="field"><label for="tp">Choisir un modèle</label><select id="tp">${Object.entries(E.TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ts">Objet</label><input id="ts" type="text"></div><div class="field"><label for="tb">Message</label><textarea id="tb" style="min-height:220px"></textarea><span class="hint">Variables : {prenom} {date} {heure} {lieu} {echeance} {lien} {patient}</span></div><button class="btn sm" type="button" id="tsave">Enregistrer le modèle</button></section>
        <section class="box"><h2>Aperçu e-mail</h2><div id="tprev"></div><h2 style="margin-top:14px">Version SMS et WhatsApp</h2><div id="tsms"></div></section></div>`;
    } else {
      const arr = mTab === 'envoye' ? sent : planned;
      body = `<div class="box" style="padding:4px 14px;overflow-x:auto"><table class="t"><thead><tr><th>${mTab === 'envoye' ? 'Envoyé le' : 'Prévu le'}</th><th>Patient</th><th>Message</th><th>Canal</th><th>Origine</th><th></th></tr></thead><tbody>${arr.slice(0, 80).map(m => `<tr><td>${esc(E.fmt(m.at))}</td><td><a href="#patient/${esc(m.patient)}">${esc(name(P(m.patient)))}</a></td><td>${esc(E.TEMPLATES[m.template].name)}</td><td>${chChip(m)}</td><td><span class="chip r-${m.template === 'medecin' ? 'ia' : 'auto'}">${m.template === 'medecin' ? 'IA · validé' : 'Automatique'}</span></td><td><button class="btn ghost xs" type="button" data-m="${esc(m.id)}">Voir</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    view.innerHTML = head('Messages', 'E-mail, SMS ou WhatsApp, selon la préférence du patient : chaque message part au bon moment, sans copier-coller.') + `
      <div class="kpis k4"><div class="kpi c-blue"><b>${sent.length}</b><span>Envoyés</span><small>tous automatiques</small></div><div class="kpi c-slate"><b>${byCh('email')}</b><span>E-mails</span><small>détail complet</small></div><div class="kpi c-blue"><b>${byCh('sms')}</b><span>SMS</span><small>logistique uniquement</small></div><div class="kpi c-green"><b>${byCh('whatsapp')}</b><span>WhatsApp</span><small>modèles approuvés</small></div></div>
      <div class="tabs"><button type="button" data-mt="envoye" aria-pressed="${mTab === 'envoye'}">Envoyés · ${sent.length}</button><button type="button" data-mt="planifie" aria-pressed="${mTab === 'planifie'}">Planifiés · ${planned.length}</button><button type="button" data-mt="modeles" aria-pressed="${mTab === 'modeles'}">Modèles</button></div>${body}`;
    $$('[data-mt]').forEach(b => b.addEventListener('click', () => { mTab = b.dataset.mt; vEmails(); labelTables(); }));
    $$('[data-m]').forEach(b => b.addEventListener('click', () => showMail(S.emails.find(m => m.id === b.dataset.m))));
    if (mTab === 'modeles') {
      const sel = $('#tp'), ts = $('#ts'), tb = $('#tb');
      const fake = { prenom: 'Claire', patient: 'Claire Vandenbroucke', date: E.fmt(E.addDays(TODAY, 40), true), heure: '10 h 30', lieu: Demo.LIEUX[0].name + ', ' + Demo.LIEUX[0].address, lieuCourt: 'Anderlecht', echeance: E.fmt(E.addDays(TODAY, 10)), lien: 'cabinet.be/q/7KD2' };
      const prev = () => {
        const f = s => s.replace(/\{(\w+)\}/g, (x, k) => (fake[k] != null ? fake[k] : x));
        $('#tprev').innerHTML = `<div class="mail"><header><span><b>Objet :</b> ${esc(f(ts.value))}</span></header><pre>${esc(f(tb.value))}</pre></div>`;
        const sms = E.SHORT[sel.value] ? E.render(sel.value, fake, 'sms').body : '';
        $('#tsms').innerHTML = sms ? `<div class="phone" style="margin:0"><div class="bubble sms">${esc(sms)}<small>${sms.length} caractères</small></div></div>` : '<div class="empty">Ce message part uniquement par e-mail.</div>';
      };
      const load = () => { const k = sel.value, t = Object.assign({}, E.TEMPLATES[k], (S.templates || {})[k] || {}); ts.value = t.subject; tb.value = t.body; prev(); };
      sel.addEventListener('change', load); ts.addEventListener('input', prev); tb.addEventListener('input', prev);
      $('#tsave').addEventListener('click', () => { S.templates = S.templates || {}; S.templates[sel.value] = { subject: ts.value, body: tb.value }; persist(); toast('Modèle enregistré'); });
      load();
    }
  }

  /* ===================== Statistiques ===================== */
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  function cols(data, label) {
    const max = Math.max(1, ...data.map(d => d.v));
    return `<div class="colchart" role="img" aria-label="${esc(label)}">${data.map(d => `<div class="col-i${d.cur ? ' cur' : d.past ? ' past' : ''}" tabindex="0"><i style="height:${Math.max(2, Math.round(100 * d.v / max))}%"></i><span class="tip"><b>${d.v}</b> ${esc(d.tip)}</span><small>${esc(d.x)}</small></div>`).join('')}</div>`;
  }
  function hbars(rows, c) {
    const max = Math.max(1, ...rows.map(r => r.v));
    return `<div class="bars" style="--c:var(--${c || 'slate'})">${rows.map(r => `<div class="bar" title="${esc(r.k)} : ${r.v}"><span>${esc(r.k)}</span><span class="track"><i style="width:${Math.round(100 * r.v / max)}%"></i></span><b>${r.v}</b></div>`).join('')}</div>`;
  }
  const table = (h, rows) => `<details class="tview"><summary>Voir en tableau</summary><table class="t"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${esc(String(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  function vStats() {
    const all = appts(), r1 = all.filter(a => a.type === 'rdv1');
    const dueGone = r1.filter(a => E.iso(E.dueDate(a.date)) <= T);
    const onTime = dueGone.filter(a => { const s = subFor(a); return s && s.receivedOn <= E.iso(E.dueDate(a.date)); });
    const adv = r1.map(a => { const s = subFor(a); return s ? Math.round((E.day(a.date) - E.day(s.receivedOn)) / 86400000) : null; }).filter(x => x != null && x >= 0);
    const avgAdv = adv.length ? Math.round(adv.reduce((x, y) => x + y, 0) / adv.length) : 0;
    const in30 = upcoming().filter(a => a.date < E.iso(E.addDays(TODAY, 30))).length;
    const past90 = all.filter(a => a.date < T && a.date >= E.iso(E.addDays(TODAY, -90)));
    const absent = past90.filter(a => a.status === 'absent').length;
    const month = T.slice(0, 7), sentMonth = S.emails.filter(m => m.status === 'envoye' && m.at.slice(0, 7) === month).length;
    const subs90 = S.submissions.filter(s => s.receivedOn >= E.iso(E.addDays(TODAY, -90))).length;
    const minutes = sentMonth * 4 + subs90 / 3 * 10;
    const mon = E.addDays(TODAY, -((TODAY.getDay() + 6) % 7));
    const weeks = [];
    for (let i = -8; i <= 8; i++) {
      const a = E.iso(E.addDays(mon, 7 * i)), b = E.iso(E.addDays(mon, 7 * i + 7));
      const v = all.filter(x => x.date >= a && x.date < b && x.status !== 'annule').length;
      weeks.push({ v, x: i === 0 ? 'cette sem.' : (i > 0 ? '+' : '') + i, tip: 'RDV, semaine du ' + E.fmt(a), cur: i === 0, past: i < 0, a });
    }
    const axisCount = E.AXES.map(ax => ({ k: ax.name, v: S.submissions.filter(s => { const pr = E.profile(s.answers, s.sex).find(x => x && x.id === ax.id); return pr && pr.score >= 50; }).length })).filter(r => r.v).sort((x, y) => y.v - x.v).slice(0, 8);
    const by = f => Object.entries(S.patients.reduce((o, p) => { const k = f(p); o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, v]) => ({ k, v })).sort((x, y) => y.v - x.v);
    const origin = by(p => p.referrer || 'Non renseigné'), chans = by(p => E.CHANNELS[p.channel || 'email']);
    const J = S.patients.map(p => journey(p.id).i), maxS = Math.max(1, ...STAGES.map((s, i) => J.filter(x => x === i).length));
    const tiles = [
      ['c-green', pct(onTime.length, dueGone.length) + ' %', 'Questionnaires reçus à temps', onTime.length + ' sur ' + dueGone.length + ' premières consultations'],
      ['c-teal', avgAdv + ' j', 'Avance moyenne', 'objectif : 30 jours au moins'],
      ['c-slate', in30, 'RDV dans les 30 jours', upcoming().length + ' au total dans l’agenda'],
      ['c-red', absent, 'RDV manqués (90 j)', pct(absent, past90.length) + ' % des rendez-vous passés'],
      ['c-blue', sentMonth, 'Messages automatiques', 'ce mois · e-mail, SMS, WhatsApp'],
      ['c-violet', (Math.round(minutes / 6) / 10).toString().replace('.', ',') + ' h', 'Secrétariat évité', 'estimation : 4 min par message, 10 min par questionnaire ressaisi'],
    ];
    view.innerHTML = head('Statistiques', 'Calculées à partir de l’agenda, des questionnaires et des messages.') + `
      <div class="kpis">${tiles.map(([c, v, l, d]) => `<div class="kpi ${c}"><b>${esc(String(v))}</b><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('')}</div>
      <div class="grid sgrid">
        <section class="box"><h2>Rendez-vous par semaine</h2><p class="small muted" style="margin:-6px 0 0">Huit semaines passées (clair), la semaine en cours (jaune), huit à venir.</p>${cols(weeks, 'Rendez-vous par semaine')}${table(['Semaine du', 'Rendez-vous'], weeks.map(w => [E.fmt(w.a), w.v]))}</section>
        <section class="box"><h2>Patients par étape <a href="#parcours">Parcours</a></h2><div class="funnel">${STAGES.map((s, i) => { const n = J.filter(x => x === i).length; return `<a href="#parcours" class="s${i}"><span class="dot">${esc(s.name)}</span><span><i style="width:${Math.round(100 * n / maxS)}%"></i></span><b>${n}</b></a>`; }).join('')}</div>${table(['Étape', 'Patients'], STAGES.map((s, i) => [s.name, J.filter(x => x === i).length]))}</section>
      </div>
      <div class="grid g-3" style="margin-top:12px">
        <section class="box"><h2>Axes les plus marqués</h2><p class="small muted" style="margin:-6px 0 8px">Questionnaires avec un score de 50 ou plus.</p>${hbars(axisCount, 'orange')}${table(['Axe', 'Questionnaires'], axisCount.map(r => [r.k, r.v]))}</section>
        <section class="box"><h2>Origine des patients</h2>${hbars(origin, 'teal')}${table(['Origine', 'Patients'], origin.map(r => [r.k, r.v]))}</section>
        <section class="box"><h2>Canal des rappels</h2>${hbars(chans, 'blue')}${table(['Canal', 'Patients'], chans.map(r => [r.k, r.v]))}<p class="small muted" style="margin:8px 0 0">Choisi par le patient à la prise de rendez-vous.</p></section>
      </div>`;
  }

  /* ===================== Automatisations : phases × rôles ===================== */
  const PHASES = [['Prise de rendez-vous', 'vers J-45'], ['Avant le RDV 1', 'J-37 à J-30'], ['La veille', 'J-1'], ['Consultation', 'jour J'], ['Après le RDV 1', 'biologie'], ['Après le RDV 2', 'suivi']];
  const LANES = [['auto', 'Automatique', 'Part tout seul, sans vous', 'c-blue'], ['ia', 'IA · vous validez', 'Préparé par l’IA, rien ne part sans vous', 'c-violet'], ['vous', 'Vous', 'Ce qui reste humain', 'c-green']];
  const CH = ['email', 'sms', 'whatsapp'];
  const AUTOS = [
    ['auto', 0, 'confirmation', 'Confirmation et lien du questionnaire', 'À la prise de RDV', 'Date, cabinet, échéance du questionnaire, documents à apporter.', CH, 'confirmation'],
    ['auto', 1, 'rappel1', 'Rappel du questionnaire', 'J-37', 'Seulement si le questionnaire manque.', CH, 'rappel1'],
    ['auto', 1, 'rappel2', 'Dernier rappel', 'J-32', 'Mentionne le risque d’annulation.', CH, 'rappel2'],
    ['auto', 1, 'alerte', 'Alerte au cabinet', 'J-30', 'Questionnaire toujours manquant : vous êtes prévenue.', null],
    ['auto', 1, null, 'Scores et vigilance calculés', 'À réception', '23 axes notés de 0 à 100, points de vigilance repérés.', null],
    ['auto', 2, 'veille', 'Rappel de la veille', 'J-1', 'Carte d’identité, 2 vignettes, dernière prise de sang, règle d’annulation.', CH, 'veille'],
    ['auto', 3, null, 'Absence détectée', 'Jour J', 'RDV non annulé : alerte et règle de facturation appliquée.', null],
    ['auto', 4, 'biologie', 'Demande de biologie', 'Après le RDV 1', 'Demande et consignes du laboratoire spécialisé.', ['email'], 'biologie'],
    ['auto', 5, 'hormonologie', 'Proposition d’hormonologie', 'Après 2 consultations', 'Rendez-vous avec le Dr Résimont, si vous le validez.', ['email']],
    ['ia', 0, null, 'Tri des e-mails entrants', 'À réception', 'Déplacement, question pratique, résultats, inquiétude : réponse proposée.', null],
    ['ia', 1, null, 'Questionnaire papier lu', 'À réception du scan', 'Cases et écriture reconnues, doutes signalés.', null],
    ['ia', 2, null, 'Synthèse pré-consultation', 'La veille', 'Ce qui ressort, questions à poser, biologie à envisager.', null],
    ['ia', 3, null, 'Transcription et résumé', 'Pendant, avec accord', 'Résumé structuré en 9 rubriques, audio supprimé après validation.', null],
    ['ia', 4, null, 'Lecture de la prise de sang', 'À réception du PDF', 'Valeurs, normes du laboratoire, écarts, évolution.', null],
    ['ia', 5, 'medecin', 'Compte rendu au médecin', 'Après le RDV 2', 'Brouillon prêt, envoyé après relecture et accord du patient.', ['email'], 'medecin'],
    ['ia', 5, null, 'Fiche conseils patient', 'Après validation', 'Vos recommandations en mots simples, dans sa langue.', ['email']],
    ['vous', 1, null, 'Décider à J-30', 'Si l’alerte arrive', 'Garder ou libérer le créneau.', null],
    ['vous', 2, null, 'Relire la synthèse', '2 minutes', 'Avant d’accueillir le patient.', null],
    ['vous', 3, null, 'Mener la consultation', 'Puis valider le résumé', 'Le contenu et les recommandations restent les vôtres.', null],
    ['vous', 4, null, 'Interpréter la biologie', 'Au RDV 2', 'Ajuster le traitement.', null],
    ['vous', 5, null, 'Relire et envoyer', 'Compte rendu, fiche', 'Rien ne part sans votre validation.', null],
  ];
  /* ---------- canaux : une tuile colorée et un pictogramme par destination ---------- */
  const GLYPH = {
    email: '<path d="M4 6.5h16v11H4z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M4.5 7l7.5 6 7.5-6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>',
    sms: '<path d="M4 5h16v11h-9l-5 4v-4H4z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="10.5" r="1.1" fill="#fff"/><circle cx="12" cy="10.5" r="1.1" fill="#fff"/><circle cx="15.5" cy="10.5" r="1.1" fill="#fff"/>',
    whatsapp: '<path d="M12 3.6a8.4 8.4 0 0 0-7.2 12.7L3.7 20.3l4.1-1.1A8.4 8.4 0 1 0 12 3.6z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 8.4c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.3l.6 1.4c.1.2 0 .3-.1.5l-.4.5c.5.9 1.2 1.6 2.1 2.1l.5-.4c.2-.1.3-.2.5-.1l1.4.6c.2.1.3.2.3.4v.4c0 .3-.1.5-.4.7-.5.3-1.4.4-2.8-.4a7.4 7.4 0 0 1-2.9-2.9c-.8-1.4-.7-2.3-.3-2.7z" fill="#fff"/>',
    instagram: '<rect x="4.5" y="4.5" width="15" height="15" rx="4.5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.6" cy="7.4" r="1.1" fill="#fff"/>',
    agenda: '<rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><rect x="8" y="13" width="3" height="3" rx=".6" fill="#fff"/>',
    dossier: '<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2H19a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>',
    cabinet: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="#fff" stroke-width="1.8"/>',
    medecin: '<rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="15" r="1.4" fill="#fff"/>',
  };
  const DEST = {
    email: ['E-mail', 'Adresse du cabinet, domaine vérifié', 'Le détail complet : documents, consignes, liens.'],
    sms: ['SMS', 'Prestataire européen, expéditeur « Cabinet AD »', 'Logistique seulement : date, heure, lieu, lien.'],
    whatsapp: ['WhatsApp', 'WhatsApp Business, modèles approuvés', 'Logistique seulement, au choix du patient.'],
    instagram: ['Instagram', 'Compte professionnel du cabinet', 'Lien de prise de RDV et conseils généraux. Jamais de santé personnelle.'],
    agenda: ['Agenda', 'Google Agenda ou Outlook', 'Créneaux synchronisés, plus de double saisie.'],
    dossier: ['Dossier patient', 'Espace praticienne, chiffré', 'Scores, synthèses, résumés, biologie.'],
    cabinet: ['Alerte cabinet', 'Dans cet espace et par e-mail', 'Ce qui demande votre décision.'],
    medecin: ['Médecin traitant', 'E-mail ou messagerie sécurisée', 'Compte rendu, avec l’accord du patient.'],
  };
  const logo = (k, small) => `<span class="logo lg-${k}${small ? ' sm' : ''}" title="${esc(DEST[k][0])}" role="img" aria-label="${esc(DEST[k][0])}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[k]}</svg></span>`;
  const TRIG = {
    rdv: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M9 14.5l2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    form: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    absent: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 11.5-4.2M16 15l5 5M21 15l-5 5"/>',
    done: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8z"/>',
    repeat: '<path d="M17 3.5l3 3-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5l-3-3 3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/>',
  };
  const tic = k => GLYPH[k] ? logo(k) : `<span class="tic"><svg viewBox="0 0 24 24" aria-hidden="true">${TRIG[k]}</svg></span>`;
  const PAT = ['email', 'sms', 'whatsapp'];
  /* [phase, déclencheur (icône, texte, quand), rôle, action, détail, destinations, règle, modèle compté, valeur par défaut] */
  const FLOWS = [
    [0, ['rdv', 'Rendez-vous pris en ligne', 'à toute heure'], 'auto', 'Confirmation et lien du questionnaire', 'Date, cabinet, échéance du questionnaire, documents à apporter.', [...PAT, 'agenda'], 'confirmation', 'confirmation'],
    [0, ['instagram', 'Message reçu sur Instagram', '« Comment prendre rendez-vous ? »'], 'ia', 'Réponse avec le lien de prise de RDV', 'Toute question de santé est renvoyée vers la consultation, jamais traitée en message.', ['instagram'], 'insta_dm', null, true],
    [0, ['email', 'E-mail d’un patient', 'à chaque message'], 'ia', 'Classé et réponse proposée', 'Déplacement, question pratique, résultats ou inquiétude (renvoi vers le médecin ou le 112).', ['email', 'cabinet'], null],
    [1, ['form', 'Questionnaire reçu', 'en ligne ou scanné'], 'auto', 'Scores des 23 axes et points de vigilance', 'Calculés à la réception, rangés dans la fiche.', ['dossier'], null],
    [1, ['clock', 'J-37, questionnaire manquant', 'rappel'], 'auto', 'Rappel du questionnaire', 'Seulement si le questionnaire n’est pas arrivé.', PAT, 'rappel1', 'rappel1'],
    [1, ['clock', 'J-32, toujours manquant', 'dernier rappel'], 'auto', 'Dernier rappel', 'Mentionne le risque d’annulation du rendez-vous.', PAT, 'rappel2', 'rappel2'],
    [1, ['clock', 'J-30, toujours manquant', 'décision'], 'auto', 'Alerte au cabinet', 'Vous décidez : relancer, garder ou libérer le créneau.', ['cabinet'], 'alerte'],
    [2, ['clock', 'La veille du rendez-vous', 'J-1, 10 h'], 'auto', 'Rappel de la veille', 'Carte d’identité, 2 vignettes de mutuelle, dernière prise de sang.', PAT, 'veille', 'veille'],
    [2, ['form', 'La veille, questionnaire reçu', 'J-1'], 'ia', 'Synthèse pré-consultation', 'Ce qui ressort, questions à poser, biologie à envisager.', ['dossier'], null],
    [3, ['mic', 'Enregistrement lancé', 'avec l’accord du patient'], 'ia', 'Transcription et résumé structuré', 'Neuf rubriques à valider, audio supprimé ensuite.', ['dossier'], null],
    [3, ['absent', 'Patient absent, RDV non annulé', 'jour J'], 'auto', 'Alerte et règle de facturation', 'Le patient reçoit le rappel de la règle du cabinet.', ['cabinet', 'email'], null],
    [4, ['done', 'RDV 1 terminé', 'jour J'], 'auto', 'Demande de biologie et consignes du labo', 'Laboratoire spécialisé, à jeun selon les analyses.', ['email'], 'biologie', 'biologie'],
    [4, ['drop', 'Résultats du labo reçus', 'PDF'], 'ia', 'Valeurs extraites, écarts mis en évidence', 'À côté du profil fonctionnel, pour le RDV 2.', ['dossier', 'cabinet'], null],
    [5, ['done', 'RDV 2 terminé', 'résumé validé'], 'ia', 'Compte rendu au médecin traitant', 'Envoyé après votre relecture, si le patient l’accepte.', ['medecin'], 'medecin', 'medecin'],
    [5, ['done', 'Résumé validé', 'après chaque consultation'], 'ia', 'Fiche conseils pour le patient', 'Vos recommandations en mots simples, dans sa langue.', ['email', 'whatsapp'], 'fiche', null, true],
    [5, ['done', 'Deux consultations faites', 'suivi'], 'auto', 'Proposition d’hormonologie', 'Rendez-vous avec le Dr Résimont, si vous le validez.', ['email'], 'hormonologie'],
    [5, ['clock', 'Trois mois après le dernier RDV', 'suivi'], 'auto', 'Message de suivi et lien de rendez-vous', 'Garder le lien sans relance téléphonique.', PAT, 'suivi3', null, true],
    [6, ['repeat', 'Chaque lundi', 'communication'], 'ia', 'Conseil nutrition de la semaine', 'Rédigé par l’IA, publié après votre validation. Aucune donnée patient.', ['instagram'], 'insta_post', null, false],
  ];
  const FPH = ['Prise de rendez-vous', 'Avant le RDV 1', 'La veille', 'Pendant la consultation', 'Après le RDV 1', 'Après le RDV 2 et suivi', 'Communication du cabinet'];
  let aTab = 'flux', aDest = '';
  const ruleOn = f => (f[6] ? (S.automations[f[6]] != null ? S.automations[f[6]] : f[8] !== false) : true);
  function flowsHtml() {
    const count = tpl => tpl ? S.emails.filter(m => m.template === tpl).length : 0;
    const uses = k => FLOWS.filter(f => f[5].includes(k));
    const hub = Object.keys(DEST).map(k => { const on = ['dossier', 'cabinet', 'medecin', 'agenda'].includes(k) || (S.channels || {})[k]; const n = uses(k).filter(ruleOn).length; return `<button type="button" class="dest${aDest === k ? ' on' : ''}" data-dest="${k}" aria-pressed="${aDest === k}">${logo(k)}<span><b>${esc(DEST[k][0])}</b><small>${n} automatisation${n > 1 ? 's' : ''} · ${on ? 'connecté (démo)' : 'à connecter'}</small></span></button>`; }).join('');
    const arrow = '<span class="arr" aria-hidden="true"><svg viewBox="0 0 28 12"><path d="M1 6h24M20 1.5L25.5 6 20 10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    const row = f => {
      const [, [ti, tt, tw], role, act, det, dest, key, tpl] = f, on = ruleOn(f), n = count(tpl);
      return `<div class="fl${on ? '' : ' off'}">
        <div class="f-trig">${tic(ti)}<span><b>${esc(tt)}</b><small>${esc(tw)}</small></span></div>${arrow}
        <div class="f-act ${role === 'ia' ? 'c-violet' : 'c-blue'}"><span class="chip r-${role}">${role === 'ia' ? 'IA · vous validez' : 'Automatique'}</span><b>${esc(act)}</b><small>${esc(det)}</small></div>${arrow}
        <div class="f-to"><span class="logos">${dest.map(k => logo(k)).join('')}</span><small>${esc(dest.map(k => DEST[k][0]).join(' · '))}${dest.some(k => PAT.includes(k)) && dest.filter(k => PAT.includes(k)).length > 1 ? ', selon le choix du patient' : ''}</small></div>
        <div class="f-ctl">${key ? `<input class="tg" type="checkbox" role="switch" aria-label="${esc(act)}" data-auto="${key}"${on ? ' checked' : ''}>` : '<span class="chip ok">toujours actif</span>'}${n ? `<small>${n} envois</small>` : ''}</div>
      </div>`;
    };
    const shown = FLOWS.filter(f => !aDest || f[5].includes(aDest));
    return `<div class="hub">${hub}</div>
      ${aDest ? `<p class="small" style="margin:0 0 8px">${logo(aDest, true)} <b>${esc(DEST[aDest][0])}</b> · ${esc(DEST[aDest][1])}. ${esc(DEST[aDest][2])} <button type="button" class="btn ghost xs" data-dest="">Tout afficher</button></p>` : ''}
      <div class="flowlist">${FPH.map((ph, i) => { const l = shown.filter(f => f[0] === i); return l.length ? `<p class="grp-h c-slate">${esc(ph)}</p>${l.map(row).join('')}` : ''; }).join('')}</div>`;
  }
  function matrixHtml() {
    const count = tpl => tpl ? S.emails.filter(m => m.template === tpl).length : 0;
    const lane = LANES.reduce((o, l) => { o[l[0]] = l; return o; }, {});
    const au = x => { const [r, , key, t, w, d, chs, tpl] = x, on = !key || S.automations[key], n = count(tpl), L = lane[r]; return `<div class="au ${L[3]}${on ? '' : ' offr'}"><div class="hd"><b>${esc(t)}</b>${key ? `<input class="tg" type="checkbox" role="switch" aria-label="${esc(t)}" data-auto="${key}"${on ? ' checked' : ''}>` : ''}</div><span class="w">${esc(w)}</span><p>${esc(d)}</p><div class="row"><span class="chip r-${r} m-role">${esc(L[1])}</span>${chs ? `<span class="logos">${chs.map(c => logo(c, true)).join('')}</span>` : ''}${n ? `<span class="chip">${n} envois</span>` : ''}</div></div>`; };
    let grid = LANES.map((l, li) => `<div class="ln ${l[3]}" style="grid-row:${li + 2}">${esc(l[1])}<small>${esc(l[2])}</small></div>`).join('');
    PHASES.forEach(([t, s], pi) => {
      grid += `<div class="ph" style="grid-column:${pi + 2}">${esc(t)}<small>${esc(s)}</small></div>`;
      LANES.forEach((l, li) => { const items = AUTOS.filter(x => x[0] === l[0] && x[1] === pi); grid += `<div class="cell" style="grid-column:${pi + 2};grid-row:${li + 2}">${items.map(au).join('') || '<div class="none">Rien à faire</div>'}</div>`; });
    });
    return `<div class="matrix" role="table" aria-label="Automatisations par phase et par rôle">${grid}</div>`;
  }
  function vAutomations() {
    const keyed = FLOWS.filter(f => f[6]), active = keyed.filter(ruleOn).length;
    const month = T.slice(0, 7), sentMonth = S.emails.filter(m => m.status === 'envoye' && m.at.slice(0, 7) === month).length;
    const planned7 = S.emails.filter(m => m.status === 'planifie' && m.at <= E.iso(E.addDays(TODAY, 7))).length;
    const plan = E.reminderPlan(E.addDays(TODAY, 45), TODAY);
    view.innerHTML = head('Automatisations', 'Ce qui déclenche chaque tâche, ce qu’elle fait, et par où elle part.', `<span class="legendbar" style="margin:0">${roleChip('auto')}${roleChip('ia')}</span>`) + `
      <div class="kpis k4">
        <div class="kpi c-green"><b>${active}/${keyed.length}</b><span>Règles actives</span><small>un interrupteur par règle</small></div>
        <div class="kpi c-blue"><b>${sentMonth}</b><span>Messages ce mois</span><small>aucun écrit à la main</small></div>
        <div class="kpi c-slate"><b>${planned7}</b><span>Planifiés sous 7 jours</span><small>partiront seuls</small></div>
        <div class="kpi c-violet"><b>0</b><span>Envoi sans validation</span><small>pour tout ce que prépare l’IA</small></div>
      </div>
      <div class="tabs"><button type="button" data-at="flux" aria-pressed="${aTab === 'flux'}">Flux par tâche</button><button type="button" data-at="phases" aria-pressed="${aTab === 'phases'}">Vue par phase et par rôle</button></div>
      ${aTab === 'flux' ? flowsHtml() : matrixHtml()}
      <div class="grid g-2" style="margin-top:12px">
        <section class="box"><h2>Exemple : un rendez-vous pris aujourd’hui pour le ${esc(fmtShort(E.iso(E.addDays(TODAY, 45))))}</h2><ol class="timeline">${plan.map((s, i) => `<li class="${i === 0 ? 'done' : ''}"><b>${esc(E.fmt(s.at))}</b> ${s.key === 'alerte' ? logo('cabinet', true) : `<span class="logos">${PAT.map(k => logo(k, true)).join('')}</span>`}<br><span class="small">${esc(s.label)}</span></li>`).join('')}</ol></section>
        <section class="box"><h2>Ce qui ne part jamais sans vous</h2><ul class="list todo">${['Le contenu de la consultation et les recommandations', 'L’envoi d’un compte rendu au médecin', 'La décision d’annuler un rendez-vous sans questionnaire', 'Toute réponse personnelle à un patient', 'Tout texte rédigé par l’IA, y compris les publications Instagram'].map(t => `<li class="c-green"><i aria-hidden="true"></i><span>${esc(t)}</span><span></span></li>`).join('')}</ul></section>
      </div>`;
    $$('[data-at]').forEach(b => b.addEventListener('click', () => { aTab = b.dataset.at; vAutomations(); }));
    $$('[data-dest]').forEach(b => b.addEventListener('click', () => { aDest = aDest === b.dataset.dest ? '' : b.dataset.dest; vAutomations(); }));
    $$('[data-auto]').forEach(i => i.addEventListener('change', () => { S.automations[i.dataset.auto] = i.checked; persist(); toast(i.checked ? 'Règle activée' : 'Règle désactivée'); vAutomations(); }));
  }

  /* ===================== Réglages ===================== */
  function vSettings() {
    view.innerHTML = head('Réglages', 'Les règles du cabinet, appliquées partout.') + `
      <div class="grid g-4">
        <section class="box"><h2>Cabinets</h2>${Demo.LIEUX.map(l => `<p style="margin:0 0 8px"><b>${esc(l.name)}</b><br><span class="muted">${esc(l.address)}</span></p>`).join('')}<p class="small muted" style="margin:0">Le suivi d’un patient reste toujours au même cabinet.</p></section>
        <section class="box"><h2>Règles</h2><dl class="kv" style="grid-template-columns:1fr auto"><dt>Questionnaire avant le RDV</dt><dd><b>30 jours</b></dd><dt>Pas de consultation</dt><dd><b>3e semaine</b></dd><dt>Délai de prise de RDV</dt><dd><b>35 jours min.</b></dd><dt>Visio</dt><dd><b>+ de 500 km</b></dd><dt>Secrétariat</dt><dd><b>9-12 h, 13-18 h</b></dd></dl></section>
        <section class="box"><h2>Canaux d’envoi</h2>
          <div class="switch"><div><b>E-mail</b><small>Connecté · domaine vérifié (démo)</small></div><input type="checkbox" role="switch" aria-label="E-mail" data-ch="email"${S.channels.email ? ' checked' : ''}></div>
          <div class="switch"><div><b>SMS</b><small>${S.channels.sms ? 'Prestataire européen · 0,07 € par SMS (démo)' : 'Déconnecté'}</small></div><input type="checkbox" role="switch" aria-label="SMS" data-ch="sms"${S.channels.sms ? ' checked' : ''}></div>
          <div class="switch"><div><b>WhatsApp Business</b><small>${S.channels.whatsapp ? 'Numéro vérifié · 4 modèles approuvés (démo)' : 'Déconnecté'}</small></div><input type="checkbox" role="switch" aria-label="WhatsApp Business" data-ch="whatsapp"${S.channels.whatsapp ? ' checked' : ''}></div>
          <div class="switch"><div><b>Instagram</b><small>${S.channels.instagram ? 'Compte professionnel relié (démo)' : 'Déconnecté'}</small></div><input type="checkbox" role="switch" aria-label="Instagram" data-ch="instagram"${S.channels.instagram ? ' checked' : ''}></div>
          <p class="small muted" style="margin:8px 0 0">SMS et WhatsApp ne portent que la logistique : date, heure, lieu, lien. Désinscription par « STOP ».</p></section>
        <section class="box"><h2>Démonstration</h2><p class="small">Les données sont fictives et stockées dans ce navigateur. Remettre à zéro efface les rendez-vous et questionnaires ajoutés pendant la visite.</p><button class="btn sm" type="button" id="reset">Remettre la démo à zéro</button></section>
      </div>`;
    $$('[data-ch]').forEach(i => i.addEventListener('change', () => {
      const k = i.dataset.ch;
      if (k === 'whatsapp' && i.checked) {
        i.checked = false;
        dialog(`<h2 style="margin-top:0;font-size:1.2rem">Connecter WhatsApp Business</h2><ol class="timeline" style="margin-top:12px"><li class="done"><b>Compte Meta Business du cabinet</b><br><span class="small">Vérifié</span></li><li class="done"><b>Numéro du secrétariat</b><br><span class="small">Code de vérification reçu par SMS et validé</span></li><li class="done"><b>Modèles soumis à Meta</b><br><span class="small">Confirmation, rappel, dernier rappel, veille : approuvés</span></li><li class="done"><b>Consentement</b><br><span class="small">Case à cocher à la prise de rendez-vous, désinscription par « STOP »</span></li></ol><button class="btn sm" type="button" id="wa-ok">Activer WhatsApp</button>`);
        $('#wa-ok').addEventListener('click', () => { S.channels.whatsapp = true; persist(); $('#dlg').close(); toast('WhatsApp Business connecté (démo)'); route(); });
        return;
      }
      if (k === 'email' && !i.checked) { i.checked = true; toast('L’e-mail reste le canal de référence'); return; }
      S.channels[k] = i.checked; persist(); toast((E.CHANNELS[k] || 'Instagram') + (i.checked ? ' connecté' : ' déconnecté')); route();
    }));
    $('#reset').addEventListener('click', () => { Demo.reset(); S = Demo.load(); toast('Démo remise à zéro'); location.hash = '#aujourdhui'; route(); });
  }

  /* ===================== Assistant IA et conformité (assets/ia.js) ===================== */
  const vIA = () => { view.innerHTML = Ai.catalogHtml(S); Ai.bindCatalog(view, S, { P, name, dialog, toast }); };
  const vConsult = id => { const a = S.appointments.find(x => x.id === id); view.innerHTML = Ai.consultHtml(S, a, { P, name, typ, lieu, subFor }); Ai.bindConsult(view, S, a, { P, name, toast, persist }); };
  const vConformite = () => { view.innerHTML = Ai.complianceHtml(); };

  route();
})();
