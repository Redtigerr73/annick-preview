/* Espace praticienne : tableau de bord, agenda, patients, questionnaires, e-mails, automatisations,
   assistant IA (simulé) et conformité. Données fictives en localStorage. */
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
  const subFor = a => S.submissions.filter(s => s.appointment === a.id || (s.patient === a.patient && a.type === 'rdv1')).sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1))[0];
  const subOfPatient = pid => S.submissions.filter(s => s.patient === pid).sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1))[0];
  const qStatus = a => { const s = subFor(a); return E.questionnaireStatus(a.date, s && s.receivedOn, TODAY); };
  const when = a => a.date === T ? 'Aujourd’hui, ' + a.time.replace(':', ' h ') : E.fmt(a.date, true).replace(/ \d{4}$/, '') + ', ' + a.time.replace(':', ' h ');
  const chip = st => `<span class="chip ${esc(st.key)}">${esc(st.label)}</span>`;
  const typ = k => Demo.TYPES[k] || Demo.TYPES.suivi;
  const fmtShort = d => E.fmt(d, true).replace(/ \d{4}$/, '');
  const MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dm = d => { const x = E.day(d); return x.getDate() + ' ' + MS[x.getMonth()]; };
  const chipShort = st => `<span class="chip ${esc(st.key)}">${esc(st.key === 'recu' ? 'Reçu' : st.label)}</span>`;
  function stage(pid) {
    const list = appts().filter(a => a.patient === pid);
    const done = list.filter(a => a.status === 'fait').map(a => a.type);
    if (done.includes('rdv2')) return 'Suivi';
    if (done.includes('rdv1')) return 'Biologie demandée';
    return 'Nouveau';
  }
  function persist() { Demo.save(S); }

  /* ---------- navigation ---------- */
  const NAV = [['aujourdhui', 'Aujourd’hui'], ['agenda', 'Agenda'], ['patients', 'Patients'], ['questionnaires', 'Questionnaires'], ['emails', 'Messages'], ['statistiques', 'Statistiques'], ['automatisations', 'Automatisations'], ['ia', 'Assistant IA'], ['conformite', 'Conformité'], ['reglages', 'Réglages']];
  function nav(cur) {
    const late = upcoming().filter(a => a.type === 'rdv1' && qStatus(a).key === 'retard').length;
    $('#side-nav').innerHTML = NAV.map(([k, l]) => `<a href="#${k}"${k === cur ? ' aria-current="page"' : ''}>${l}${k === 'questionnaires' && late ? `<em>${late}</em>` : ''}</a>`).join('');
  }
  $('#side-open').addEventListener('click', () => { const o = $('#side').classList.toggle('open'); $('#side-open').setAttribute('aria-expanded', o); });

  function route() {
    S = Demo.load();
    const [r, id] = (location.hash.slice(1) || 'aujourdhui').split('/');
    const top = r === 'patient' ? 'patients' : r === 'questionnaire' ? 'questionnaires' : r === 'consultation' ? 'ia' : r;
    nav(top); $('#side').classList.remove('open');
    const fn = { aujourdhui: vToday, agenda: vAgenda, patients: vPatients, patient: () => vPatient(id), questionnaires: vQuestionnaires, questionnaire: () => vQuestionnaire(id), emails: vEmails, statistiques: vStats, automatisations: vAutomations, ia: vIA, consultation: () => vConsult(id), conformite: vConformite, reglages: vSettings }[r] || vToday;
    fn(); view.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
  }
  addEventListener('hashchange', route);

  function head(title, sub, actions) { return `<div class="topline"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`; }
  function dialog(html) { $('#dlg-body').innerHTML = html + '<div class="row" style="margin-top:18px;justify-content:flex-end"><button class="btn ghost sm" type="button" id="dlg-close">Fermer</button></div>'; const d = $('#dlg'); d.showModal(); $('#dlg-close').addEventListener('click', () => d.close()); }
  function mailFor(m) {
    const p = P(m.patient), a = S.appointments.find(x => x.id === m.appointment) || {};
    const l = lieu(a.lieu);
    const tpl = Object.assign({}, E.TEMPLATES[m.template], (S.templates || {})[m.template] || {});
    const vars = { prenom: p ? p.first : '', patient: name(p), date: a.date ? E.fmt(a.date, true) : '', heure: (a.time || '').replace(':', ' h '), lieu: l.name + ', ' + l.address, echeance: a.date ? E.fmt(E.dueDate(a.date)) : '', lien: 'https://exemple-cabinet.be/questionnaire' };
    const fill = s => s.replace(/\{(\w+)\}/g, (x, k) => (vars[k] != null ? vars[k] : x));
    return { to: p ? p.email : '', subject: fill(tpl.subject), body: fill(tpl.body), name: tpl.name };
  }
  function showMail(m) {
    const x = mailFor(m), ch = m.channel || 'email';
    if (ch !== 'email') {
      const p = P(m.patient), a = S.appointments.find(y => y.id === m.appointment) || {};
      const short = E.render(m.template, { date: a.date ? fmtShort(a.date) : '', heure: (a.time || '').replace(':', ' h '), lieuCourt: lieu(a.lieu).short, echeance: a.date ? E.fmt(E.dueDate(a.date)) : '', lien: 'cabinet.be/q/7KD2' }, ch);
      dialog(`<p class="lbl">${esc(x.name)} · ${esc(E.CHANNELS[ch])} · ${m.status === 'envoye' ? 'envoyé le' : 'prévu le'} ${esc(E.fmt(m.at))}</p>
        <div class="phone"><div class="phone-top">${esc(p ? p.phone : '')}${ch === 'whatsapp' ? ' · WhatsApp' : ' · SMS'}</div><div class="bubble ${ch}">${esc(short.body)}<small>${m.status === 'envoye' ? 'Distribué' : 'Planifié'}</small></div></div>
        <p class="small muted" style="margin-top:12px">Message court sans aucune information de santé : la date, l’heure, le cabinet et un lien. Le détail reste dans l’e-mail ou l’espace patient.</p>`);
      return;
    }
    dialog(`<p class="lbl">${esc(x.name)} · ${m.status === 'envoye' ? 'envoyé le' : 'prévu le'} ${esc(E.fmt(m.at))}</p>
      <div class="mail"><header><span><b>À :</b> ${esc(x.to)}</span><span><b>Objet :</b> ${esc(x.subject)}</span></header><pre>${esc(x.body)}</pre></div>`);
  }
  const chChip = m => `<span class="chip">${esc(E.CHANNELS[m.channel || 'email'])}</span>`;

  /* ---------- alertes par patient ---------- */
  function alertsFor(pid) {
    const out = [], list = appts().filter(a => a.patient === pid), sub = subOfPatient(pid);
    const nx = list.find(a => a.status === 'prevu' && a.date >= T);
    if (nx && nx.type === 'rdv1') { const st = qStatus(nx); if (st.key === 'retard') out.push({ lvl: 'haute', t: 'Questionnaire en retard', d: 'RDV du ' + fmtShort(nx.date) + ' · échéance dépassée' }); else if (st.key === 'bientot') out.push({ lvl: 'moyenne', t: 'Questionnaire attendu', d: st.label }); }
    if (sub) E.flags(sub.answers).forEach(f => out.push({ lvl: 'haute', t: 'Point de vigilance', d: f }));
    const absent = list.filter(a => a.status === 'absent');
    absent.forEach(a => out.push({ lvl: 'moyenne', t: 'Rendez-vous manqué', d: E.fmt(a.date) + ' · non annulé, à facturer selon la règle du cabinet' }));
    const r1 = list.filter(a => a.type === 'rdv1' && a.status === 'fait').pop();
    if (r1 && !list.some(a => a.type === 'rdv2')) { const days = Math.round((TODAY - E.day(r1.date)) / 86400000); if (days > 21) out.push({ lvl: 'moyenne', t: 'Biologie attendue', d: 'Demandée il y a ' + days + ' jours, pas de RDV 2 planifié' }); }
    if (!nx && list.length && list.every(a => a.status !== 'prevu')) out.push({ lvl: 'basse', t: 'Aucun rendez-vous prévu', d: 'Proposer un suivi' });
    return out;
  }
  const alertChip = n => n ? `<span class="chip retard">${n} alerte${n > 1 ? 's' : ''}</span>` : '<span class="muted">·</span>';

  /* ===================== Aujourd'hui ===================== */
  function vToday() {
    const up = upcoming(), next = up[0];
    const weekEnd = E.iso(E.addDays(TODAY, 7));
    const week = up.filter(a => a.date < weekEnd);
    const rdv1 = up.filter(a => a.type === 'rdv1');
    const late = rdv1.filter(a => qStatus(a).key === 'retard'), soon = rdv1.filter(a => qStatus(a).key === 'bientot');
    const recv30 = S.submissions.filter(s => s.receivedOn >= E.iso(E.addDays(TODAY, -30)));
    const bio = appts().filter(a => a.type === 'rdv1' && a.status === 'fait' && !S.appointments.some(b => b.patient === a.patient && b.type === 'rdv2'));
    const mailsToday = S.emails.filter(m => m.at === T);
    const offWeek = !E.isConsultationDay(TODAY) && TODAY.getDay() >= 1 && TODAY.getDay() <= 5;
    const hour = new Date().getHours();
    let nextHtml = '<div class="box"><h2>Prochain rendez-vous</h2><div class="empty">Aucun rendez-vous prévu.</div></div>';
    if (next) {
      const p = P(next.patient), sub = subFor(next), st = qStatus(next);
      const prof = sub ? E.profile(sub.answers, sub.sex) : null, pri = prof ? E.priorities(prof) : [], fl = sub ? E.flags(sub.answers) : [];
      nextHtml = `<section class="box next" aria-labelledby="nx">
        <h2 id="nx" style="font-size:1rem;color:#B9CAC4;font-family:var(--body);font-weight:700">Prochain rendez-vous</h2>
        <div class="when">${esc(when(next))}</div>
        <div class="who">${esc(name(p))}${p && p.age ? `, ${p.age} ans` : ''}</div>
        <div class="meta">${esc(typ(next.type).name)} · ${typ(next.type).minutes} min · ${esc(lieu(next.lieu).short)}</div>
        <p style="margin:14px 0 4px;color:#E8EFEC">« ${esc(p ? p.motif : '')} »</p>
        <div style="margin:14px 0">${next.type === 'rdv1' ? chip(st) : sub ? '<span class="chip recu">Questionnaire reçu</span>' : ''}</div>
        ${pri.length ? `<p style="margin:0 0 6px;color:#B9CAC4">À explorer en priorité</p><div class="row" style="gap:8px">${pri.map(a => `<span class="chip" style="background:var(--hl);border-color:var(--hl);color:var(--ink)">${esc(a.name)} · ${a.score}</span>`).join('')}</div>` : ''}
        ${fl.length ? `<p style="margin:12px 0 0;color:#FFD6D6">${fl.length} point${fl.length > 1 ? 's' : ''} de vigilance à vérifier</p>` : ''}
        <div class="row" style="margin-top:20px"><a class="btn hlb sm" href="#patient/${esc(next.patient)}">Ouvrir la fiche</a>${sub ? `<a class="btn ghost sm" href="#questionnaire/${esc(sub.id)}">Synthèse du questionnaire</a>` : ''}<a class="btn ghost sm" href="#consultation/${esc(next.id)}">Démarrer la consultation</a></div>
      </section>`;
    }
    const todo = [
      ...late.map(a => `<li><span class="t">${esc(dm(a.date))}</span><span><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a><small>Questionnaire en retard · RDV ${esc(fmtShort(a.date))}</small></span><button class="btn sm" type="button" data-remind="${esc(a.id)}">Relancer</button></li>`),
      ...soon.map(a => `<li><span class="t">${esc(dm(a.date))}</span><span><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a><small>Questionnaire attendu sous ${qStatus(a).left} j · rappel automatique planifié</small></span><span class="chip bientot">Bientôt</span></li>`),
      ...bio.slice(0, 3).map(a => `<li><span class="t">Bio</span><span><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a><small>Biologie demandée le ${esc(E.fmt(a.date))} · proposer le RDV 2 à réception</small></span><span class="chip attente">En attente</span></li>`),
    ];
    view.innerHTML = head(`${hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'} Annick`, esc(E.fmt(TODAY, true)) + (offWeek ? ' · troisième semaine du mois : pas de consultation' : ''), `<a class="btn sm" href="rendez-vous.html">Nouveau rendez-vous</a>`) + `
      <div class="grid g-main">
        ${nextHtml}
        <div class="grid" style="align-content:start">
          <div class="grid g-4" style="grid-template-columns:1fr 1fr">
            <div class="box kpi"><b>${week.length}</b><span>rendez-vous dans les 7 jours</span></div>
            <div class="box kpi"><b>${recv30.length}</b><span>questionnaires reçus en 30 jours</span></div>
            <div class="box kpi"><b>${rdv1.filter(a => ['attente', 'bientot'].includes(qStatus(a).key)).length}</b><span>questionnaires attendus</span></div>
            <div class="box kpi"><b style="color:${late.length ? 'var(--danger)' : 'inherit'}">${late.length}</b><span>en retard (moins d’un mois avant le RDV)</span></div>
          </div>
          <div class="box"><h2>À traiter</h2>${todo.length ? `<ul class="list">${todo.join('')}</ul>` : '<div class="empty">Rien à traiter. Les rappels partent tout seuls.</div>'}</div>
        </div>
      </div>
      <div class="grid g-3" style="margin-top:20px">
        <div class="box"><h2>Cette semaine <a href="#agenda">Agenda</a></h2>${week.length ? `<ul class="list">${week.slice(0, 7).map(a => `<li><span class="t">${esc(a.time.replace(':', ' h '))}</span><span><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a><small>${esc(fmtShort(a.date))} · ${esc(typ(a.type).short)} · ${esc(lieu(a.lieu).short)}</small></span>${a.type === 'rdv1' ? chipShort(qStatus(a)) : '<span></span>'}</li>`).join('')}</ul>` : '<div class="empty">Aucun rendez-vous cette semaine.</div>'}</div>
        <div class="box"><h2>Derniers questionnaires <a href="#questionnaires">Tous</a></h2><ul class="list">${S.submissions.slice().sort((x, y) => (x.receivedOn < y.receivedOn ? 1 : -1)).slice(0, 6).map(s => { const pr = E.priorities(E.profile(s.answers, s.sex)); return `<li><span class="t">${esc(dm(s.receivedOn))}</span><span><a href="#questionnaire/${esc(s.id)}">${esc(name(P(s.patient)))}</a><small>${esc(pr.map(a => a.name).join(', ') || 'Aucun axe marqué')}</small></span>${E.flags(s.answers).length ? '<span class="chip retard">Vigilance</span>' : '<span></span>'}</li>`; }).join('')}</ul></div>
        <div class="box"><h2>Envois automatiques <a href="#emails">Messages</a></h2>
          <p class="muted small" style="margin-top:-4px">${S.emails.filter(m => m.status === 'envoye' && m.at >= E.iso(E.addDays(TODAY, -7))).length} messages partis cette semaine sans intervention.</p>
          <ul class="list">${(mailsToday.length ? mailsToday : S.emails.filter(m => m.status === 'planifie').slice(-5).reverse()).slice(0, 5).map(m => `<li><span class="t">${esc(dm(m.at))}</span><span><a href="#patient/${esc(m.patient)}">${esc(name(P(m.patient)))}</a><small>${esc(E.TEMPLATES[m.template].name)} · ${esc(E.CHANNELS[m.channel || 'email'])}</small></span><span class="chip ${esc(m.status)}">${m.status === 'envoye' ? 'Envoyé' : 'Planifié'}</span></li>`).join('')}</ul></div>
      </div>
      ${(() => { const rows = S.patients.map(p => ({ p, al: alertsFor(p.id) })).filter(r => r.al.length).sort((x, y) => y.al.filter(a => a.lvl === 'haute').length - x.al.filter(a => a.lvl === 'haute').length || y.al.length - x.al.length); return `<div class="box" style="margin-top:20px"><h2>Alertes par patient <a href="#patients">Patients</a></h2>${rows.length ? `<ul class="list">${rows.slice(0, 8).map(r => `<li><span class="t">${r.al.length}</span><span><a href="#patient/${esc(r.p.id)}">${esc(name(r.p))}</a><small>${esc(Object.entries(r.al.reduce((o, a) => { o[a.t] = (o[a.t] || 0) + 1; return o; }, {})).map(([t, n]) => n > 1 ? n + ' × ' + t.toLowerCase() : t).join(' · '))}</small></span>${r.al.some(a => a.lvl === 'haute') ? '<span class="chip retard">Prioritaire</span>' : '<span class="chip bientot">À suivre</span>'}</li>`).join('')}</ul>` : '<div class="empty">Aucune alerte.</div>'}</div>`; })()}`;
    $$('[data-remind]').forEach(b => b.addEventListener('click', () => {
      const a = S.appointments.find(x => x.id === b.dataset.remind);
      const m = Demo.addExtra(S, 'emails', { id: 'm' + Date.now().toString(36), patient: a.patient, appointment: a.id, template: 'rappel2', at: T, status: 'envoye' });
      showMail(m); toast('Rappel envoyé à ' + name(P(a.patient)));
    }));
  }

  /* ===================== Agenda ===================== */
  let weekOffset = 0;
  function vAgenda() {
    const mon = E.addDays(TODAY, -((TODAY.getDay() + 6) % 7) + 7 * weekOffset);
    const days = [0, 1, 2, 3, 4].map(i => E.addDays(mon, i));
    const H0 = 8.5, H1 = 18.5, PX = 56;
    const y = t => { const [h, m] = t.split(':').map(Number); return (h + m / 60 - H0) * PX; };
    view.innerHTML = head('Agenda', 'Semaine du ' + esc(E.fmt(mon)), `<button class="btn ghost sm" type="button" id="w-prev">Semaine précédente</button><button class="btn ghost sm" type="button" id="w-now">Cette semaine</button><button class="btn ghost sm" type="button" id="w-next">Semaine suivante</button><a class="btn sm" href="rendez-vous.html">Nouveau rendez-vous</a>`) + `
      <p class="small muted" style="margin-top:-10px">Fond jaune : première consultation (questionnaire requis). Bordure pointillée : cabinet de Forest. Hachures : pas de consultation (troisième semaine du mois).</p>
      <div class="week" role="grid" aria-label="Rendez-vous de la semaine">
        <div class="h"></div>${days.map(d => `<div class="h${E.isConsultationDay(d) ? '' : ' off'}">${esc(fmtShort(E.iso(d)))}</div>`).join('')}
        <div class="hours" style="height:${(H1 - H0) * PX}px">${[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => `<span style="top:${(h - H0) * PX - 8}px">${h} h</span>`).join('')}</div>
        ${days.map(d => { const iso = E.iso(d); const list = S.appointments.filter(a => a.date === iso); return `<div class="col${E.isConsultationDay(d) ? '' : ' off'}" style="height:${(H1 - H0) * PX}px">${list.map(a => { const p = P(a.patient), h = typ(a.type).minutes / 60 * PX - 4; return `<a class="ev ${esc(a.type)} ${esc(a.lieu)}" href="#patient/${esc(a.patient)}" style="top:${y(a.time)}px;height:${h}px"><b>${esc(a.time.replace(':', ' h '))} · ${esc(name(p))}</b>${esc(typ(a.type).short)} · ${esc(lieu(a.lieu).short)}${a.status === 'fait' ? ' · fait' : ''}</a>`; }).join('')}</div>`; }).join('')}
      </div>`;
    $('#w-prev').onclick = () => { weekOffset--; vAgenda(); }; $('#w-next').onclick = () => { weekOffset++; vAgenda(); }; $('#w-now').onclick = () => { weekOffset = 0; vAgenda(); };
  }

  /* ===================== Patients ===================== */
  let pFilter = 'tous', pSearch = '';
  function vPatients() {
    const rows = S.patients.map(p => {
      const nx = upcoming().find(a => a.patient === p.id);
      return { p, nx, st: nx && nx.type === 'rdv1' ? qStatus(nx) : subOfPatient(p.id) ? { key: 'recu', label: 'Reçu' } : { key: 'attente', label: 'Non reçu' }, stage: stage(p.id) };
    }).filter(r => {
      if (pSearch && !(name(r.p) + ' ' + r.p.motif + ' ' + r.p.city).toLowerCase().includes(pSearch.toLowerCase())) return false;
      if (pFilter === 'nouveaux') return r.stage === 'Nouveau';
      if (pFilter === 'cours') return r.stage !== 'Nouveau';
      if (pFilter === 'manquant') return ['retard', 'bientot', 'attente'].includes(r.st.key) && r.nx && r.nx.type === 'rdv1';
      return true;
    }).sort((a, b) => ((a.nx ? a.nx.date : '9') < (b.nx ? b.nx.date : '9') ? -1 : 1));
    view.innerHTML = head('Patients', S.patients.length + ' dossiers', '<a class="btn sm" href="rendez-vous.html">Nouveau patient</a>') + `
      <div class="row" style="margin-bottom:14px"><input type="search" id="p-q" placeholder="Rechercher un nom, un motif, une ville" value="${esc(pSearch)}" style="max-width:380px" aria-label="Rechercher un patient"></div>
      <div class="tabs">${[['tous', 'Tous'], ['nouveaux', 'Nouveaux'], ['cours', 'En suivi'], ['manquant', 'Questionnaire manquant']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${pFilter === k}">${l}</button>`).join('')}</div>
      <div class="box" style="padding:8px 22px;overflow-x:auto"><table class="t"><thead><tr><th>Patient</th><th>Motif</th><th>Parcours</th><th>Cabinet</th><th>Prochain RDV</th><th>Questionnaire</th><th>Alertes</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><a href="#patient/${esc(r.p.id)}">${esc(name(r.p))}</a>${r.p.web ? ' <span class="chip bientot">site</span>' : ''}<br><span class="small muted">${r.p.age ? esc(r.p.age) + ' ans · ' : ''}${esc(r.p.city || '')}</span></td><td class="small">${esc(r.p.motif)}</td><td>${esc(r.stage)}</td><td>${esc(lieu(r.p.lieu).short)}</td><td>${r.nx ? esc(fmtShort(r.nx.date)) + '<br><span class="small muted">' + esc(typ(r.nx.type).short) + '</span>' : '<span class="muted">·</span>'}</td><td>${chip(r.st)}</td><td>${alertChip(alertsFor(r.p.id).length)}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty">Aucun patient ne correspond.</div></td></tr>'}
      </tbody></table></div>`;
    $('#p-q').addEventListener('input', e => { pSearch = e.target.value; const pos = e.target.selectionStart; vPatients(); const i = $('#p-q'); i.focus(); i.setSelectionRange(pos, pos); });
    $$('[data-f]').forEach(b => b.addEventListener('click', () => { pFilter = b.dataset.f; vPatients(); }));
  }

  function profileBars(sub, max) {
    const prof = E.profile(sub.answers, sub.sex).sort((a, b) => b.score - a.score).slice(0, max || 99);
    return `<div class="bars">${prof.map(a => `<div class="bar ${a.score >= 50 ? 'marque' : ''}"><span>${esc(a.name)}</span><span class="track"><i style="width:${a.score}%"></i></span><b>${a.score}</b></div>`).join('')}</div>`;
  }

  function vPatient(id) {
    const p = P(id); if (!p) { view.innerHTML = head('Patient introuvable') + '<div class="empty">Ce dossier n’existe pas dans la démo. <a href="#patients">Retour aux patients</a></div>'; return; }
    const list = appts().filter(a => a.patient === id), sub = subOfPatient(id), nx = list.find(a => a.status === 'prevu' && a.date >= T);
    const mails = S.emails.filter(m => m.patient === id).sort((a, b) => (a.at < b.at ? 1 : -1));
    const fl = sub ? E.flags(sub.answers) : [];
    const pri = sub ? E.priorities(E.profile(sub.answers, sub.sex)) : [];
    const steps = [
      ...list.map(a => ({ cls: a.status === 'fait' ? 'done' : (nx && nx.id === a.id ? 'next' : ''), t: `${typ(a.type).name}`, d: E.fmt(a.date, true) + ' · ' + a.time.replace(':', ' h ') + ' · ' + lieu(a.lieu).short })),
    ];
    if (stage(id) === 'Biologie demandée') steps.push({ cls: '', t: 'Résultats de biologie', d: 'En attente du laboratoire spécialisé' });
    if (list.filter(a => a.status === 'fait').length >= 2) steps.push({ cls: '', t: 'Hormonologie avec le Dr Résimont', d: 'Possible après deux consultations de nutrithérapie' });
    view.innerHTML = `<p class="small"><a href="#patients">Patients</a></p>` + head(esc(name(p)), `${p.age ? esc(p.age) + ' ans · ' : ''}${esc(stage(id))} · patient depuis le ${esc(E.fmt(p.since))}`,
      `${nx && nx.type === 'rdv1' && !sub ? `<button class="btn sm" type="button" id="pp-remind">Relancer le questionnaire</button>` : ''}${nx ? `<a class="btn ghost sm" href="#consultation/${esc(nx.id)}">Démarrer la consultation</a>` : ''}<button class="btn ghost sm" type="button" id="pp-report">Compte rendu au médecin</button><button class="btn ghost sm" type="button" id="pp-export">Exporter le dossier</button>`) + `
      <div class="grid g-main">
        <div class="grid" style="align-content:start">
          ${(() => { const al = alertsFor(id); return al.length ? `<div class="box"><h2>Alertes · ${al.length}</h2><ul class="list">${al.map(x => `<li><span class="chip ${x.lvl === 'haute' ? 'retard' : x.lvl === 'moyenne' ? 'bientot' : 'attente'}">${esc(x.lvl)}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span></span></li>`).join('')}</ul><p class="small muted" style="margin:8px 0 0">Les points de vigilance viennent des réponses du patient : à vérifier, ce ne sont pas des diagnostics.</p></div>` : ''; })()}
          <div class="box"><h2>Profil fonctionnel${sub ? ` <a href="#questionnaire/${esc(sub.id)}">Réponses détaillées</a>` : ''}</h2>
            ${sub ? `<p class="small muted" style="margin-top:-6px">Score par axe, de 0 à 100, calculé à partir des réponses 0 à 3 du questionnaire reçu le ${esc(E.fmt(sub.receivedOn))}. Une orientation pour la consultation, jamais un diagnostic.</p>${profileBars(sub)}` : `<div class="empty">Questionnaire pas encore reçu. ${nx ? 'Il est attendu avant le ' + esc(E.fmt(E.dueDate(nx.date))) + '.' : ''}</div>`}
          </div>
          ${sub && sub.cortisol && sub.cortisol.length ? `<div class="box"><h2>Fiche cortisol</h2><div class="row" style="gap:6px">${sub.cortisol.map(c => `<span class="hl">${esc(c)}</span>`).join(' ')}</div></div>` : ''}
        </div>
        <div class="grid" style="align-content:start">
          <div class="box"><h2>Motif</h2><p style="margin:0">« ${esc(p.motif)} »</p>${pri.length ? `<p class="small muted" style="margin:12px 0 6px">Axes à explorer en priorité</p><div class="row" style="gap:6px">${pri.map(a => `<span class="chip bientot">${esc(a.name)} · ${a.score}</span>`).join('')}</div>` : ''}</div>
          <div class="box"><h2>Parcours</h2><ol class="timeline">${steps.map(s => `<li class="${s.cls}"><b>${esc(s.t)}</b><br><span class="small muted">${esc(s.d)}</span></li>`).join('')}</ol></div>
          <div class="box"><h2>Coordonnées</h2><dl class="kv"><dt>E-mail</dt><dd>${esc(p.email)}</dd><dt>Téléphone</dt><dd>${esc(p.phone || '·')}</dd><dt>Commune</dt><dd>${esc([p.zip, p.city].filter(Boolean).join(' ') || '·')}</dd><dt>Cabinet</dt><dd>${esc(lieu(p.lieu).name)}</dd><dt>Rappels par</dt><dd><select id="pp-ch" aria-label="Canal des rappels" style="min-height:34px;padding:4px 8px">${Object.entries(E.CHANNELS).map(([k, l]) => `<option value="${k}"${(p.channel || 'email') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></dd><dt>Envoyé par</dt><dd>${esc(p.referrer || '·')}</dd><dt>Médecin</dt><dd>${esc(p.doctor || '·')}</dd></dl></div>
          <div class="box"><h2>Notes de consultation</h2><textarea id="pp-notes" aria-label="Notes de consultation" placeholder="Vos notes, visibles uniquement par vous.">${esc((S.notes || {})[id] || '')}</textarea><p class="small muted" id="pp-saved" style="margin:6px 0 0">Enregistrées automatiquement.</p></div>
          <div class="box"><h2>Messages</h2>${mails.length ? `<ul class="list">${mails.map(m => `<li><span class="t">${esc(dm(m.at))}</span><span><button type="button" class="btn ghost sm" data-mail="${esc(m.id)}" style="min-height:0;padding:2px 10px;border:0;text-decoration:underline">${esc(E.TEMPLATES[m.template].name)}</button></span>${chChip(m)} <span class="chip ${esc(m.status)}">${m.status === 'envoye' ? 'Envoyé' : 'Planifié'}</span></li>`).join('')}</ul>` : '<div class="empty">Aucun message.</div>'}</div>
        </div>
      </div>`;
    $('#pp-ch').addEventListener('change', e => { p.channel = e.target.value; persist(); toast('Rappels par ' + E.CHANNELS[p.channel]); });
    const notes = $('#pp-notes'); notes.addEventListener('input', () => { S.notes = S.notes || {}; S.notes[id] = notes.value; persist(); $('#pp-saved').textContent = 'Enregistrées à ' + new Date().toTimeString().slice(0, 5) + '.'; });
    $$('[data-mail]').forEach(b => b.addEventListener('click', () => showMail(S.emails.find(m => m.id === b.dataset.mail))));
    const rm = $('#pp-remind'); if (rm) rm.addEventListener('click', () => { const m = Demo.addExtra(S, 'emails', { id: 'm' + Date.now().toString(36), patient: id, appointment: nx.id, template: 'rappel1', at: T, status: 'envoye' }); showMail(m); toast('Rappel envoyé'); });
    $('#pp-report').addEventListener('click', () => {
      const last = list.filter(a => a.status === 'fait').pop() || nx || list[0];
      const m = { patient: id, appointment: last && last.id, template: 'medecin', at: T, status: 'planifie' };
      const x = mailFor(m);
      dialog(`<p class="lbl">Brouillon prêt à relire · destinataire : ${esc(p.doctor || 'médecin traitant')}</p><div class="mail"><header><span><b>Objet :</b> ${esc(x.subject)}</span></header><pre>${esc(x.body)}\n\nPièce jointe : synthèse de consultation (${esc(name(p))}).pdf</pre></div><p class="small muted" style="margin-top:10px">Envoyé seulement après validation, et uniquement si le patient a accepté le partage avec son médecin.</p>`);
    });
    $('#pp-export').addEventListener('click', () => {
      const data = { patient: p, rendezvous: list, questionnaires: S.submissions.filter(s => s.patient === id), emails: mails, notes: (S.notes || {})[id] || '' };
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
    if (qTab === 'recus') body = `<table class="t"><thead><tr><th>Reçu le</th><th>Patient</th><th>Axes prioritaires</th><th>Vigilance</th><th>Fiche cortisol</th></tr></thead><tbody>${recv.map(s => { const pr = E.priorities(E.profile(s.answers, s.sex)), f = E.flags(s.answers); return `<tr><td>${esc(E.fmt(s.receivedOn))}</td><td><a href="#questionnaire/${esc(s.id)}">${esc(name(P(s.patient)))}</a>${s.web ? ' <span class="chip bientot">nouveau</span>' : ''}</td><td class="small">${esc(pr.map(a => a.name + ' ' + a.score).join(' · ') || 'aucun axe marqué')}</td><td>${f.length ? `<span class="chip retard">${f.length}</span>` : '<span class="muted">·</span>'}</td><td>${(s.cortisol || []).length || '<span class="muted">·</span>'}</td></tr>`; }).join('')}</tbody></table>`;
    else { const arr = qTab === 'attente' ? pending : late; body = arr.length ? `<table class="t"><thead><tr><th>Patient</th><th>Rendez-vous</th><th>Échéance</th><th>Statut</th><th></th></tr></thead><tbody>${arr.map(a => `<tr><td><a href="#patient/${esc(a.patient)}">${esc(name(P(a.patient)))}</a></td><td>${esc(fmtShort(a.date))} · ${esc(lieu(a.lieu).short)}</td><td>${esc(E.fmt(E.dueDate(a.date)))}</td><td>${chip(qStatus(a))}</td><td><button class="btn sm" type="button" data-r="${esc(a.id)}">Relancer</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Aucun questionnaire dans cette catégorie.</div>'; }
    view.innerHTML = head('Questionnaires', 'Reçus en ligne, lus, classés et calculés : plus de scan ni de courrier.', '<a class="btn ghost sm" href="questionnaire.html">Voir le questionnaire patient</a>') +
      `<div class="tabs">${tab('recus', 'Reçus', recv.length)}${tab('attente', 'Attendus', pending.length)}${tab('retard', 'En retard', late.length)}</div><div class="box" style="padding:8px 22px;overflow-x:auto">${body}</div>
      <p class="small muted" style="margin-top:12px">Règle du cabinet : le questionnaire doit arriver au moins un mois avant le rendez-vous. Les rappels partent automatiquement 37 et 32 jours avant ; le cabinet est alerté à 30 jours.</p>`;
    $$('[data-t]').forEach(b => b.addEventListener('click', () => { qTab = b.dataset.t; vQuestionnaires(); }));
    $$('[data-r]').forEach(b => b.addEventListener('click', () => { const a = S.appointments.find(x => x.id === b.dataset.r); const m = Demo.addExtra(S, 'emails', { id: 'm' + Date.now().toString(36), patient: a.patient, appointment: a.id, template: 'rappel2', at: T, status: 'envoye' }); showMail(m); }));
  }

  function vQuestionnaire(id) {
    const s = S.submissions.find(x => x.id === id); if (!s) { view.innerHTML = head('Questionnaire introuvable'); return; }
    const p = P(s.patient), prof = E.profile(s.answers, s.sex), fl = E.flags(s.answers), pri = E.priorities(prof);
    view.innerHTML = `<p class="small"><a href="#questionnaires">Questionnaires</a> · <a href="#patient/${esc(p.id)}">${esc(name(p))}</a></p>` + head('Questionnaire de ' + esc(name(p)), 'Reçu ' + esc(s.source) + ' le ' + esc(E.fmt(s.receivedOn)), `<button class="btn ghost sm" type="button" id="qq-ai">Synthèse par l’assistant</button><button class="btn ghost sm" type="button" id="qq-print">Imprimer</button>`) + `
      <div class="grid g-main">
        <div class="box"><h2>Profil fonctionnel</h2>${profileBars(s)}</div>
        <div class="grid" style="align-content:start">
          <div class="box"><h2>À explorer en priorité</h2>${pri.length ? pri.map(a => `<p style="margin:0 0 10px"><b>${esc(a.name)}</b> · ${a.score}/100<br><span class="small muted">${esc(a.top.slice(0, 4).join(', ') || 'signes modérés')}</span></p>`).join('') : '<div class="empty">Aucun axe marqué.</div>'}</div>
          ${fl.length ? `<div class="notice danger"><b>À vérifier</b><ul style="margin:8px 0 0;padding-left:18px">${fl.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
          ${s.cortisol && s.cortisol.length ? `<div class="box"><h2>Fiche cortisol</h2>${s.cortisol.map(c => `<span class="hl">${esc(c)}</span>`).join(' · ')}</div>` : ''}
        </div>
      </div>
      <div class="box" style="margin-top:20px"><h2>Réponses détaillées</h2>
        ${E.AXES.map(a => { const items = E.itemsFor(a, s.sex); if (!items.length) return ''; return `<details class="faq"><summary>${esc(a.name)} · ${prof.find(x => x.id === a.id).score}/100</summary><table class="t" style="margin-top:8px"><tbody>${items.map(({ t, i }) => { const val = Number(s.answers[a.id + ':' + i] || 0); return `<tr><td>${esc(t)}</td><td style="width:220px">${val ? `<span class="${val >= 2 ? 'hl' : ''}">${esc(E.SCALE[val])}</span>` : '<span class="muted">Non / jamais</span>'}</td></tr>`; }).join('')}</tbody></table></details>`; }).join('')}
      </div>`;
    $('#qq-print').addEventListener('click', () => window.print());
    $('#qq-ai').addEventListener('click', () => dialog(Ai.preSummaryHtml(s, p)));
  }

  /* ===================== E-mails ===================== */
  let mTab = 'envoye';
  function vEmails() {
    const sent = S.emails.filter(m => m.status === 'envoye').sort((a, b) => (a.at < b.at ? 1 : -1)), planned = S.emails.filter(m => m.status === 'planifie').sort((a, b) => (a.at > b.at ? 1 : -1));
    let body;
    if (mTab === 'modeles') {
      body = `<div class="grid g-main"><div class="box"><h2>Modèle</h2><div class="field"><label for="tp">Choisir un modèle</label><select id="tp">${Object.entries(E.TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ts">Objet</label><input id="ts" type="text"></div><div class="field"><label for="tb">Message</label><textarea id="tb" style="min-height:240px"></textarea><span class="hint">Variables : {prenom} {date} {heure} {lieu} {echeance} {lien} {patient}</span></div><button class="btn sm" type="button" id="tsave">Enregistrer le modèle</button></div>
        <div class="box"><h2>Aperçu</h2><div id="tprev"></div></div></div>`;
    } else {
      const arr = mTab === 'envoye' ? sent : planned;
      body = `<div class="box" style="padding:8px 22px;overflow-x:auto"><table class="t"><thead><tr><th>${mTab === 'envoye' ? 'Envoyé le' : 'Prévu le'}</th><th>Patient</th><th>Message</th><th>Canal</th><th></th></tr></thead><tbody>${arr.slice(0, 80).map(m => `<tr><td>${esc(E.fmt(m.at))}</td><td><a href="#patient/${esc(m.patient)}">${esc(name(P(m.patient)))}</a></td><td>${esc(E.TEMPLATES[m.template].name)}</td><td>${chChip(m)}</td><td><button class="btn ghost sm" type="button" data-m="${esc(m.id)}">Voir</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    view.innerHTML = head('Messages', 'E-mail, SMS ou WhatsApp, selon la préférence du patient : chaque message part au bon moment, sans copier-coller.') + `<div class="tabs"><button type="button" data-mt="envoye" aria-pressed="${mTab === 'envoye'}">Envoyés · ${sent.length}</button><button type="button" data-mt="planifie" aria-pressed="${mTab === 'planifie'}">Planifiés · ${planned.length}</button><button type="button" data-mt="modeles" aria-pressed="${mTab === 'modeles'}">Modèles</button></div>${body}`;
    $$('[data-mt]').forEach(b => b.addEventListener('click', () => { mTab = b.dataset.mt; vEmails(); }));
    $$('[data-m]').forEach(b => b.addEventListener('click', () => showMail(S.emails.find(m => m.id === b.dataset.m))));
    if (mTab === 'modeles') {
      const sel = $('#tp'), ts = $('#ts'), tb = $('#tb');
      const load = () => { const k = sel.value, t = Object.assign({}, E.TEMPLATES[k], (S.templates || {})[k] || {}); ts.value = t.subject; tb.value = t.body; prev(); };
      const prev = () => { const fake = { prenom: 'Claire', patient: 'Claire Vandenbroucke', date: E.fmt(E.addDays(TODAY, 40), true), heure: '10 h 30', lieu: Demo.LIEUX[0].name + ', ' + Demo.LIEUX[0].address, echeance: E.fmt(E.addDays(TODAY, 10)), lien: 'https://exemple-cabinet.be/questionnaire' }; const f = s => s.replace(/\{(\w+)\}/g, (x, k) => (fake[k] != null ? fake[k] : x)); $('#tprev').innerHTML = `<div class="mail"><header><span><b>Objet :</b> ${esc(f(ts.value))}</span></header><pre>${esc(f(tb.value))}</pre></div>`; };
      sel.addEventListener('change', load); ts.addEventListener('input', prev); tb.addEventListener('input', prev);
      $('#tsave').addEventListener('click', () => { S.templates = S.templates || {}; S.templates[sel.value] = { subject: ts.value, body: tb.value }; persist(); toast('Modèle enregistré'); });
      load();
    }
  }

  /* ===================== Statistiques ===================== */
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  function cols(data, label) {
    const max = Math.max(1, ...data.map(d => d.v));
    return `<div class="colchart" role="img" aria-label="${esc(label)}">${data.map(d => `<div class="col-i${d.cur ? ' cur' : ''}" tabindex="0"><i style="height:${Math.max(2, Math.round(100 * d.v / max))}%"></i><span class="tip"><b>${d.v}</b> ${esc(d.tip)}</span><small>${esc(d.x)}</small></div>`).join('')}</div>`;
  }
  function hbars(rows) {
    const max = Math.max(1, ...rows.map(r => r.v));
    return `<div class="bars">${rows.map(r => `<div class="bar" title="${esc(r.k)} : ${r.v}"><span>${esc(r.k)}</span><span class="track"><i style="width:${Math.round(100 * r.v / max)}%"></i></span><b>${r.v}</b></div>`).join('')}</div>`;
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
      weeks.push({ v, x: i === 0 ? 'cette sem.' : (i > 0 ? '+' : '') + i, tip: 'RDV, semaine du ' + E.fmt(a), cur: i === 0, a });
    }
    const axisCount = E.AXES.map(ax => ({ k: ax.name, v: S.submissions.filter(s => { const pr = E.profile(s.answers, s.sex).find(x => x.id === ax.id); return pr && pr.score >= 50; }).length })).filter(r => r.v).sort((x, y) => y.v - x.v).slice(0, 8);
    const by = f => Object.entries(S.patients.reduce((o, p) => { const k = f(p); o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, v]) => ({ k, v })).sort((x, y) => y.v - x.v);
    const origin = by(p => p.referrer || 'Non renseigné'), chans = by(p => E.CHANNELS[p.channel || 'email']);
    const tiles = [
      [pct(onTime.length, dueGone.length) + ' %', 'des questionnaires reçus à temps', onTime.length + ' sur ' + dueGone.length + ' premières consultations'],
      [avgAdv + ' j', 'd’avance moyenne avant la consultation', 'objectif : 30 jours au moins'],
      [in30, 'rendez-vous dans les 30 jours', upcoming().length + ' au total dans l’agenda'],
      [absent, 'rendez-vous manqués en 90 jours', pct(absent, past90.length) + ' % des rendez-vous passés'],
      [sentMonth, 'messages automatiques ce mois', 'e-mail, SMS et WhatsApp'],
      [(Math.round(minutes / 6) / 10).toString().replace('.', ',') + ' h', 'de secrétariat évitées ce mois', 'estimation : 4 min par message, 10 min par questionnaire ressaisi'],
    ];
    view.innerHTML = head('Statistiques', 'Les chiffres du cabinet, calculés à partir de l’agenda et des questionnaires.') + `
      <div class="grid g-3">${tiles.map(([v, l, d]) => `<div class="box kpi"><b>${esc(String(v))}</b><span>${esc(l)}</span><small class="muted small">${esc(d)}</small></div>`).join('')}</div>
      <div class="box" style="margin-top:20px"><h2>Rendez-vous par semaine</h2><p class="small muted" style="margin-top:-6px">Huit semaines passées, huit à venir. La semaine en cours est surlignée.</p>${cols(weeks, 'Rendez-vous par semaine')}${table(['Semaine du', 'Rendez-vous'], weeks.map(w => [E.fmt(w.a), w.v]))}</div>
      <div class="grid g-3" style="margin-top:20px">
        <div class="box"><h2>Axes les plus marqués</h2><p class="small muted" style="margin-top:-6px">Nombre de questionnaires avec un score de 50 ou plus.</p>${hbars(axisCount)}${table(['Axe', 'Questionnaires'], axisCount.map(r => [r.k, r.v]))}</div>
        <div class="box"><h2>Origine des patients</h2>${hbars(origin)}${table(['Origine', 'Patients'], origin.map(r => [r.k, r.v]))}</div>
        <div class="box"><h2>Canal des rappels</h2>${hbars(chans)}${table(['Canal', 'Patients'], chans.map(r => [r.k, r.v]))}<p class="small muted" style="margin-bottom:0">Choisi par le patient à la prise de rendez-vous.</p></div>
      </div>`;
  }

  /* ===================== Automatisations ===================== */
  const AUTOS = [
    ['confirmation', 'À la prise de rendez-vous', 'Confirmation, infos pratiques et lien vers le questionnaire en ligne.', 'Plus de questionnaire envoyé à la main.'],
    ['rappel1', '37 jours avant le rendez-vous', 'Rappel si le questionnaire n’est pas complet.', 'Plus de relance téléphonique.'],
    ['rappel2', '32 jours avant le rendez-vous', 'Dernier rappel, avec le risque d’annulation.', 'Moins de consultations non préparées.'],
    ['alerte', '30 jours avant le rendez-vous', 'Alerte au cabinet si le questionnaire manque toujours : libérer ou garder le créneau.', 'La décision vous revient, l’information arrive à temps.'],
    ['veille', 'La veille du rendez-vous', 'Rappel : carte d’identité, 2 vignettes de mutuelle, dernière prise de sang, règle d’annulation.', 'Moins d’oublis et de rendez-vous manqués.'],
    ['biologie', 'Après la première consultation', 'Envoi de la demande de biologie et des consignes du laboratoire spécialisé.', 'Le patient sait où aller et quoi apporter.'],
    ['hormonologie', 'Après deux consultations', 'Proposition d’un rendez-vous d’hormonologie avec le Dr Résimont, si vous le validez.', 'Le parcours avance sans relance.'],
    ['medecin', 'Après le deuxième rendez-vous', 'Brouillon du compte rendu au médecin traitant, envoyé après votre relecture.', 'Le médecin est informé, vous gardez la main.'],
  ];
  function vAutomations() {
    const count = k => S.emails.filter(m => m.template === (k === 'alerte' ? 'zzz' : k)).length;
    view.innerHTML = head('Automatisations', 'Ce qui se passe tout seul, et ce que vous gardez en main.') + `
      <div class="grid g-main"><div class="box"><h2>Règles actives</h2>${AUTOS.map(([k, w, d, g]) => `<div class="switch"><div><b>${esc(w)}</b><span>${esc(d)}</span><br><small>${esc(g)}${count(k) ? ' · ' + count(k) + ' envois dans la démo' : ''}</small></div><input type="checkbox" role="switch" aria-label="${esc(w)}" data-auto="${k}"${S.automations[k] ? ' checked' : ''}></div>`).join('')}</div>
      <div class="grid" style="align-content:start">
        <div class="box"><h2>Exemple de parcours</h2><p class="small muted" style="margin-top:-6px">Un rendez-vous pris aujourd’hui pour dans 45 jours.</p><ol class="timeline">${E.reminderPlan(E.addDays(TODAY, 45), TODAY).map((s, i) => `<li class="${i === 0 ? 'done' : ''}"><b>${esc(E.fmt(s.at))}</b><br><span class="small">${esc(s.label)}</span></li>`).join('')}</ol></div>
        <div class="box"><h2>Ce qui reste humain</h2><ul style="margin:0;padding-left:18px"><li>Le contenu de la consultation et les recommandations.</li><li>L’envoi d’un compte rendu au médecin.</li><li>La décision d’annuler un rendez-vous sans questionnaire.</li><li>Toute réponse personnelle à un patient.</li></ul></div>
      </div></div>`;
    $$('[data-auto]').forEach(i => i.addEventListener('change', () => { S.automations[i.dataset.auto] = i.checked; persist(); toast(i.checked ? 'Règle activée' : 'Règle désactivée'); }));
  }

  /* ===================== Réglages ===================== */
  function vSettings() {
    S.channels = S.channels || { email: true, sms: true, whatsapp: true };
    view.innerHTML = head('Réglages', 'Les règles du cabinet, appliquées partout.') + `
      <div class="grid g-3">
        <div class="box"><h2>Cabinets</h2>${Demo.LIEUX.map(l => `<p><b>${esc(l.name)}</b><br><span class="muted">${esc(l.address)}</span></p>`).join('')}<p class="small muted">Le suivi d’un patient reste toujours au même cabinet.</p></div>
        <div class="box"><h2>Règles</h2><dl class="kv" style="grid-template-columns:1fr auto"><dt>Questionnaire avant le RDV</dt><dd><b>30 jours</b></dd><dt>Pas de consultation</dt><dd><b>3e semaine</b></dd><dt>Délai de prise de RDV</dt><dd><b>35 jours min.</b></dd><dt>Visio</dt><dd><b>+ de 500 km</b></dd><dt>Secrétariat</dt><dd><b>9-12 h, 13-18 h</b></dd></dl></div>
        <div class="box"><h2>Canaux d’envoi</h2>
          <div class="switch"><div><b>E-mail</b><span>Envoi depuis l’adresse du cabinet</span><br><small>Connecté · domaine vérifié (démo)</small></div><input type="checkbox" role="switch" aria-label="E-mail" data-ch="email"${S.channels.email ? ' checked' : ''}></div>
          <div class="switch"><div><b>SMS</b><span>Prestataire européen, expéditeur « Cabinet AD »</span><br><small>${S.channels.sms ? 'Connecté · 0,07 € par SMS (démo)' : 'Déconnecté'}</small></div><input type="checkbox" role="switch" aria-label="SMS" data-ch="sms"${S.channels.sms ? ' checked' : ''}></div>
          <div class="switch"><div><b>WhatsApp Business</b><span>Modèles de messages approuvés, aucune information de santé</span><br><small>${S.channels.whatsapp ? 'Connecté · numéro vérifié · 4 modèles approuvés (démo)' : 'Déconnecté'}</small></div><input type="checkbox" role="switch" aria-label="WhatsApp Business" data-ch="whatsapp"${S.channels.whatsapp ? ' checked' : ''}></div>
          <p class="small muted" style="margin-bottom:0">Le patient choisit son canal et peut se désinscrire à tout moment. SMS et WhatsApp ne portent que la logistique : date, heure, lieu, lien.</p></div>
        <div class="box"><h2>Démonstration</h2><p class="small">Les données sont fictives et stockées dans ce navigateur. Remettre à zéro efface les rendez-vous et questionnaires ajoutés pendant la visite.</p><button class="btn sm" type="button" id="reset">Remettre la démo à zéro</button></div>
      </div>`;
    $$('[data-ch]').forEach(i => i.addEventListener('change', () => {
      const k = i.dataset.ch;
      if (k === 'whatsapp' && i.checked) {
        i.checked = false;
        dialog(`<h2 style="margin-top:0">Connecter WhatsApp Business</h2><ol class="timeline"><li class="done"><b>Compte Meta Business du cabinet</b><br><span class="small">Vérifié</span></li><li class="done"><b>Numéro du secrétariat</b><br><span class="small">Code de vérification reçu par SMS et validé</span></li><li class="done"><b>Modèles soumis à Meta</b><br><span class="small">Confirmation, rappel, dernier rappel, veille : approuvés</span></li><li class="done"><b>Consentement</b><br><span class="small">Case à cocher à la prise de rendez-vous, désinscription par « STOP »</span></li></ol><button class="btn sm" type="button" id="wa-ok">Activer WhatsApp</button>`);
        $('#wa-ok').addEventListener('click', () => { S.channels.whatsapp = true; persist(); $('#dlg').close(); toast('WhatsApp Business connecté (démo)'); vSettings(); });
        return;
      }
      if (k === 'email' && !i.checked) { i.checked = true; toast('L’e-mail reste le canal de référence'); return; }
      S.channels[k] = i.checked; persist(); toast(E.CHANNELS[k] + (i.checked ? ' connecté' : ' déconnecté')); vSettings();
    }));
    $('#reset').addEventListener('click', () => { Demo.reset(); S = Demo.load(); toast('Démo remise à zéro'); location.hash = '#aujourdhui'; });
  }

  /* ===================== Assistant IA et conformité (assets/ia.js) ===================== */
  const vIA = () => { view.innerHTML = Ai.catalogHtml(S); Ai.bindCatalog(view, S, { P, name, dialog, toast }); };
  const vConsult = id => { const a = S.appointments.find(x => x.id === id); view.innerHTML = Ai.consultHtml(S, a, { P, name, typ, lieu, subFor }); Ai.bindConsult(view, S, a, { P, name, toast, persist }); };
  const vConformite = () => { view.innerHTML = Ai.complianceHtml(); };

  route();
})();
