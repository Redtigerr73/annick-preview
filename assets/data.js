/* Données fictives de la démo, générées autour de la date du jour pour que l'agenda reste vivant.
   Noms, adresses et réponses sont inventés. Tout est stocké dans le navigateur (localStorage). */
(function (root) {
  'use strict';
  const E = root.Engine;
  const KEY = 'annick-demo-v1';

  /* Générateur pseudo-aléatoire déterministe : la démo est la même à chaque remise à zéro */
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  const LIEUX = [
    { id: 'anderlecht', name: 'Cabinet du Dr Résimont', short: 'Anderlecht', address: 'Avenue des Crocus 11, 1070 Bruxelles' },
    { id: 'forest', name: 'Cabinet de Forest', short: 'Forest', address: 'Rue de Liège 43, 1190 Bruxelles' },
  ];
  const TYPES = {
    rdv1: { name: 'Première consultation', short: 'RDV 1', minutes: 90, desc: 'Anamnèse détaillée, recherche des causes, demande de biologie' },
    rdv2: { name: 'Analyse de la biologie', short: 'RDV 2', minutes: 60, desc: 'Lecture des résultats, ajustement du traitement' },
    suivi: { name: 'Consultation de suivi', short: 'Suivi', minutes: 45, desc: 'Point d’étape, ajustements' },
  };

  const PEOPLE = [
    ['Claire', 'Vandenbroucke', 'F', 46, 'Fatigue persistante depuis un an, réveils nocturnes'], ['Marc', 'Peeters', 'M', 52, 'Ballonnements, reflux, prise de poids au ventre'],
    ['Nadia', 'El Amrani', 'F', 38, 'Troubles digestifs et migraines'], ['Julie', 'Dubois', 'F', 41, 'Syndrome prémenstruel, irritabilité'],
    ['Thomas', 'Janssens', 'M', 35, 'Fatigue après les repas, envies de sucre'], ['Inès', 'Martin', 'F', 29, 'Acné, eczéma, digestion difficile'],
    ['Pierre', 'Lemaire', 'M', 61, 'Récupération lente après l’effort, sommeil léger'], ['Sarah', 'Cohen', 'F', 44, 'Perte de cheveux, ongles cassants, frilosité'],
    ['Lucas', 'Wouters', 'M', 27, 'Anxiété, difficulté de concentration'], ['Emma', 'Claes', 'F', 33, 'Côlon irritable, alternance diarrhée et constipation'],
    ['Karim', 'Benali', 'M', 48, 'Hypertension, crampes nocturnes'], ['Anne-Sophie', 'Delvaux', 'F', 55, 'Bouffées de chaleur, sommeil perturbé'],
    ['Hélène', 'Gilson', 'F', 63, 'Douleurs articulaires, raideurs le matin'], ['Youssef', 'Haddad', 'M', 42, 'Stress chronique, coups de pompe en journée'],
    ['Camille', 'Lambert', 'F', 36, 'Fatigue, peau sèche, infections à répétition'], ['Bruno', 'Verhaegen', 'M', 58, 'Cholestérol, digestion lente'],
    ['Léa', 'Mertens', 'F', 24, 'Règles douloureuses, fatigue'], ['Olivier', 'Simon', 'M', 39, 'Ballonnements, envies de sel, vertiges en se levant'],
    ['Sophie', 'Renard', 'F', 50, 'Prise de poids, moral en baisse'], ['David', 'Michaux', 'M', 45, 'Sommeil non réparateur, ruminations'],
  ];
  const REFERRERS = ['Médecin traitant', 'Spécialiste', 'Famille', 'Ami ou connaissance', 'Instagram', 'Facebook'];
  const CITIES = [['1050', 'Ixelles'], ['1180', 'Uccle'], ['1070', 'Anderlecht'], ['1190', 'Forest'], ['1200', 'Woluwe-Saint-Lambert'], ['1300', 'Wavre'], ['1410', 'Waterloo'], ['1030', 'Schaerbeek']];
  const HOURS = ['09:00', '10:30', '13:30', '15:00', '16:30'];

  /* Réponses plausibles : quelques axes marqués selon le motif, le reste faible */
  function answersFor(r, motif, sex) {
    const lean = {
      fatigue: ['cortisol', 'thyroide', 'fer', 'melatonine'], digest: ['dysbiose', 'enzymes', 'hypochlorhydrie', 'foie'], sommeil: ['melatonine', 'serotonine', 'magnesium'],
      hormone: ['progesterone', 'oestrogenes', 'dhea'], sucre: ['glucose', 'serotonine', 'cortisol'], peau: ['zinc', 'omega6', 'omega3', 'dysbiose'], stress: ['cortisol', 'magnesium', 'noradrenaline'],
    };
    const m = motif.toLowerCase(), hot = new Set();
    if (/fatigue|pompe|récup/.test(m)) lean.fatigue.forEach(a => hot.add(a));
    if (/digest|ballon|côlon|reflux|diarr/.test(m)) lean.digest.forEach(a => hot.add(a));
    if (/sommeil|réveil|rumin/.test(m)) lean.sommeil.forEach(a => hot.add(a));
    if (/règles|prémens|chaleur/.test(m)) lean.hormone.forEach(a => hot.add(a));
    if (/sucre|poids/.test(m)) lean.sucre.forEach(a => hot.add(a));
    if (/acné|eczéma|peau|cheveux|ongles/.test(m)) lean.peau.forEach(a => hot.add(a));
    if (/stress|anxiété|crampes|concentration/.test(m)) lean.stress.forEach(a => hot.add(a));
    const ans = {};
    E.AXES.forEach(axis => E.itemsFor(axis, sex).forEach(({ i }) => {
      const x = r();
      ans[axis.id + ':' + i] = hot.has(axis.id) ? (x < .15 ? 0 : x < .45 ? 1 : x < .8 ? 2 : 3) : (x < .62 ? 0 : x < .9 ? 1 : 2);
    }));
    return ans;
  }

  function slotDays(r, from, to) {
    const out = [];
    for (let d = new Date(from); d <= to; d = E.addDays(d, 1)) if (E.isConsultationDay(d)) out.push(E.iso(d));
    return out;
  }

  function build() {
    const r = rng(20261104);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = slotDays(r, E.addDays(today, -70), E.addDays(today, 60));
    const taken = new Set();
    const pick = (fromIdx, toIdx) => {
      for (let n = 0; n < 50; n++) {
        const d = days[Math.max(0, Math.min(days.length - 1, Math.floor(fromIdx + r() * (toIdx - fromIdx))))];
        const h = HOURS[Math.floor(r() * HOURS.length)], k = d + ' ' + h;
        if (!taken.has(k)) { taken.add(k); return { date: d, time: h }; }
      }
      return { date: days[toIdx] || days[days.length - 1], time: '17:30' };
    };
    const todayIdx = days.findIndex(d => d >= E.iso(today));
    const patients = [], appointments = [], submissions = [], notes = {};

    PEOPLE.forEach(([first, last, sex, age, motif], n) => {
      const id = 'p' + (n + 1);
      const city = CITIES[Math.floor(r() * CITIES.length)];
      const lieu = LIEUX[n % 3 === 2 ? 1 : 0].id;
      patients.push({
        id, first, last, sex, age, motif, lieu,
        email: (first + '.' + last).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z.]/g, '') + '@exemple.be',
        phone: '04' + (70 + n) + ' ' + String(100000 + Math.floor(r() * 899999)).replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3'),
        zip: city[0], city: city[1], referrer: REFERRERS[Math.floor(r() * REFERRERS.length)],
        doctor: ['Dr Lefèvre (médecin généraliste)', 'Dr Van Damme (gastro-entérologue)', 'Dr Hermans (gynécologue)', 'Dr Collard (médecin généraliste)'][n % 4],
        since: E.iso(E.addDays(today, -60 - Math.floor(r() * 400))),
        channel: ['email', 'sms', 'whatsapp', 'sms'][n % 4], /* canal préféré pour les rappels (accord du patient) */
      });
      /* Parcours : certains ont déjà eu RDV1 (et RDV2), d'autres attendent leur premier rendez-vous */
      const stage = n % 4; // 0 : à venir RDV1 ; 1 : RDV1 passé, RDV2 à venir ; 2 : RDV1 et RDV2 passés, suivi à venir ; 3 : RDV1 bientôt
      const add = (type, slot, status) => appointments.push({ id: 'a' + (appointments.length + 1), patient: id, type, lieu, date: slot.date, time: slot.time, status, bookedOn: E.iso(E.addDays(slot.date, -50)) });
      if (stage === 0) add('rdv1', pick(n % 8 === 0 ? todayIdx + 8 : todayIdx + 26, days.length - 1), 'prevu');
      if (stage === 3) add('rdv1', pick(todayIdx, todayIdx + 6), 'prevu');
      /* stage 1 : biologie en attente (n % 8 === 1) ou RDV 2 replanifié après une absence (n % 8 === 5) ; stage 2 : en suivi */
      if (stage === 1 && n % 8 === 1) add('rdv1', pick(todayIdx - 34, todayIdx - 6), 'fait');
      if (stage === 1 && n % 8 === 5) { add('rdv1', pick(2, todayIdx - 30), 'fait'); add('rdv2', pick(todayIdx - 16, todayIdx - 3), 'absent'); add('rdv2', pick(todayIdx + 1, todayIdx + 20), 'prevu'); }
      if (stage === 2) { add('rdv1', pick(2, todayIdx - 30), 'fait'); add('rdv2', pick(todayIdx - 18, todayIdx - 2), 'fait'); add('suivi', pick(todayIdx + 3, days.length - 1), 'prevu'); }
      /* Questionnaires : reçus pour les parcours entamés, une partie manquante pour les RDV1 à venir */
      const first1 = appointments.filter(a => a.patient === id && a.type === 'rdv1')[0];
      const received = stage === 1 || stage === 2 || (stage === 0 && n % 8 === 0) || (stage === 3 && n % 8 === 3);
      if (received) {
        const recvOn = E.iso(E.addDays(first1.date, -(31 + Math.floor(r() * 12))));
        const answers = answersFor(r, motif, sex);
        /* Points de vigilance réalistes : seuls quelques dossiers en ont */
        if (n % 5 !== 2) E.RED_FLAGS.forEach(f => { answers[f.axis + ':' + f.item] = 0; });
        submissions.push({ id: 'q' + (submissions.length + 1), patient: id, appointment: first1.id, receivedOn: recvOn <= E.iso(today) ? recvOn : E.iso(today), sex, answers, cortisol: [], source: 'en ligne' });
      }
      if (stage === 2) notes[id] = 'Biologie reçue. Carence en vitamine D et ferritine basse. Ajustement : magnésium bisglycinate le soir, réintroduction progressive des oméga-3.';
      if (stage === 1) notes[id] = 'RDV 1 fait. Biologie demandée (bilan complet, labo spécialisé). En attente des résultats.';
    });

    /* Journal des e-mails : ce qui est parti (date passée) et ce qui partira tout seul */
    const emails = [];
    appointments.filter(a => a.status === 'prevu' || (a.type === 'rdv1' && a.status === 'fait')).forEach(a => {
      const p = patients.find(x => x.id === a.patient);
      const got = submissions.find(s => s.appointment === a.id);
      E.reminderPlan(a.date, a.bookedOn).forEach(step => {
        if ((step.key === 'rappel1' || step.key === 'rappel2') && (a.type !== 'rdv1' || (got && got.receivedOn <= step.at))) return;
        if (step.key === 'alerte') return;
        const tpl = step.key === 'envoi' ? 'confirmation' : step.key;
        const status = step.at <= E.iso(today) ? 'envoye' : 'planifie';
        const channel = tpl === 'confirmation' ? 'email' : p.channel;
        emails.push({ id: 'm' + (emails.length + 1), patient: p.id, appointment: a.id, template: tpl, at: step.at, status, channel });
        if (tpl === 'confirmation' && p.channel !== 'email') emails.push({ id: 'm' + (emails.length + 1), patient: p.id, appointment: a.id, template: tpl, at: step.at, status, channel: p.channel });
      });
      if (a.type === 'rdv1' && a.status === 'fait') emails.push({ id: 'm' + (emails.length + 1), patient: p.id, appointment: a.id, template: 'biologie', at: E.iso(E.addDays(a.date, 0)), status: 'envoye' });
      if (a.type === 'rdv2' && a.status === 'fait') emails.push({ id: 'm' + (emails.length + 1), patient: p.id, appointment: a.id, template: 'medecin', at: E.iso(E.addDays(a.date, 2)), status: 'envoye' });
    });
    emails.sort((x, y) => (x.at < y.at ? 1 : -1));

    return {
      version: 2, builtOn: E.iso(today), lieux: LIEUX, types: TYPES, patients, appointments, submissions, emails, notes,
      channels: { email: true, sms: true, whatsapp: true },
      automations: { confirmation: true, rappel1: true, rappel2: true, alerte: true, veille: true, biologie: true, medecin: true, hormonologie: true },
    };
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.version === 2 && s.builtOn === E.iso(new Date().setHours(0, 0, 0, 0))) return s;
      if (s && s.version) { const fresh = build(); fresh.extra = s.extra || { patients: [], appointments: [], submissions: [], emails: [] }; return merge(fresh); }
    } catch (e) { /* stockage indisponible : on repart d'une démo neuve */ }
    const fresh = build(); fresh.extra = { patients: [], appointments: [], submissions: [], emails: [] };
    return fresh;
  }
  /* Ce que le visiteur a créé lui-même (prise de rendez-vous, questionnaire) est conservé d'un jour à l'autre */
  function merge(s) {
    ['patients', 'appointments', 'submissions', 'emails'].forEach(k => { s[k] = s[k].concat(s.extra[k] || []); });
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* mode privé */ } }
  function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem('annick-questionnaire-brouillon'); } catch (e) { /* rien */ } }

  /* Ajout depuis le site public : gardé dans « extra » pour survivre à la régénération quotidienne */
  function addExtra(s, kind, obj) { s[kind].push(obj); s.extra = s.extra || { patients: [], appointments: [], submissions: [], emails: [] }; s.extra[kind].push(obj); save(s); return obj; }

  root.Demo = { KEY, LIEUX, TYPES, build, load: () => { const s = load(); if (!s.extra) s.extra = { patients: [], appointments: [], submissions: [], emails: [] }; if (!localStorage.getItem(KEY)) save(s); return s; }, save, reset, addExtra };
})(typeof window !== 'undefined' ? window : globalThis);
