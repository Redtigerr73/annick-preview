/* Prise de rendez-vous : créneaux libres selon l'agenda fictif et la règle de la 3e semaine,
   confirmation immédiate, e-mail simulé, rendez-vous visible dans l'espace praticienne. */
(function () {
  'use strict';
  const { esc, $, $$, toast } = Site, E = Engine;
  Site.chrome('rdv');
  const S = Demo.load();
  const HOURS = ['09:00', '10:30', '13:30', '15:00', '16:30'];
  const st = { step: 0, type: 'rdv1', lieu: 'anderlecht', date: null, time: null, who: { first: '', last: '', email: '', phone: '', sex: '', distance: 'non' } };
  const panel = $('#rdv-panel');

  function stepper() { $$('#rdv-steps li').forEach((li, i) => { li.toggleAttribute('aria-current', i === st.step); if (i === st.step) li.setAttribute('aria-current', 'step'); li.classList.toggle('done', i < st.step); }); }

  function freeDays() {
    const out = [], start = E.addDays(new Date(), 35); // au moins 5 semaines : le questionnaire doit arriver un mois avant
    for (let d = new Date(start.setHours(0, 0, 0, 0)); out.length < 12; d = E.addDays(d, 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const day = E.iso(d);
      const busy = new Set(S.appointments.filter(a => a.date === day && a.lieu === st.lieu).map(a => a.time));
      const ok = E.isConsultationDay(d);
      out.push({ day, ok, times: ok ? HOURS.filter(h => !busy.has(h)) : [] });
      if (out.length > 40) break;
    }
    return out;
  }

  function view() {
    stepper();
    if (st.step === 0) {
      panel.innerHTML = `<h2>Quelle consultation ?</h2><p class="muted">Si vous venez pour la première fois, choisissez la première consultation.</p>
        <fieldset><legend class="sr">Type de consultation</legend><div class="choice" style="display:grid;gap:10px">
        ${Object.entries(Demo.TYPES).map(([k, t]) => `<label style="border-radius:12px;padding:14px 16px;align-items:flex-start"><input type="radio" name="type" value="${k}"${st.type === k ? ' checked' : ''}><span><b>${esc(t.name)}</b> · ${t.minutes} min<br><span class="muted small">${esc(t.desc)}</span></span></label>`).join('')}
        </div></fieldset>
        <div class="notice small">Deux consultations de nutrithérapie précèdent toujours un rendez-vous d’hormonologie avec le Dr Résimont.</div>
        <div class="form-nav"><span></span><button class="btn" type="button" id="next">Continuer</button></div>`;
      $$('input[name=type]').forEach(i => i.addEventListener('change', () => { st.type = i.value; }));
    }
    if (st.step === 1) {
      const days = freeDays();
      panel.innerHTML = `<h2>Cabinet et créneau</h2>
        <fieldset><legend>Cabinet</legend><div class="choice">
        ${Demo.LIEUX.map(l => `<label><input type="radio" name="lieu" value="${l.id}"${st.lieu === l.id ? ' checked' : ''}><span><b>${esc(l.short)}</b> · ${esc(l.address)}</span></label>`).join('')}
        </div><p class="small muted" style="margin-top:8px">Votre suivi aura toujours lieu au même cabinet.</p></fieldset>
        <fieldset><legend>Créneaux disponibles</legend>
        <p class="small muted">Les premiers créneaux commencent dans cinq semaines, pour laisser le temps au questionnaire. Pas de consultation la troisième semaine du mois.</p>
        <div class="slots">${days.map(d => `<div class="day${d.ok ? '' : ' off'}"><b>${esc(E.fmt(d.day, true).replace(/ \d{4}$/, ''))}</b>
          ${d.ok ? `<div class="times">${d.times.map(h => `<button class="time" type="button" data-d="${d.day}" data-h="${h}" aria-pressed="${st.date === d.day && st.time === h}">${h.replace(':', ' h ')}</button>`).join('') || '<span class="small muted">Complet</span>'}</div>` : '<span class="small muted">Pas de consultation</span>'}</div>`).join('')}</div></fieldset>
        <p class="err" id="e1" hidden>Choisissez un créneau pour continuer.</p>
        <div class="form-nav"><button class="btn ghost" type="button" id="prev">Retour</button><button class="btn" type="button" id="next">Continuer</button></div>`;
      $$('input[name=lieu]').forEach(i => i.addEventListener('change', () => { st.lieu = i.value; st.date = st.time = null; view(); }));
      $$('.time').forEach(b => b.addEventListener('click', () => { st.date = b.dataset.d; st.time = b.dataset.h; $$('.time').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
    }
    if (st.step === 2) {
      const w = st.who;
      panel.innerHTML = `<h2>Vos coordonnées</h2><p class="muted">Pour vous envoyer la confirmation et le questionnaire.</p>
        <div class="cols2">
          <div class="field"><label for="f1">Prénom</label><input id="f1" type="text" autocomplete="given-name" value="${esc(w.first)}" required></div>
          <div class="field"><label for="f2">Nom</label><input id="f2" type="text" autocomplete="family-name" value="${esc(w.last)}" required></div>
          <div class="field"><label for="f3">E-mail</label><input id="f3" type="email" autocomplete="email" value="${esc(w.email)}" required></div>
          <div class="field"><label for="f4">Téléphone</label><input id="f4" type="tel" autocomplete="tel" value="${esc(w.phone)}"></div>
        </div>
        <fieldset><legend>Vous êtes</legend><div class="choice">
          <label><input type="radio" name="sex" value="F"${w.sex === 'F' ? ' checked' : ''}> Une femme</label><label><input type="radio" name="sex" value="M"${w.sex === 'M' ? ' checked' : ''}> Un homme</label>
        </div><p class="small muted" style="margin-top:6px">Pour adapter les questions hormonales du questionnaire.</p></fieldset>
        <label class="small" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="consent"${w.consent ? ' checked' : ''} style="margin-top:4px"> J’accepte que mes coordonnées et mes réponses servent uniquement à préparer et suivre ma consultation. Je peux demander leur suppression à tout moment.</label>
        <p class="err" id="e2" hidden></p>
        <div class="form-nav"><button class="btn ghost" type="button" id="prev">Retour</button><button class="btn" type="button" id="next">Confirmer le rendez-vous</button></div>`;
    }
    if (st.step === 3) {
      const lieu = Demo.LIEUX.find(l => l.id === st.lieu), due = E.dueDate(st.date);
      const mail = E.render('confirmation', { prenom: st.who.first, date: E.fmt(st.date, true), heure: st.time.replace(':', ' h '), lieu: lieu.name + ', ' + lieu.address, echeance: E.fmt(due), lien: 'questionnaire en ligne' });
      panel.innerHTML = `<div class="notice ok"><b>Rendez-vous confirmé.</b> ${esc(Demo.TYPES[st.type].name)}, ${esc(E.fmt(st.date, true))} à ${esc(st.time.replace(':', ' h '))}, ${esc(lieu.short)}.</div>
        <h2>Et maintenant ?</h2>
        <ol class="timeline" style="margin:18px 0 26px">${E.reminderPlan(st.date, new Date()).map((s, i) => `<li class="${i === 0 ? 'done' : ''}"><b>${esc(E.fmt(s.at))}</b><br><span class="small">${esc(s.label)}</span></li>`).join('')}</ol>
        <p class="lbl">L’e-mail que vous venez de recevoir (simulé)</p>
        <div class="mail"><header><span><b>À :</b> ${esc(st.who.email)}</span><span><b>Objet :</b> ${esc(mail.subject)}</span></header><pre>${esc(mail.body)}</pre></div>
        <div class="form-nav"><a class="btn ghost" href="espace.html#agenda">Voir ce rendez-vous côté cabinet</a><a class="btn" href="questionnaire.html">Remplir mon questionnaire</a></div>`;
    }
    const n = $('#next'), p = $('#prev');
    if (p) p.addEventListener('click', () => { st.step--; view(); panel.scrollIntoView({ block: 'start' }); });
    if (n) n.addEventListener('click', next);
  }

  function next() {
    if (st.step === 1 && !st.date) { $('#e1').hidden = false; return; }
    if (st.step === 2) {
      const w = st.who; w.first = $('#f1').value.trim(); w.last = $('#f2').value.trim(); w.email = $('#f3').value.trim(); w.phone = $('#f4').value.trim();
      const sx = document.querySelector('input[name=sex]:checked'); w.sex = sx ? sx.value : ''; w.consent = $('#consent').checked;
      const e = $('#e2');
      const miss = !w.first ? 'votre prénom' : !w.last ? 'votre nom' : !/^\S+@\S+\.\S+$/.test(w.email) ? 'une adresse e-mail valide' : !w.sex ? 'si vous êtes une femme ou un homme' : !w.consent ? 'votre accord pour l’utilisation de vos données' : '';
      if (miss) { e.textContent = 'Il manque ' + miss + '.'; e.hidden = false; return; }
      book();
    }
    st.step++; view(); panel.scrollIntoView({ block: 'start' });
  }

  function book() {
    const w = st.who, id = 'v' + Date.now().toString(36);
    let p = S.patients.find(x => x.email.toLowerCase() === w.email.toLowerCase());
    if (!p) p = Demo.addExtra(S, 'patients', { id, first: w.first, last: w.last, sex: w.sex, age: null, motif: 'À préciser dans le questionnaire', lieu: st.lieu, email: w.email, phone: w.phone, zip: '', city: '', referrer: 'Site internet', doctor: '', since: E.iso(new Date()), web: true });
    const a = Demo.addExtra(S, 'appointments', { id: 'a' + id, patient: p.id, type: st.type, lieu: st.lieu, date: st.date, time: st.time, status: 'prevu', bookedOn: E.iso(new Date()), web: true });
    Demo.addExtra(S, 'emails', { id: 'm' + id, patient: p.id, appointment: a.id, template: 'confirmation', at: E.iso(new Date()), status: 'envoye', web: true });
    try { localStorage.setItem('annick-dernier-rdv', JSON.stringify({ patient: p.id, appointment: a.id, first: w.first, last: w.last, email: w.email, sex: w.sex, date: st.date })); } catch (e) { /* rien */ }
    toast('Rendez-vous ajouté à l’agenda du cabinet');
  }
  view();
})();
