/* Questionnaire en ligne : reprend le questionnaire papier, enregistre au fil de l'eau,
   et dépose les réponses dans l'espace praticienne (démo : stockage local). */
(function () {
  'use strict';
  const { esc, $, $$, toast } = Site, E = Engine;
  Site.chrome('questionnaire');
  const S = Demo.load();
  const KEY = 'annick-questionnaire-brouillon';
  let D = {};
  try { D = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { D = {}; }
  D.step = D.step || 0; D.f = D.f || {}; D.answers = D.answers || {}; D.cortisol = D.cortisol || []; D.meds = D.meds || [{}, {}]; D.supps = D.supps || [{}, {}];
  /* Pré-remplissage depuis la prise de rendez-vous en ligne */
  try {
    const r = JSON.parse(localStorage.getItem('annick-dernier-rdv') || 'null');
    if (r && !D.f.last) Object.assign(D.f, { first: r.first, last: r.last, email: r.email, sex: r.sex, rdv: r.date, statut: 'nouveau' });
    if (r) D.link = { patient: r.patient, appointment: r.appointment };
  } catch (e) { /* rien */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); $('#q-save').textContent = 'Enregistré à ' + new Date().toTimeString().slice(0, 5) + ' sur cet appareil.'; } catch (e) { /* mode privé */ } progress(); };

  const DRINKS = ['Sodas (limonade, tonic, cola…)', 'Jus de fruits industriels', 'Jus de fruits frais', 'Vin', 'Alcool fort', 'Cocktails', 'Eau plate', 'Eau pétillante'];
  const FOODS = ['Lait, yaourt, fromage (vache)', 'Lait, yaourt végétal', 'Sucre blanc ou candi', 'Édulcorants, produits light ou zéro', 'Pain, biscottes', 'Pain sans gluten', 'Gâteaux, biscuits', 'Céréales, muesli, avoine', 'Bonbons', 'Chocolat', 'Pâte à tartiner', 'Confiture', 'Miel', 'Viande (bœuf, porc…)', 'Volaille', 'Poisson blanc', 'Poisson gras (saumon, maquereau, sardines…)', 'Fruits de mer', 'Œufs', 'Légumes', 'Légumes bio uniquement', 'Pâtes', 'Pâtes sans gluten', 'Plats industriels (lasagne, pizza…)', 'Traiteur'];
  const FAMILY = ['Obésité', 'Rhumatisme', 'Migraine', 'Dépression', 'Cholestérol', 'Goitre', 'Allergies', 'Goutte', 'Hypertension', 'Artériosclérose des jambes', 'Infarctus', 'Cancer', 'Diabète de type 1', 'Diabète de type 2', 'Alzheimer', 'Parkinson', 'Syndrome d’Ehlers-Danlos'];
  /* Fiche complémentaire « cortisol » : signes à surligner en jaune */
  const CORTISOL = ['Prise de poids', 'Fatigue et coups de pompe après le repas de midi', 'Moindre résistance au stress', 'Dépression par fatigue', 'Envie de sucre', 'Envie de sel', 'Hypotension', 'Douleurs articulaires ou musculaires', 'Tendinites', 'Crampes intestinales', 'Réactions allergiques accentuées', 'Mains tremblantes', 'Palpitations', 'Sentiment de panique', 'Incapacité à gérer le stress', 'Difficulté à se concentrer', 'Hypersensibilité émotionnelle', 'Facilement irritable', 'Épisodes d’hypoglycémie', 'Nausées face au stress', 'Récupération lente après un stress', 'Symptômes pseudo-grippaux', 'Mal de tête, mal au cuir chevelu', 'Peau hypersensible', 'Fatigue extrême après le repas de midi', 'Maladroit(e), se cogne partout', 'Tête dans le brouillard', 'Sursaute au moindre bruit', 'Essoufflement', 'Vertiges en se levant', 'Mal de mer', 'Somnolence malgré le café', 'Cernes sous les yeux', 'Réveil la nuit pendant plusieurs heures', 'Difficulté à s’endormir', 'Besoin d’uriner fréquemment', 'Aggravation des allergies'];

  const GROUPS = [['Humeur et sommeil', 'Humeur et sommeil'], ['Digestion', 'Digestion'], ['Hormones', 'Hormones'], ['Énergie, minéraux et acides gras', ['Énergie', 'Minéraux', 'Acides gras']]];
  const STEPS = ['Identification', 'Antécédents', 'Alimentation', ...GROUPS.map(g => g[0]), 'Fiche cortisol', 'Envoi'];
  const sex = () => D.f.sex || 'F';

  /* ---------- petits constructeurs de champs, tous reliés au brouillon ---------- */
  const v = k => esc(D.f[k] || '');
  const inp = (k, label, type, extra) => `<div class="field"><label for="k-${k}">${label}</label><input id="k-${k}" data-k="${k}" type="${type || 'text'}" value="${v(k)}"${extra || ''}></div>`;
  const area = (k, label, hint) => `<div class="field"><label for="k-${k}">${label}</label>${hint ? `<span class="hint">${hint}</span>` : ''}<textarea id="k-${k}" data-k="${k}">${v(k)}</textarea></div>`;
  const radios = (k, label, opts) => `<fieldset><legend style="font:700 .98rem var(--body)">${label}</legend><div class="choice">${opts.map(o => `<label><input type="radio" name="k-${k}" data-k="${k}" value="${esc(o)}"${D.f[k] === o ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</div></fieldset>`;
  const checks = (k, label, opts) => `<fieldset><legend style="font:700 .98rem var(--body)">${label}</legend><div class="choice">${opts.map(o => `<label><input type="checkbox" data-kc="${k}" value="${esc(o)}"${(D.f[k] || []).includes(o) ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</div></fieldset>`;
  const grid = (prefix, items, title) => `<div class="axis-block">${title ? `<h3>${title}</h3>` : ''}</div>
    <div class="scale-head" aria-hidden="true"><span></span>${E.SCALE.map((s, n) => `<span data-n="${n}">${esc(s)}</span>`).join('')}</div>
    ${items.map((t, i) => row(prefix + ':' + i, t)).join('')}`;
  function row(key, label) {
    const cur = D.answers[key];
    return `<div class="q-row" role="radiogroup" aria-label="${esc(label)}"><span class="t">${esc(label)}</span>${[0, 1, 2, 3].map(n => `<label title="${esc(E.SCALE[n])}"><input type="radio" name="${key}" value="${n}" data-a="${key}"${String(cur) === String(n) ? ' checked' : ''}>${n}</label>`).join('')}</div>`;
  }
  const list = (k, label, n) => `<fieldset><legend style="font:700 .98rem var(--body)">${label}</legend>${D[k].map((m, i) => `<div class="cols3"><div class="field"><label for="${k}${i}n">Nom</label><input id="${k}${i}n" type="text" data-l="${k}" data-i="${i}" data-p="n" value="${esc(m.n || '')}"></div><div class="field"><label for="${k}${i}d">Dosage</label><input id="${k}${i}d" type="text" data-l="${k}" data-i="${i}" data-p="d" value="${esc(m.d || '')}"></div><div class="field"><label for="${k}${i}p">Posologie</label><input id="${k}${i}p" type="text" data-l="${k}" data-i="${i}" data-p="p" value="${esc(m.p || '')}"></div></div>`).join('')}
    <button class="btn ghost sm" type="button" data-add="${k}">Ajouter une ligne</button></fieldset>`;

  function body(step) {
    if (step === 0) return `<h2>Identification</h2><p class="muted">En majuscules ou non, comme vous préférez : c’est lisible par définition.</p>
      ${radios('statut', 'Vous êtes', ['nouveau patient', 'patient existant'].map(x => x))}
      ${radios('sex', 'Sexe', ['F', 'M'])}
      <div class="cols2">${inp('last', 'Nom (de jeune fille le cas échéant)')}${inp('first', 'Prénom')}${inp('email', 'E-mail', 'email')}${inp('phone', 'Téléphone', 'tel')}${inp('birth', 'Date de naissance', 'date')}${inp('rdv', 'Date du rendez-vous', 'date')}</div>
      <div class="cols3">${inp('zip', 'Code postal')}${inp('city', 'Ville')}${inp('country', 'Pays')}${inp('children', 'Nombre d’enfants', 'number', ' min="0"')}${inp('height', 'Taille (cm)', 'number', ' min="0"')}${inp('weight', 'Poids (kg)', 'number', ' min="0"')}</div>
      <div class="cols2">${inp('job', 'Profession')}${radios('retired', 'Pensionné(e)', ['oui', 'non'])}</div>
      ${area('reason', 'La ou les raisons de votre demande de consultation')}
      ${radios('referrer', 'Vous êtes envoyé(e) par', ['Médecin', 'Spécialiste', 'Famille', 'Ami ou connaissance', 'Facebook', 'Instagram'])}
      ${area('doctors', 'Vos médecins traitants ou spécialistes pour ce problème', 'Nom, spécialité et adresse e-mail : les comptes rendus leur sont envoyés électroniquement.')}`;
    if (step === 1) return `<h2>Vos antécédents</h2><p class="muted">Un résumé suffit : maladies, opérations, traitements.</p>
      <h3 style="margin:8px 0 12px">Enfance et adolescence</h3>
      <div class="cols3">${inp('birthweight', 'Poids à la naissance (kg)')}</div>
      ${checks('childinf', 'Infections', ['Nez', 'Gorge', 'Oreilles', 'Sinusites', 'Angines', 'Otites', 'Bronchites', 'Primo-infection tuberculose'])}
      ${radios('puberty', 'Puberté', ['précoce', 'normale', 'tardive'])}${radios('childhealth', 'État général', ['bon', 'moyen', 'mauvais'])}${radios('teeth', 'État des dents', ['bon', 'moyen', 'mauvais'])}
      ${area('childops', 'Opérations, maladies avant l’âge adulte, et vers quel âge')}
      <h3 style="margin:22px 0 12px">Âge adulte</h3>
      ${area('adultops', 'Opérations, maladies, accidents, et vers quel âge')}
      ${radios('adulthealth', 'Votre état général', ['bon', 'moyen', 'mauvais'])}
      ${sex() === 'F' ? radios('menopause', 'Ménopause', ['oui', 'non']) : ''}
      ${area('sport', 'Sport', 'Lequel, combien de fois par semaine, combien de minutes')}
      ${radios('smoke', 'Fumez-vous ?', ['oui', 'non', 'anciennement'])}
      ${list('meds', 'Médicaments (nom, dosage, posologie)')}${list('supps', 'Vitamines et compléments alimentaires')}
      ${checks('exams', 'Examens déjà réalisés', ['Sang', 'Urines', 'Radiographie, échographie, IRM', 'Examens isotopiques'])}
      <p class="small muted">Joignez seulement votre dernière prise de sang (dans la version réelle, un bouton permet de la téléverser).</p>
      ${checks('family', 'Dans votre famille, qui a souffert de…', FAMILY)}
      ${area('familywho', 'Précisez le degré de parenté', 'Par exemple : « Diabète de type 2, père ».')}`;
    if (step === 2) return `<h2>Votre alimentation</h2><p class="muted">À quelle fréquence ? 0 : jamais · 1 : peu · 2 : souvent · 3 : très souvent.</p>
      ${grid('boisson', DRINKS, 'Ce que vous buvez')}
      <div class="cols3" style="margin-top:14px">${inp('water', 'Eau plate par jour (litres)')}${inp('fish', 'Poisson gras par semaine (fois)', 'number', ' min="0"')}</div>
      ${radios('breakfast', 'Prenez-vous un petit déjeuner ?', ['oui', 'non', 'parfois'])}
      ${area('meal1', 'Un petit déjeuner type')}${area('meal2', 'Un déjeuner type')}${area('meal3', 'Un repas du soir type')}
      ${grid('aliment', FOODS, 'Ce que vous mangez')}`;
    if (step >= 3 && step <= 6) {
      const g = GROUPS[step - 3], groups = [].concat(g[1]);
      const axes = E.AXES.filter(a => groups.includes(a.group));
      return `<h2>${esc(g[0])}</h2><p class="muted">Pour chaque signe : 0 jamais · 1 peu · 2 souvent · 3 énormément ou toujours. Laissez vide ce qui ne vous concerne pas.</p>
        ${axes.map(a => { const items = E.itemsFor(a, sex()); if (!items.length) return ''; return `<div class="axis-block"><h3>${esc(a.name)}<small>${items.length} signes</small></h3></div>
          <div class="scale-head" aria-hidden="true"><span></span>${E.SCALE.map((s, n) => `<span data-n="${n}">${esc(s)}</span>`).join('')}</div>
          ${items.map(({ t, i }) => row(a.id + ':' + i, t)).join('')}`; }).join('')}`;
    }
    if (step === 7) return `<h2>Fiche cortisol</h2><p class="muted">Surlignez en jaune les signes qui vous concernent. Touchez à nouveau pour retirer.</p>
      <ul class="cortisol-list">${CORTISOL.map(c => `<li><button type="button" class="sign" data-c="${esc(c)}" aria-pressed="${D.cortisol.includes(c)}">${esc(c)}</button></li>`).join('')}</ul>
      <p class="small muted" id="c-count">${D.cortisol.length} signe(s) surligné(s).</p>`;
    if (step === 8) {
      const answered = Object.keys(D.answers).filter(k => !k.startsWith('boisson') && !k.startsWith('aliment')).length;
      const miss = [['last', 'votre nom'], ['first', 'votre prénom'], ['email', 'votre e-mail'], ['rdv', 'la date du rendez-vous'], ['reason', 'la raison de la consultation']].filter(([k]) => !D.f[k]).map(x => x[1]);
      return `<h2>Vérifier et envoyer</h2>
        <dl class="kv" style="margin:18px 0 22px"><dt>Patient</dt><dd>${esc((D.f.first || '') + ' ' + (D.f.last || '')) || '·'}</dd><dt>Rendez-vous</dt><dd>${D.f.rdv ? esc(E.fmt(D.f.rdv, true)) + ' · à renvoyer avant le ' + esc(E.fmt(E.dueDate(D.f.rdv))) : '·'}</dd>
        <dt>Signes renseignés</dt><dd>${answered}</dd><dt>Fiche cortisol</dt><dd>${D.cortisol.length} signe(s) surligné(s)</dd></dl>
        ${miss.length ? `<div class="notice">Il manque encore ${esc(miss.join(', '))}. Vous pouvez revenir à l’étape correspondante.</div>` : ''}
        ${area('comments', 'Autres remarques ou commentaires')}
        <label class="small" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0 14px"><input type="checkbox" id="q-consent" style="margin-top:4px"${D.consent ? ' checked' : ''}> J’accepte que mes réponses, qui sont des données de santé, soient utilisées uniquement par ma praticienne pour préparer et suivre ma consultation. Je peux en demander l’accès ou la suppression à tout moment.</label>
        <p class="err" id="q-err" hidden></p>
        <p class="small muted">Vos réponses aident à orienter la consultation : elles ne constituent pas un diagnostic.</p>`;
    }
    return '';
  }

  function progress() {
    const total = E.AXES.reduce((n, a) => n + E.itemsFor(a, sex()).length, 0);
    const done = Object.keys(D.answers).filter(k => !k.startsWith('boisson') && !k.startsWith('aliment')).length;
    const pct = Math.min(100, Math.round((done / total) * 80 + (D.f.last ? 10 : 0) + (D.f.reason ? 10 : 0)));
    $('#q-bar').style.width = pct + '%';
    $('#q-prog').textContent = pct + ' % complété · ' + done + ' signes renseignés sur ' + total;
  }

  function view() {
    $('#q-steps').innerHTML = STEPS.map((s, i) => `<li${i === D.step ? ' aria-current="step"' : ''} class="${i < D.step ? 'done' : ''}"><button type="button" data-go="${i}">${esc(s)}</button></li>`).join('');
    $('#q-panel').innerHTML = body(D.step) + `<div class="form-nav">${D.step ? '<button class="btn ghost" type="button" id="q-prev">Précédent</button>' : '<span></span>'}${D.step < STEPS.length - 1 ? '<button class="btn" type="button" id="q-next">Continuer</button>' : '<button class="btn hlb" type="button" id="q-send">Envoyer mon questionnaire</button>'}</div>`;
    bind(); progress();
  }

  function bind() {
    $$('[data-go]').forEach(b => b.addEventListener('click', () => { D.step = +b.dataset.go; save(); view(); window.scrollTo({ top: 0 }); }));
    $$('[data-k]').forEach(el => el.addEventListener(el.type === 'radio' ? 'change' : 'input', () => { D.f[el.dataset.k] = el.value; if (el.dataset.k === 'sex') { save(); return; } save(); }));
    $$('[data-kc]').forEach(el => el.addEventListener('change', () => { const k = el.dataset.kc; D.f[k] = $$(`[data-kc="${k}"]:checked`).map(x => x.value); save(); }));
    $$('[data-a]').forEach(el => el.addEventListener('change', () => { D.answers[el.dataset.a] = +el.value; save(); }));
    $$('[data-l]').forEach(el => el.addEventListener('input', () => { D[el.dataset.l][+el.dataset.i][el.dataset.p] = el.value; save(); }));
    $$('[data-add]').forEach(b => b.addEventListener('click', () => { D[b.dataset.add].push({}); save(); view(); }));
    $$('[data-c]').forEach(b => b.addEventListener('click', () => {
      const c = b.dataset.c, on = D.cortisol.includes(c);
      D.cortisol = on ? D.cortisol.filter(x => x !== c) : D.cortisol.concat(c);
      b.setAttribute('aria-pressed', !on); $('#c-count').textContent = D.cortisol.length + ' signe(s) surligné(s).'; save();
    }));
    const p = $('#q-prev'), n = $('#q-next'), s = $('#q-send');
    if (p) p.addEventListener('click', () => { D.step--; save(); view(); window.scrollTo({ top: 0 }); });
    if (n) n.addEventListener('click', () => { D.step++; save(); view(); window.scrollTo({ top: 0 }); });
    if (s) s.addEventListener('click', send);
  }

  function send() {
    D.consent = $('#q-consent').checked;
    const err = $('#q-err');
    if (!D.f.last || !D.f.first || !D.f.email) { err.textContent = 'Indiquez au moins votre nom, votre prénom et votre e-mail (étape Identification).'; err.hidden = false; return; }
    if (!D.consent) { err.textContent = 'Votre accord est nécessaire pour transmettre des données de santé.'; err.hidden = false; return; }
    let pid = D.link && D.link.patient, aid = D.link && D.link.appointment;
    let p = S.patients.find(x => x.id === pid) || S.patients.find(x => x.email.toLowerCase() === String(D.f.email).toLowerCase());
    if (!p) {
      p = Demo.addExtra(S, 'patients', { id: 'w' + Date.now().toString(36), first: D.f.first, last: D.f.last, sex: D.f.sex || 'F', age: D.f.birth ? new Date().getFullYear() - new Date(D.f.birth).getFullYear() : null, motif: D.f.reason || '', lieu: 'anderlecht', email: D.f.email, phone: D.f.phone || '', zip: D.f.zip || '', city: D.f.city || '', referrer: D.f.referrer || '', doctor: D.f.doctors || '', since: E.iso(new Date()), web: true });
    } else if (D.f.reason && (!p.motif || p.motif.startsWith('À préciser'))) { p.motif = D.f.reason; }
    if (!aid) { const a = S.appointments.find(x => x.patient === p.id && x.status === 'prevu'); aid = a ? a.id : null; }
    Demo.addExtra(S, 'submissions', { id: 'q' + Date.now().toString(36), patient: p.id, appointment: aid, receivedOn: E.iso(new Date()), sex: D.f.sex || 'F', answers: D.answers, cortisol: D.cortisol, fields: D.f, meds: D.meds.filter(m => m.n), supps: D.supps.filter(m => m.n), source: 'en ligne', web: true });
    Demo.save(S);
    try { localStorage.removeItem(KEY); } catch (e) { /* rien */ }
    $('#q-panel').innerHTML = `<div class="notice ok"><b>Questionnaire envoyé.</b> Merci ${esc(D.f.first)}. Il a été reçu le ${esc(E.fmt(new Date()))}${D.f.rdv ? ', bien avant votre rendez-vous du ' + esc(E.fmt(D.f.rdv, true)) : ''}.</div>
      <h2>Ce qui se passe maintenant</h2>
      <p>Votre praticienne reçoit vos réponses classées par thème, avec les points à vérifier en consultation. Aucun scan, aucun courrier, rien à imprimer.</p>
      <div class="row" style="margin-top:20px"><a class="btn" href="espace.html#questionnaires">Voir ce que reçoit la praticienne</a><a class="btn ghost" href="index.html">Retour à l’accueil</a></div>`;
    $('#q-steps').innerHTML = ''; $('#q-bar').style.width = '100%'; $('#q-prog').textContent = 'Envoyé';
    toast('Questionnaire reçu par le cabinet');
  }
  view();
})();
