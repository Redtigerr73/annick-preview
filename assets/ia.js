/* Assistant IA (simulé) et conformité : aucune IA n'est appelée dans la démo.
   Tout est généré localement à partir des données fictives, pour montrer le résultat attendu. */
(function () {
  'use strict';
  const { esc, $, $$ } = Site, E = Engine;
  const T = E.iso(new Date().setHours(0, 0, 0, 0));
  const DEMO = '<span class="chip bientot">Démo · simulé</span>';

  /* Biologie souvent demandée selon l'axe (propositions à valider par la praticienne) */
  const BIO = {
    thyroide: 'TSH, T4 libre, T3 libre, anticorps anti-TPO', fer: 'Ferritine, fer sérique, coefficient de saturation, CRP', magnesium: 'Magnésium érythrocytaire',
    glucose: 'Glycémie à jeun, HbA1c, insuline à jeun', cortisol: 'Cortisol (selon protocole du laboratoire)', dhea: 'DHEA-S', zinc: 'Zinc sérique', omega3: 'Profil des acides gras érythrocytaires',
    omega6: 'Profil des acides gras érythrocytaires', dysbiose: 'À discuter : analyse du microbiote', foie: 'Transaminases, gamma-GT, bilirubine', progesterone: 'Bilan hormonal selon le cycle', oestrogenes: 'Bilan hormonal selon le cycle', testosterone: 'Testostérone totale et libre, SHBG',
    croissance: 'IGF-1', acidose: 'Bilan acido-basique selon avis', melatonine: 'À discuter selon le tableau du sommeil', serotonine: 'À discuter : pas de dosage de routine', noradrenaline: 'À discuter', dopamine: 'À discuter',
    enzymes: 'Élastase fécale selon avis', hypochlorhydrie: 'À discuter selon les symptômes', allergie: 'IgG alimentaires : intérêt à discuter',
  };
  const CONSEILS = {
    glucose: 'Des repas réguliers, une source de protéines à chaque repas, moins de sucres rapides en fin de journée.', magnesium: 'Des aliments riches en magnésium (oléagineux, légumes verts, cacao cru), une hydratation suffisante.',
    dysbiose: 'Une alimentation riche en fibres variées, réintroduites progressivement, et moins de produits ultra-transformés.', thyroide: 'Des apports suffisants en iode et en sélénium, sous réserve de la biologie.',
    fer: 'Des sources de fer associées à de la vitamine C, et le thé ou le café à distance des repas.', omega3: 'Du poisson gras deux fois par semaine, de l’huile de colza ou de noix.', cortisol: 'Des horaires de repas et de sommeil réguliers, des pauses de récupération dans la journée.',
    melatonine: 'De la lumière naturelle le matin, des écrans réduits le soir, un dîner léger.', zinc: 'Des fruits de mer, des œufs, des graines de courge.',
  };

  /* ---------- synthèse pré-consultation (questionnaire) ---------- */
  function preSummary(s, p) {
    const prof = E.profile(s.answers, s.sex), pri = E.priorities(prof), fl = E.flags(s.answers);
    const quiet = prof.filter(a => a.score < 15).map(a => a.name);
    return {
      intro: `${p.first} ${p.last}, ${p.age ? p.age + ' ans, ' : ''}consulte pour : « ${p.motif} ».`,
      lines: pri.map(a => `${a.name} (${a.score}/100) : ${a.top.slice(0, 3).join(', ') || 'signes modérés et diffus'}.`),
      quiet: quiet.slice(0, 6),
      flags: fl,
      bio: Array.from(new Set(pri.map(a => BIO[a.id]).filter(Boolean))).concat('25-OH vitamine D'),
      questions: pri.map(a => 'Depuis quand les signes de l’axe « ' + a.name.toLowerCase() + ' » sont-ils présents, et qu’est-ce qui les aggrave ?'),
    };
  }
  function preSummaryHtml(s, p) {
    const x = preSummary(s, p);
    return `<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Synthèse pré-consultation</h2>${DEMO}</div>
      <p style="margin-top:10px">${esc(x.intro)}</p>
      <p class="lbl">Ce qui ressort du questionnaire</p><ul>${x.lines.map(l => `<li>${esc(l)}</li>`).join('') || '<li>Aucun axe marqué.</li>'}</ul>
      ${x.quiet.length ? `<p class="small muted">Peu ou pas de signes : ${esc(x.quiet.join(', '))}.</p>` : ''}
      ${x.flags.length ? `<div class="notice danger"><b>À vérifier en priorité</b><ul style="margin:6px 0 0;padding-left:18px">${x.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
      <p class="lbl">Questions à poser</p><ul>${x.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
      <p class="lbl">Biologie à envisager (à valider)</p><p class="small">${esc(x.bio.join(' · '))}</p>
      <p class="small muted">Rédigé automatiquement à partir des réponses du patient. Ce n’est pas un diagnostic : à relire avant la consultation.</p>`;
  }

  /* ---------- transcription simulée ---------- */
  function script(p, sub) {
    const pri = sub ? E.priorities(E.profile(sub.answers, sub.sex)) : [];
    const top = pri[0], second = pri[1];
    const lines = [
      ['Praticienne', `Bonjour, asseyez-vous. J’ai lu votre questionnaire. Vous venez pour : ${p.motif.toLowerCase()}. Racontez-moi depuis quand.`],
      ['Patient', 'Ça a commencé il y a à peu près un an et demi. Au début je pensais que c’était le travail, mais même en vacances ça ne passe pas.'],
      ['Praticienne', 'À quel moment de la journée est-ce le plus marqué ?'],
      ['Patient', top && top.id === 'glucose' ? 'Après le repas de midi, c’est terrible. Je pourrais dormir sur mon bureau. Et vers seize heures j’ai besoin de sucré.' : 'Le matin surtout, j’ai du mal à démarrer, il me faut deux cafés. Et le soir je suis épuisé mais je ne m’endors pas.'],
      ['Praticienne', top ? `Dans le questionnaire, l’axe « ${top.name.toLowerCase()} » ressort nettement : ${top.top.slice(0, 2).join(', ').toLowerCase() || 'plusieurs signes'}. Vous vous reconnaissez là-dedans ?` : 'Vous vous reconnaissez dans les signes que vous avez cochés ?'],
      ['Patient', 'Oui, complètement. Et mon sommeil n’est pas bon, je me réveille vers trois heures du matin.'],
      ['Patient', 'Au fait, mon fils a son examen de piano ce week-end, je suis un peu stressé pour lui.'],
      ['Praticienne', second ? `On va regarder aussi l’axe « ${second.name.toLowerCase()} ». Qu’est-ce que vous mangez le matin, en général ?` : 'Qu’est-ce que vous mangez le matin, en général ?'],
      ['Patient', 'Souvent rien, ou un croissant au bureau. À midi un sandwich. Le soir on mange tard, vers vingt et une heures.'],
      ['Praticienne', 'Et en traitement, vous prenez quelque chose actuellement ? Des compléments ?'],
      ['Patient', 'Rien sur ordonnance. Du magnésium de temps en temps, quand j’ai des crampes.'],
      ['Praticienne', 'Je vais vous remettre une demande de biologie complète, à faire dans un laboratoire spécialisé. On se revoit quand on aura les résultats, pour ajuster.'],
      ['Patient', 'D’accord. Et en attendant, je peux déjà changer quelque chose ?'],
      ['Praticienne', 'Oui : un petit déjeuner avec des protéines, un dîner plus tôt et plus léger, et on note vos réveils pendant deux semaines.'],
    ];
    return lines;
  }
  function summary(p, sub) {
    const pri = sub ? E.priorities(E.profile(sub.answers, sub.sex)) : [];
    const fl = sub ? E.flags(sub.answers) : [];
    return {
      motif: p.motif,
      contexte: 'Signes présents depuis environ 18 mois, persistants pendant les congés. Petit déjeuner souvent absent, dîner tardif (vers 21 h). Magnésium pris ponctuellement pour des crampes. Aucun traitement sur ordonnance déclaré.',
      signes: ['Fatigue marquée ' + (pri[0] && pri[0].id === 'glucose' ? 'après le repas de midi, envie de sucré vers 16 h' : 'au réveil, besoin de café pour démarrer'), 'Réveils nocturnes vers 3 h', ...pri.flatMap(a => a.top.slice(0, 1))].filter((v, i, a) => a.indexOf(v) === i),
      axes: pri.map(a => `${a.name} (${a.score}/100)`),
      hypotheses: pri.map(a => `Un déséquilibre de l’axe « ${a.name.toLowerCase()} » pourrait contribuer au tableau : à confirmer par la biologie.`),
      bio: Array.from(new Set(pri.map(a => BIO[a.id]).filter(Boolean))).concat('25-OH vitamine D', 'Hémogramme'),
      reco: ['Petit déjeuner protéiné', 'Dîner plus tôt et plus léger', 'Journal des réveils nocturnes pendant deux semaines', ...pri.map(a => CONSEILS[a.id]).filter(Boolean).slice(0, 2)],
      suite: ['Prise de sang en laboratoire spécialisé', 'Deuxième rendez-vous à réception des résultats', 'Compte rendu au médecin traitant après accord du patient'],
      vigilance: fl,
      ecarte: ['Échange personnel sur l’examen de piano du fils : sans lien avec la consultation, non repris (minimisation).'],
    };
  }
  const SECTIONS = [['motif', 'Motif'], ['contexte', 'Contexte et histoire'], ['signes', 'Signes rapportés'], ['axes', 'Axes à explorer'], ['hypotheses', 'Hypothèses fonctionnelles à confirmer'], ['bio', 'Biologie proposée'], ['reco', 'Premières recommandations'], ['suite', 'Prochaines étapes'], ['vigilance', 'Points de vigilance']];

  function consultHtml(S, a, h) {
    if (!a) return '<div class="empty">Choisissez un rendez-vous depuis l’agenda. <a href="#agenda">Ouvrir l’agenda</a></div>';
    const p = h.P(a.patient), sub = h.subFor(a);
    return `<p class="small"><a href="#ia">Assistant IA</a> · <a href="#patient/${esc(p.id)}">${esc(h.name(p))}</a></p>
      <div class="topline"><div><h1>Consultation de ${esc(h.name(p))}</h1><p>${esc(h.typ(a.type).name)} · ${esc(E.fmt(a.date, true))} · ${esc(a.time.replace(':', ' h '))} · ${esc(h.lieu(a.lieu).short)}</p></div>${DEMO}</div>
      <ol class="csteps" id="c-steps"><li class="cur"><i>1</i>Accord du patient</li><li><i>2</i>Enregistrement</li><li><i>3</i>Résumé par l’IA</li><li><i>4</i>Votre validation</li><li><i>5</i>Envois</li></ol>
      <div class="notice ai small">Démonstration : la transcription et le résumé sont simulés, aucun micro n’est utilisé. En service, l’audio est traité dans l’Union européenne, n’est jamais réutilisé pour entraîner un modèle, et il est supprimé dès que le résumé est validé.</div>
      <div class="grid g-main">
        <div class="box" id="c-left">
          <h2>1 · Accord du patient</h2>
          <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="c-consent" style="margin-top:5px"> <span>Le patient a été informé et accepte que la consultation soit enregistrée pour en rédiger le résumé. Il peut refuser sans aucune conséquence sur sa prise en charge.</span></label>
          <label style="display:flex;gap:10px;align-items:flex-start;margin-top:10px"><input type="checkbox" id="c-pseudo" checked style="margin-top:5px"> <span>Pseudonymiser la transcription (le nom du patient est remplacé avant tout traitement).</span></label>
          <div class="row" style="margin-top:16px"><button class="btn" type="button" id="c-start" disabled>Démarrer l’enregistrement</button><button class="btn ghost" type="button" id="c-stop" disabled>Terminer et résumer</button><span class="small muted" id="c-timer"></span></div>
          <h2 style="margin-top:24px">2 · Transcription</h2>
          <div id="c-trans" class="small trans" style="max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--bg)"><p class="muted" style="margin:0">La transcription apparaîtra ici, intervenant par intervenant.</p></div>
        </div>
        <div class="box" id="c-right">
          <h2>3 · Résumé structuré</h2>
          <div id="c-sum"><div class="empty">Le résumé se rédige à la fin de l’enregistrement. Vous le relisez, le corrigez, puis le validez.</div></div>
        </div>
      </div>`;
  }
  function bindConsult(root, S, a, h) {
    if (!a) return;
    const p = h.P(a.patient), sub = S.submissions.filter(s => s.patient === a.patient)[0];
    const lines = script(p, sub);
    let i = 0, timer = null, t0 = 0;
    const consent = $('#c-consent', root), start = $('#c-start', root), stop = $('#c-stop', root), out = $('#c-trans', root);
    const stepTo = n => $$('#c-steps li', root).forEach((li, k) => { li.className = k < n ? 'done' : k === n ? 'cur' : ''; });
    consent.addEventListener('change', () => { start.disabled = !consent.checked; stepTo(consent.checked ? 1 : 0); });
    start.addEventListener('click', () => {
      start.disabled = true; stop.disabled = false; consent.disabled = true; out.innerHTML = ''; t0 = Date.now();
      const pseudo = $('#c-pseudo', root).checked;
      const step = () => {
        if (i >= lines.length) { clearInterval(timer); return; }
        const [who, txt] = lines[i++];
        const sec = Math.round((Date.now() - t0) / 1000) * 9;
        const shown = pseudo ? txt.split(p.first).join('[Patient]').split(p.last).join('') : txt;
        const el = document.createElement('p');
        el.innerHTML = `<b class="${who === 'Patient' ? 'pa' : 'pr'}">${esc(who === 'Patient' && pseudo ? '[Patient]' : who)}</b> <span class="muted">${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}</span><br>${esc(shown)}`;
        out.appendChild(el); out.scrollTop = out.scrollHeight;
        $('#c-timer', root).innerHTML = '<span class="rec">Enregistrement en cours · ' + i + '/' + lines.length + ' échanges</span>';
      };
      step(); timer = setInterval(step, 900);
    });
    stop.addEventListener('click', () => {
      clearInterval(timer); while (i < lines.length) { const [who, txt] = lines[i++]; const el = document.createElement('p'); el.innerHTML = `<b>${esc(who)}</b><br>${esc(txt)}`; out.appendChild(el); }
      stop.disabled = true; stepTo(3); $('#c-timer', root).textContent = 'Enregistrement terminé · audio supprimé après validation';
      const x = summary(p, sub);
      $('#c-sum', root).innerHTML = `<p class="small muted" style="margin-top:-6px">Brouillon rédigé à partir de la transcription et du questionnaire. Chaque partie est modifiable.</p>
        ${SECTIONS.map(([k, l]) => { const val = x[k]; const txt = Array.isArray(val) ? (val.length ? val.map(v => '• ' + v).join('\n') : '• Aucun') : val; return `<div class="field"><label for="s-${k}">${esc(l)}</label><textarea id="s-${k}" data-s="${k}" style="min-height:${Array.isArray(val) ? 70 + val.length * 18 : 70}px">${esc(txt)}</textarea></div>`; }).join('')}
        <div class="notice small"><b>Écarté du résumé</b><br>${x.ecarte.map(esc).join('<br>')}</div>
        <p class="small"><b>Le résumé ne pose aucun diagnostic.</b> Les hypothèses sont des pistes, la décision et les recommandations restent les vôtres.</p>
        <div class="row"><button class="btn" type="button" id="s-ok">Valider et classer au dossier</button><button class="btn ghost sm" type="button" id="s-doc">Compte rendu au médecin</button><button class="btn ghost sm" type="button" id="s-pat">Fiche conseils pour le patient</button><button class="btn ghost sm" type="button" id="s-nl">Version néerlandaise</button></div>
        <div id="s-out" style="margin-top:16px"></div>`;
      const val = k => ($(`[data-s="${k}"]`, root) || {}).value || '';
      $('#s-ok', root).addEventListener('click', () => {
        S.notes = S.notes || {}; S.notes[p.id] = 'Résumé validé le ' + E.fmt(T) + '\n\n' + SECTIONS.map(([k, l]) => l + '\n' + val(k)).join('\n\n');
        h.persist(); stepTo(4); h.toast('Résumé validé et classé au dossier. Audio supprimé.');
      });
      $('#s-doc', root).addEventListener('click', () => { stepTo(5);
        $('#s-out', root).innerHTML = `<p class="lbl">Brouillon · compte rendu au médecin traitant ${DEMO}</p><div class="mail"><header><span><b>À :</b> ${esc(p.doctor || 'médecin traitant')}</span><span><b>Objet :</b> Consultation de nutrithérapie, ${esc(p.first + ' ' + p.last)}</span></header><pre>${esc(`Chère Consœur, cher Confrère,

J’ai reçu ${p.first} ${p.last} le ${E.fmt(a.date)} pour : ${p.motif.toLowerCase()}.

Éléments rapportés : ${val('signes').replace(/• /g, '').replace(/\n/g, ' ; ')}.
Axes explorés : ${val('axes').replace(/• /g, '').replace(/\n/g, ' ; ')}.
Biologie demandée : ${val('bio').replace(/• /g, '').replace(/\n/g, ' ; ')}.
Premières recommandations : ${val('reco').replace(/• /g, '').replace(/\n/g, ' ; ')}.

Je vous tiendrai informé(e) après la lecture des résultats.

Bien confraternellement,
Annick Dejonckheere`)}</pre></div><p class="small muted">Envoyé seulement après votre relecture, et si le patient a accepté le partage avec son médecin.</p>`;
      });
      $('#s-pat', root).addEventListener('click', () => {
        $('#s-out', root).innerHTML = `<p class="lbl">Fiche conseils remise au patient ${DEMO}</p><div class="mail"><header><span><b>Pour :</b> ${esc(p.first)}</span><span>En mots simples, sans jargon</span></header><pre>${esc(`Bonjour ${p.first},

Voici ce que nous avons convenu aujourd’hui.

Ce que vous pouvez faire dès maintenant
${val('reco')}

La suite
• Faire la prise de sang dans un laboratoire spécialisé, avec la demande remise
• Nous revoir à réception des résultats

Si un symptôme s’aggrave brusquement, contactez votre médecin. En cas d’urgence, appelez le 112.

Annick Dejonckheere`)}</pre></div>`;
      });
      $('#s-nl', root).addEventListener('click', () => {
        $('#s-out', root).innerHTML = `<p class="lbl">Version néerlandaise (extrait) ${DEMO}</p><div class="mail"><pre>${esc(`Reden van consultatie: ${p.motif}
Klachten sinds ongeveer 18 maanden, ook tijdens vakanties.
Voorgestelde bloedanalyse: ${val('bio').replace(/• /g, '').replace(/\n/g, ', ')}.
Volgende stap: tweede afspraak na ontvangst van de resultaten.`)}</pre></div><p class="small muted">Traduction proposée par l’outil, à relire : les termes médicaux sont vérifiés par la praticienne.</p>`;
      });
    });
  }

  /* ---------- catalogue des usages IA : déclencheur → l'IA prépare → vous validez → résultat ---------- */
  const ICO = {
    doc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
    mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    note: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8 13h8M8 17h5"/>',
    lang: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-6 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
    letter: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h4"/>',
  };
  const ic = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
  const GROUPS = [['avant', 'Avant la consultation', 'c-saffron'], ['pendant', 'Pendant la consultation', 'c-teal'], ['apres', 'Après la consultation', 'c-orange'], ['quotidien', 'Au quotidien', 'c-slate']];
  const USES = [
    { k: 'pre', g: 'avant', ic: 'doc', t: 'Synthèse pré-consultation', w: 'La veille du RDV 1', trig: 'Le questionnaire est reçu et le RDV a lieu demain.', ai: 'Résume les réponses : axes marqués, absences notables, questions à poser, biologie à envisager.', you: 'Vous relisez 2 minutes avant d’accueillir le patient.', res: 'Une page dans la fiche patient.', guard: 'Les scores orientent, ils ne décident pas ; signes d’alerte en tête.' },
    { k: 'scan', g: 'avant', ic: 'scan', t: 'Questionnaire papier lu', w: 'À réception d’un scan', trig: 'Un patient renvoie son questionnaire scanné par e-mail.', ai: 'Reconnaît les cases cochées et l’écriture, signale les zones incertaines.', you: 'Vous confirmez les réponses douteuses, montrées à côté de l’image.', res: 'Questionnaire complet en ligne, scores calculés.', guard: 'Aucune réponse incertaine n’est retenue sans vous.' },
    { k: 'trad', g: 'avant', ic: 'lang', t: 'Traduction', w: 'Patient non francophone', trig: 'Le patient choisit le néerlandais ou l’anglais.', ai: 'Traduit questionnaire, e-mails et fiches conseils.', you: 'Vous lisez toujours les réponses en français.', res: 'Le patient est servi dans sa langue.', guard: 'Les termes médicaux sont vérifiés.' },
    { k: 'consult', g: 'pendant', ic: 'mic', t: 'Transcription et résumé', w: 'Pendant le RDV', trig: 'Vous lancez l’enregistrement, après l’accord du patient.', ai: 'Transcrit par intervenant, écarte le hors-sujet, rédige un résumé en 9 rubriques.', you: 'Vous corrigez et validez le résumé.', res: 'Résumé classé au dossier, audio supprimé.', guard: 'Accord explicite, pseudonymisation, aucun diagnostic proposé.' },
    { k: 'bio', g: 'apres', ic: 'drop', t: 'Lecture de la prise de sang', w: 'À réception du PDF', trig: 'Le laboratoire envoie les résultats.', ai: 'Extrait valeurs, unités et normes ; met en évidence les écarts et l’évolution.', you: 'Vous interprétez au RDV 2.', res: 'Un tableau dans la fiche, à côté du profil.', guard: 'Valeurs relues ; les normes restent celles du laboratoire.' },
    { k: 'fiche', g: 'apres', ic: 'note', t: 'Fiche conseils patient', w: 'Après validation du résumé', trig: 'Vous validez le résumé de consultation.', ai: 'Reformule vos recommandations en mots simples.', you: 'Vous relisez avant l’envoi.', res: 'Fiche envoyée par e-mail au patient.', guard: 'Aucun dosage proposé par l’outil.' },
    { k: 'doc', g: 'apres', ic: 'letter', t: 'Compte rendu au médecin', w: 'Après le RDV 2', trig: 'Le résumé est validé et le patient accepte le partage.', ai: 'Prépare le courrier au médecin traitant à partir du résumé.', you: 'Vous relisez et envoyez.', res: 'Le médecin traitant est informé.', guard: 'Uniquement avec l’accord du patient.' },
    { k: 'inbox', g: 'quotidien', ic: 'mail', t: 'Tri des e-mails', w: 'À chaque message', trig: 'Un patient écrit au cabinet.', ai: 'Classe le message (déplacement, question, résultats, inquiétude) et propose une réponse.', you: 'Vous envoyez, modifiez ou répondez vous-même.', res: 'Boîte de réception triée.', guard: 'Une inquiétude médicale renvoie toujours vers le médecin ou le 112.' },
    { k: 'search', g: 'quotidien', ic: 'search', t: 'Recherche en langage courant', w: 'Quand vous voulez', trig: 'Vous posez une question : « fatigués avec un sommeil perturbé ».', ai: 'Cherche dans vos dossiers et explique ce qu’il a compris.', you: 'Vous ouvrez les dossiers trouvés.', res: 'Une liste de patients.', guard: 'Vos dossiers uniquement, recherche journalisée.' },
  ];
  function catalogHtml(S) {
    const next = S.appointments.filter(a => a.status === 'prevu' && a.date >= T).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))[0];
    const np = next && S.patients.find(p => p.id === next.patient);
    const row = u => `<div class="use"><span class="ti">${ic(u.ic)}<span><b>${esc(u.t)}</b><small>${esc(u.w)}</small></span></span><span class="c-trig"><em>Déclencheur : </em>${esc(u.trig)}</span><span class="c-ai"><em>L’IA prépare : </em>${esc(u.ai)}</span><span class="c-you"><em>Vous : </em>${esc(u.you)}</span><span><em>Résultat : </em>${esc(u.res)}<small class="c-g">Garde-fou : ${esc(u.guard)}</small></span><span>${u.k === 'consult' ? (next ? `<a class="btn xs ai" href="#consultation/${esc(next.id)}">Essayer</a>` : '') : `<button class="btn xs ai" type="button" data-try="${u.k}">Essayer</button>`}</span></div>`;
    return `<div class="topline"><div><h1>Assistant IA</h1><p>Ce que l’IA prépare, ce que vous validez. Elle ne décide jamais et n’envoie rien seule.</p></div>${DEMO}</div>
      <div class="howto">
        <div class="c-blue"><b>Un déclencheur</b><span>Questionnaire reçu, PDF du labo, enregistrement lancé.</span></div>
        <div class="c-violet"><b>L’IA prépare</b><span>Un brouillon, jamais une décision.</span></div>
        <div class="c-green"><b>Vous validez</b><span>Vous relisez, corrigez, acceptez.</span></div>
        <div class="c-blue"><b>C’est classé ou envoyé</b><span>Au dossier, au patient, au médecin.</span></div>
      </div>
      ${next ? `<div class="notice ai small row" style="justify-content:space-between"><span><b>Essayer en direct :</b> la consultation de ${esc(np ? np.first + ' ' + np.last : '')}, ${esc(E.fmt(next.date, true))} à ${esc(next.time.replace(':', ' h '))}. Accord, transcription, résumé, courrier : tout est simulé.</span><a class="btn sm ai" href="#consultation/${esc(next.id)}">Démarrer la consultation</a></div>` : ''}
      <div class="uses"><div class="use head"><span>Usage</span><span>Déclencheur</span><span>L’IA prépare</span><span>Vous</span><span>Résultat et garde-fou</span><span></span></div>
        ${GROUPS.map(([g, l, c]) => `<p class="grp-h ${c}">${esc(l)}</p>${USES.filter(u => u.g === g).map(row).join('')}`).join('')}
      </div>
      <section class="box" style="margin-top:12px"><h2>Ce que l’assistant ne fait jamais</h2><div class="never"><div>Poser un diagnostic, prescrire ou proposer un dosage</div><div>Envoyer un message ou un compte rendu sans vous</div><div>Enregistrer sans l’accord du patient</div><div>Réutiliser les données pour entraîner un modèle</div><div>Annuler, facturer ou refuser un rendez-vous seul</div></div></section>
      <p class="small muted" style="margin-top:10px">Démonstration : aucune IA n’est appelée. Les résultats sont produits localement à partir des données fictives, pour montrer ce que vous obtiendriez. Les garde-fous sont ceux de la version réelle (voir <a href="#conformite">Conformité</a>).</p>`;
  }
  function bindCatalog(root, S, h) {
    $$('[data-try]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.try;
      if (k === 'pre') { const s = S.submissions[0]; h.dialog(preSummaryHtml(s, h.P(s.patient))); }
      if (k === 'bio') {
        const rows = [['Ferritine', '18', 'µg/L', '30 - 400', 'bas'], ['Fer sérique', '62', 'µg/dL', '59 - 158', ''], ['TSH', '2,9', 'mUI/L', '0,27 - 4,2', ''], ['T3 libre', '2,4', 'pg/mL', '2,0 - 4,4', ''], ['25-OH vitamine D', '17', 'ng/mL', '30 - 100', 'bas'], ['Magnésium érythrocytaire', '1,9', 'mmol/L', '2,1 - 2,7', 'bas'], ['HbA1c', '5,4', '%', '4,0 - 5,6', ''], ['CRP', '1,2', 'mg/L', '< 5', '']];
        h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Prise de sang lue automatiquement</h2>${DEMO}</div><p class="small muted">Fichier : bilan_laboratoire_fictif.pdf · patient fictif · normes du laboratoire.</p>
          <table class="t"><thead><tr><th>Analyse</th><th>Valeur</th><th>Unité</th><th>Norme</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${r[4] ? '<span class="chip retard">Sous la norme</span>' : ''}</td></tr>`).join('')}</tbody></table>
          <p class="small" style="margin-top:12px">3 valeurs sous la norme du laboratoire. À interpréter par la praticienne au deuxième rendez-vous.</p>`);
      }
      if (k === 'scan') h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Questionnaire papier lu</h2>${DEMO}</div><p>Scan de 13 pages reçu par e-mail · lu en quelques secondes.</p><dl class="kv"><dt>Pages lues</dt><dd>13 sur 13</dd><dt>Cases reconnues</dt><dd>412</dd><dt>Réponses incertaines</dt><dd>7, montrées à côté de l’image d’origine</dd><dt>Champs écrits à la main</dt><dd>Transcrits, à vérifier (raisons de la consultation, traitements)</dd></dl><div class="notice small" style="margin-top:12px">Les réponses incertaines restent en attente tant que vous ne les avez pas confirmées.</div>`);
      if (k === 'inbox') {
        const mails = [['Bonjour, je dois déplacer mon rendez-vous du 12, c’est possible ?', 'Rendez-vous à déplacer', 'Réponse proposée : les modifications passent par le secrétariat ou par le lien de votre confirmation. Lien joint.'], ['Faut-il être à jeun pour la prise de sang ?', 'Question pratique', 'Réponse proposée : consignes du laboratoire spécialisé jointes (à jeun 12 heures pour la glycémie et l’insuline).'], ['Voici mes résultats, en pièce jointe.', 'Résultats de biologie', 'Classé au dossier, lecture automatique proposée, deuxième rendez-vous à planifier.'], ['Depuis hier j’ai une douleur dans la poitrine qui ne passe pas.', 'Inquiétude médicale', 'Réponse immédiate : contactez votre médecin ou appelez le 112. Vous êtes prévenue en priorité.'], ['Merci pour la consultation, j’ai une question sur le magnésium.', 'Question de suivi', 'Mis de côté pour votre réponse personnelle.']];
        h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">E-mails triés</h2>${DEMO}</div>${mails.map(m => `<div style="border-bottom:1px solid var(--paper-2);padding:10px 0"><p style="margin:0">« ${esc(m[0])} »</p><p class="small" style="margin:4px 0 0"><span class="chip ${m[1] === 'Inquiétude médicale' ? 'retard' : 'attente'}">${esc(m[1])}</span> ${esc(m[2])}</p></div>`).join('')}`);
      }
      if (k === 'search') {
        h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Chercher dans vos dossiers</h2>${DEMO}</div><div class="field"><label for="ai-q">Votre question</label><input id="ai-q" type="search" value="patients fatigués avec un sommeil perturbé"></div><div id="ai-r"></div>`);
        const run = () => {
          const q = $('#ai-q').value.toLowerCase();
          const map = [['fatig', 'cortisol'], ['sommeil', 'melatonine'], ['réveil', 'melatonine'], ['sucre', 'glucose'], ['digest', 'dysbiose'], ['ballon', 'dysbiose'], ['fer', 'fer'], ['thyro', 'thyroide'], ['stress', 'cortisol'], ['crampe', 'magnesium'], ['peau', 'zinc']];
          const axes = Array.from(new Set(map.filter(([w]) => q.includes(w)).map(x => x[1])));
          const res = S.submissions.map(s => ({ s, prof: E.profile(s.answers, s.sex) })).filter(x => axes.length && axes.every(a => (x.prof.find(p => p.id === a) || {}).score >= 30));
          $('#ai-r').innerHTML = axes.length ? `<p class="small muted">Compris comme : axes ${esc(axes.join(', '))} à 30 ou plus.</p><ul class="list">${res.map(x => `<li><span class="t">${esc(x.s.receivedOn.slice(5))}</span><span><a href="#patient/${esc(x.s.patient)}">${esc(h.name(h.P(x.s.patient)))}</a><small>${esc(axes.map(a => x.prof.find(p => p.id === a).name + ' ' + x.prof.find(p => p.id === a).score).join(' · '))}</small></span><span></span></li>`).join('') || '<li>Aucun dossier ne correspond.</li>'}</ul>` : '<p class="small muted">Essayez avec : fatigue, sommeil, sucre, digestion, fer, thyroïde, stress, crampes, peau.</p>';
          $$('#ai-r a').forEach(l => l.addEventListener('click', () => $('#dlg').close()));
        };
        $('#ai-q').addEventListener('input', run); run();
      }
      if (k === 'doc') { const p = S.patients[1]; h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.2rem">Compte rendu au médecin traitant</h2>${DEMO}</div><div class="mail"><header><span><b>À :</b> ${esc(p.doctor)}</span><span><b>Objet :</b> Consultation de nutrithérapie, ${esc(p.first + ' ' + p.last)}</span></header><pre>${esc(`Chère Consœur, cher Confrère,

J’ai revu ${p.first} ${p.last} pour la lecture de sa biologie (motif : ${p.motif.toLowerCase()}).

Éléments marquants : ferritine basse, vitamine D insuffisante.
Ajustements proposés : alimentation, magnésium le soir, réintroduction des oméga-3.
Suivi prévu dans trois mois.

Bien confraternellement,
Annick Dejonckheere`)}</pre></div><p class="small muted" style="margin-top:8px">Brouillon rédigé à partir du résumé validé. Envoyé seulement après votre relecture et si le patient accepte le partage.</p>`); }
      if (k === 'fiche') h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Fiche conseils</h2>${DEMO}</div><p>Disponible à la fin de chaque consultation résumée : ouvrez le prochain rendez-vous dans l’assistant, terminez l’enregistrement, puis choisissez « Fiche conseils pour le patient ».</p>`);
      if (k === 'trad') h.dialog(`<div class="row" style="justify-content:space-between"><h2 style="font-size:1.3rem">Questionnaire en néerlandais</h2>${DEMO}</div><table class="t"><tbody><tr><td>Besoin de sucre en fin de journée</td><td>Behoefte aan suiker op het einde van de dag</td></tr><tr><td>Réveils fréquents la nuit</td><td>Vaak wakker worden ’s nachts</td></tr><tr><td>Ballonnements</td><td>Opgeblazen gevoel</td></tr><tr><td>Crampes nocturnes</td><td>Nachtelijke krampen</td></tr><tr><td>Peau sèche</td><td>Droge huid</td></tr></tbody></table><p class="small muted" style="margin-top:10px">Le patient choisit sa langue ; vous lisez toujours les réponses en français.</p>`);
    }));
  }

  /* ---------- conformité ---------- */
  function complianceHtml() {
    const block = (t, rows) => `<div class="box"><h2 style="font-size:1.15rem">${t}</h2><ul style="margin:0;padding-left:18px">${rows.map(r => `<li style="margin-bottom:6px">${r}</li>`).join('')}</ul></div>`;
    return `<div class="topline"><div><h1>Conformité</h1><p>Des données de santé et de l’IA : ce qui est prévu, article par article.</p></div></div>
      <div class="notice small">Cette page décrit le cadre de la version réelle. La démonstration ne contient que des données fictives, stockées dans votre navigateur, et n’appelle aucun service extérieur. Ce n’est pas un avis juridique : l’analyse d’impact se réalise avec vous avant la mise en service.</div>
      <div class="grid" style="grid-template-columns:repeat(2,1fr)">
        ${block('Les données et leur base légale (RGPD)', [
          'Données traitées : identité et coordonnées, rendez-vous, réponses au questionnaire, notes, résultats de biologie, enregistrements de consultation. Les données de santé sont une catégorie particulière (<b>art. 9</b>).',
          'Base : une base de l’<b>art. 6</b> (le contrat de soins) <b>et</b> une exception de l’<b>art. 9 §2</b> : le consentement explicite du patient (<b>a</b>) pour le questionnaire et l’enregistrement ; la prise en charge de santé (<b>h</b>) seulement si elle est assurée par un professionnel soumis au secret (<b>art. 9 §3</b>). Le choix se tranche dans l’analyse d’impact.',
          'Information des patients au moment de la collecte (<b>art. 13</b>) : affichée dans le questionnaire et la prise de rendez-vous.',
          'Pas de décision automatisée (<b>art. 22</b>) : les scores et les résumés aident la praticienne, ils ne décident de rien.'])}
        ${block('Analyse d’impact et registre', [
          'Une analyse d’impact relative à la protection des données (<b>art. 35</b>) avant la mise en service, au minimum pour l’enregistrement et le résumé des consultations : données de santé et nouvelle technologie.',
          'Registre des traitements (<b>art. 30</b>) : questionnaire, agenda, e-mails, assistant IA, avec finalité, catégories, destinataires et durées.',
          'Réexamen de l’analyse quand un usage change (<b>art. 35 §11</b>), par exemple l’ajout d’une nouvelle fonction de l’assistant.'])}
        ${block('Prestataires et localisation', [
          'Contrat de sous-traitance (<b>art. 28</b>) avec chaque prestataire : hébergement, envoi d’e-mails, transcription, modèle de langage.',
          'Hébergement et traitement dans l’Union européenne ; aucun transfert hors de l’Union, sinon un mécanisme du <b>chapitre V</b> et une évaluation du pays.',
          'Clause contractuelle : les données des patients ne servent jamais à entraîner les modèles du prestataire.'])}
        ${block('Sécurité (art. 32)', [
          'Chiffrement en transit et au repos, double authentification pour l’espace praticienne, journal des accès.',
          'Pseudonymisation avant tout traitement par l’IA ; l’audio est supprimé dès le résumé validé.',
          'Sauvegardes isolées et testées, mises à jour régulières, comptes nominatifs, révocation immédiate des accès.',
          'Procédure en cas de violation de données : évaluation, notification à l’APD dans les 72 heures si nécessaire (<b>art. 33</b>), information des patients si le risque est élevé (<b>art. 34</b>).'])}
        ${block('Minimisation et conservation', [
          'Seuls les champs utiles à la consultation sont demandés (<b>art. 5 §1 c</b>) ; dans le résumé, ce qui est sans lien avec la consultation est écarté.',
          'Durées de conservation fixées et documentées par catégorie, puis suppression automatique (<b>art. 5 §1 e</b>).',
          'Le questionnaire en cours reste sur l’appareil du patient tant qu’il ne l’envoie pas.'])}
        ${block('Droits des patients', [
          'Accès et copie du dossier (<b>art. 15</b>) : bouton « Exporter le dossier » sur chaque fiche patient.',
          'Rectification (<b>art. 16</b>), effacement (<b>art. 17</b>) dans les limites des obligations de conservation, retrait du consentement à tout moment (<b>art. 7 §3</b>).',
          'Partage avec le médecin traitant uniquement avec l’accord du patient.'])}
        ${block('Enregistrer une consultation', [
          'Information préalable et accord explicite du patient, recueillis et horodatés avant le démarrage ; le bouton reste bloqué sans accord.',
          'Refus possible sans aucune conséquence sur la prise en charge.',
          'Finalité unique : rédiger le résumé. Pas d’écoute par un tiers, pas de réutilisation.'])}
        ${block('SMS, WhatsApp et Instagram', [
          'Logistique uniquement : date, heure, cabinet et un lien. Aucune information de santé, aucun motif de consultation dans le message.',
          'Canal choisi par le patient (accord à la prise de rendez-vous), désinscription par « STOP » ou depuis le lien ; l’e-mail reste toujours disponible.',
          'SMS : prestataire établi dans l’Union, contrat de sous-traitance (<b>art. 28</b>).',
          'WhatsApp Business : Meta est sous-traitant et peut transférer des données hors Union (<b>chap. V</b>) ; à couvrir par le cadre UE-États-Unis (Data Privacy Framework) ou à remplacer par le SMS si le cabinet préfère s’en passer.',
          'Modèles de messages fixes, validés à l’avance : pas de conversation libre sur la santé par messagerie.',
          'Instagram : réponses limitées au lien de prise de rendez-vous et aux informations pratiques ; une question de santé est renvoyée vers la consultation. Les publications ne contiennent aucune donnée de patient et sont validées avant parution.'])}
        ${block('AI Act (règlement (UE) 2024/1689)', [
          'Le cabinet est « déployeur » d’outils d’IA d’usage général, utilisés pour la documentation : transcription, résumé, traduction, tri.',
          'Transparence (<b>art. 50</b>) : les patients savent quand un texte est rédigé avec l’IA et quand ils échangent avec un outil automatisé.',
          'Maîtrise de l’IA (<b>art. 4</b>) : la praticienne et le secrétariat sont formés aux limites des outils.',
          'Contrôle humain systématique : rien n’est envoyé ni classé sans validation.',
          'Limite volontaire : aucun outil ne propose de diagnostic. Un logiciel qui le ferait pourrait relever du règlement sur les dispositifs médicaux (règlement (UE) 2017/745) et des systèmes d’IA à haut risque.'])}
      </div>
      <div class="box" style="margin-top:20px"><h2 style="font-size:1.15rem">Dans la démo, et dans la version réelle</h2>
        <table class="t"><thead><tr><th>Sujet</th><th>Démonstration</th><th>Version réelle</th></tr></thead><tbody>
        <tr><td>Données</td><td>Fictives, dans votre navigateur</td><td>Base chiffrée, hébergée dans l’Union</td></tr>
        <tr><td>E-mails</td><td>Simulés</td><td>Envoyés par un prestataire européen, journalisés</td></tr>
        <tr><td>SMS et WhatsApp</td><td>Simulés, aperçu du message</td><td>Prestataire SMS européen, WhatsApp Business API avec modèles approuvés</td></tr>
        <tr><td>Connexion</td><td>Libre</td><td>Compte nominatif et double authentification</td></tr>
        <tr><td>Assistant IA</td><td>Résultats préparés localement</td><td>Modèles hébergés dans l’Union, sans entraînement sur vos données</td></tr>
        <tr><td>Analyse d’impact</td><td>Non nécessaire (aucune donnée réelle)</td><td>Réalisée avec vous avant la mise en service</td></tr>
        </tbody></table></div>`;
  }

  window.Ai = { preSummary, preSummaryHtml, script, summary, consultHtml, bindConsult, catalogHtml, bindCatalog, complianceHtml };
})();
