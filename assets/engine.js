/* Moteur de la démo : questionnaire, profil fonctionnel, échéances, rappels, e-mails.
   Aucune donnée réelle, aucun réseau. Utilisable dans le navigateur (window.Engine) et dans Node (tests). */
(function (root) {
  'use strict';

  /* Échelle du questionnaire papier d'origine : 0 à 3 */
  const SCALE = ['Non / jamais', 'Peu / modéré', 'Beaucoup / souvent', 'Énormément / toujours'];

  /* Axes du questionnaire, dans l'ordre du document. f = femmes uniquement, m = hommes uniquement. */
  const AXES = [
    { id: 'serotonine', name: 'Sérotonine', group: 'Humeur et sommeil', items: ['Besoin de sucre en fin de journée', 'Difficulté à supporter les contraintes', 'Difficulté d’endormissement', 'Douleurs musculaires', 'Impatience', 'Intolérance à la frustration', 'Nervosité intérieure, irritabilité', 'Sautes d’humeur', 'Compulsions sucrées, alcool'] },
    { id: 'melatonine', name: 'Mélatonine', group: 'Humeur et sommeil', items: ['Diminution ou absence de rêves', 'Difficulté d’endormissement', 'Rumination', 'Sommeil peu profond', 'Troubles du sommeil, réveils fréquents', 'Réveil précoce', 'Visage prématurément vieilli'] },
    { id: 'noradrenaline', name: 'Noradrénaline', group: 'Humeur et sommeil', items: ['Baisse de concentration', 'Difficulté d’apprentissage', 'Baisse de joie de vivre', 'Fatigué(e) moralement', 'Fatigué(e) physiquement', 'Fonctionnement au ralenti', 'Manque de motivation'] },
    { id: 'dopamine', name: 'Dopamine', group: 'Humeur et sommeil', items: ['Baisse de mémoire à long et moyen terme', 'Dépression', 'Perte de mémoire à court terme', 'Baisse de libido', 'Difficulté à prendre du plaisir', 'Souffrance morale'] },
    { id: 'dysbiose', name: 'Dysbiose intestinale', group: 'Digestion', items: ['Ballonnements', 'Gaz intestinaux', 'Crampes abdominales', 'Constipation', 'Diarrhée chronique', 'Diarrhée et constipation en alternance', 'Côlon irritable', 'Envie de sucre', 'Antibiotiques au moins une fois par an', 'Mycoses cutanées ou intestinales', 'Mauvaise haleine', 'Taches d’eczéma sur le corps', 'Fatigue constante', 'Transpiration la nuit', 'Cystites, vaginites', 'Pertes blanches'], female: [14, 15] },
    { id: 'enzymes', name: 'Enzymes digestives', group: 'Digestion', items: ['Éructations (renvois, rots)', 'Boit beaucoup pendant les repas', 'Mange peu à la fois', 'Gastrite', 'Pancréatite', 'Allergies alimentaires'] },
    { id: 'hypochlorhydrie', name: 'Hypochlorhydrie', group: 'Digestion', items: ['Acidité', 'Brûlures digestives', 'Douleurs abdominales', 'Gaz intestinaux inodores', 'Nausées et vomissements', 'Plénitude gastrique après les repas'] },
    { id: 'foie', name: 'Fonction hépatique', group: 'Digestion', items: ['Difficulté à supporter le chocolat', 'Difficulté à supporter les graisses cuites', 'Digestion lente, difficile', 'Hépatite virale dans le passé', 'Insuffisance biliaire', 'Teint jaunâtre'] },
    { id: 'allergie', name: 'Allergie alimentaire', group: 'Digestion', items: ['Aphtes', 'Ballonnements', 'Colite', 'Douleurs articulaires des membres', 'Facilement fatigué(e)', 'Indigestions', 'Maux de tête', 'Selles défaites', 'Taches d’eczéma sur le corps'] },
    { id: 'thyroide', name: 'Thyroïde (hypothyroïdie)', group: 'Hormones', items: ['Fatigué(e) le matin au lever', 'Frileux(se) en général', 'Extrémités froides', 'Yeux bouffis le matin', 'Perte de la partie externe du sourcil (signe de Hertoghe)', 'Peau sèche (tibias, talons)', 'Ongles se dédoublant ou cassants', 'Perte de cheveux', 'Ralentissement du cerveau', 'Constipation', 'Nécessité de café pour se mettre en route', 'Voix rauque'] },
    { id: 'dhea', name: 'DHEA', group: 'Hormones', items: ['Affaiblissement, baisse de vitalité', 'Anxiété', 'Cheveux secs', 'Diminution du désir sexuel', 'Muscles relâchés au ventre', 'Peau sèche', 'Regard terne', 'Vite essoufflé(e) lors d’un effort physique'] },
    { id: 'cortisol', name: 'Cortisol', group: 'Hormones', items: ['Fatigue constante', 'Fatigué(e) debout et mieux couché(e)', 'Vertiges en se levant', 'Hypotension', 'Mauvaise résistance au stress', 'Récupération difficile après un stress', 'Coups de pompe entre 11 h et 16 h', 'Envie de sel', 'Envie de sucre', 'Allergies (ORL, respiratoires, alimentaires)'] },
    { id: 'testosterone', name: 'Testostérone', group: 'Hormones', items: ['Accumulation de graisse au ventre', 'Silhouette molle et peu musclée', 'Diminution de la masse musculaire', 'Force musculaire en diminution', 'Peu sûr(e) de soi', 'Récupération difficile après effort physique', 'Érection affaiblie'], male: [6] },
    { id: 'oestrogenes', name: 'Œstrogènes', group: 'Hormones', women: true, items: ['Bouffées de chaleur', 'Sécheresse oculaire', 'Muqueuse sèche (bouche, vagin)', 'Baisse de mémoire immédiate', 'Peau ridée sur le visage', 'Déprime pendant les règles'] },
    { id: 'progesterone', name: 'Progestérone', group: 'Hormones', items: ['Anxiété, nervosité, irritabilité', 'Impatience', 'Irritabilité avant les règles', 'Seins douloureux avant les règles', 'Règles abondantes ou douloureuses', 'Syndrome prémenstruel'], female: [2, 3, 4, 5] },
    { id: 'croissance', name: 'Hormone de croissance', group: 'Hormones', items: ['Récupération lente après un coucher tardif', 'Récupération difficile après effort physique', 'Peau mince', 'Relâchement de la peau du cou et du menton', 'Muscles des épaules et des fesses moins marqués', 'Sommeil peu profond'] },
    { id: 'glucose', name: 'Régulation du glucose', group: 'Énergie', items: ['Besoin de manger souvent', 'Envie de sucre', 'Fatigue ou somnolence après les repas', 'Tremblements', 'Vertiges ou irritation sans manger depuis 6 heures', 'Besoin de café, thé ou sucré pour démarrer le matin'] },
    { id: 'magnesium', name: 'Magnésium', group: 'Minéraux', items: ['Crampes aux mollets', 'Crampes nocturnes aux mains ou aux pieds', 'Paupière qui saute, spasmes musculaires', 'Boule dans la gorge', 'Caractère explosif', 'Mauvaise résistance au stress', 'Palpitations', 'Sommeil peu profond'] },
    { id: 'acidose', name: 'Acidose', group: 'Minéraux', items: ['Langue chargée, mauvaise haleine', 'Sommeil agité entre 1 h et 3 h', 'Ostéopénie, ostéoporose', 'Douleurs diverses', 'Fatigue matinale', 'Raideurs'] },
    { id: 'zinc', name: 'Zinc', group: 'Minéraux', items: ['Acné, eczéma', 'Difficulté à cicatriser', 'Sujet aux infections', 'Mauvaise vision nocturne', 'Perte du goût et de l’odorat', 'Taches blanches sur les ongles', 'Vergetures'] },
    { id: 'fer', name: 'Fer', group: 'Minéraux', items: ['Affaiblissement, baisse de vitalité', 'Anémie connue', 'Baisse des performances physiques', 'Cheveux et ongles cassants', 'Étourdissements', 'Peau pâle', 'Sang dans les selles'] },
    { id: 'omega3', name: 'Oméga-3', group: 'Acides gras', items: ['Peau sèche', 'Sécheresse oculaire', 'Cheveux secs, pellicules', 'Difficulté à se débarrasser d’une infection', 'Sautes d’humeur', 'Taux de triglycérides élevé'] },
    { id: 'omega6', name: 'Oméga-6', group: 'Acides gras', items: ['Dermite séborrhéique', 'Difficulté à cicatriser', 'Peau sèche, hyperkératose', 'Ongles fins, fragiles', 'Perte de cheveux'] },
  ];

  /* Réponses qui demandent une vérification médicale avant toute interprétation (jamais un diagnostic) */
  const RED_FLAGS = [
    { axis: 'fer', item: 6, min: 1, text: 'Sang dans les selles signalé : à préciser (actuel ou passé) et à signaler au médecin traitant.' },
    { axis: 'magnesium', item: 6, min: 2, text: 'Palpitations fréquentes : à faire évaluer par un médecin. Douleur thoracique ou malaise : appeler le 112.' },
    { axis: 'cortisol', item: 2, min: 3, text: 'Vertiges très fréquents en se levant : vérifier la tension avant la consultation.' },
    { axis: 'fer', item: 1, min: 2, text: 'Anémie cochée : confirmer par une prise de sang (hémoglobine, ferritine), ne pas supposer un diagnostic.' },
  ];

  const DAY = 86400000;
  /* Dates de calendrier en heure locale : « 2026-11-03 » reste le 3 novembre quel que soit le fuseau */
  const day = d => { if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, j] = d.split('-').map(Number); return new Date(y, m - 1, j); } return new Date(d); };
  const pad = n => String(n).padStart(2, '0');
  const iso = d => { const x = day(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
  const addDays = (d, n) => { const x = day(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate() + n); };

  /* Items applicables selon le sexe déclaré */
  function itemsFor(axis, sex) {
    if (axis.women && sex === 'M') return [];
    return axis.items.map((t, i) => ({ t, i })).filter(({ i }) =>
      !(sex === 'M' && axis.female && axis.female.includes(i)) && !(sex === 'F' && axis.male && axis.male.includes(i)));
  }

  /* answers : { 'axe:index': 0..3 }. Retourne un score 0-100 par axe et un niveau lisible. */
  function profile(answers, sex) {
    return AXES.map(axis => {
      const items = itemsFor(axis, sex);
      if (!items.length) return null;
      const vals = items.map(({ i }) => Number(answers[axis.id + ':' + i] || 0));
      const sum = vals.reduce((a, b) => a + b, 0);
      const score = Math.round(sum * 100 / (3 * items.length));
      const top = items.map(({ t, i }, k) => ({ t, v: vals[k] })).filter(x => x.v >= 2).sort((a, b) => b.v - a.v).map(x => x.t);
      return { id: axis.id, name: axis.name, group: axis.group, score, level: level(score), answered: vals.filter(v => v > 0).length, total: items.length, top };
    }).filter(Boolean);
  }
  function level(score) { return score >= 50 ? 'marqué' : score >= 25 ? 'modéré' : 'faible'; }

  /* Axes à aborder en priorité : les trois scores les plus élevés au-dessus de 25 */
  function priorities(prof) { return prof.filter(a => a.score >= 25).sort((a, b) => b.score - a.score).slice(0, 3); }

  function flags(answers) {
    return RED_FLAGS.filter(f => Number(answers[f.axis + ':' + f.item] || 0) >= f.min).map(f => f.text);
  }

  /* Le questionnaire doit arriver au moins un mois avant le rendez-vous (règle du cabinet) */
  function dueDate(appointmentDate) { return iso(addDays(appointmentDate, -30)); }

  /* Rappels automatiques : envoi, rappel J-37, dernier rappel J-32, alerte praticienne J-30 */
  function reminderPlan(appointmentDate, bookedOn) {
    const a = day(appointmentDate);
    const steps = [
      { key: 'envoi', label: 'Envoi du questionnaire et des infos pratiques', at: iso(bookedOn || addDays(a, -45)) },
      { key: 'rappel1', label: 'Rappel : questionnaire à renvoyer avant le ' + fmt(dueDate(a)), at: iso(addDays(a, -37)) },
      { key: 'rappel2', label: 'Dernier rappel, sans quoi le rendez-vous peut être annulé', at: iso(addDays(a, -32)) },
      { key: 'alerte', label: 'Alerte au cabinet : questionnaire toujours manquant', at: iso(addDays(a, -30)) },
      { key: 'veille', label: 'Rappel la veille : carte d’identité et 2 vignettes de mutuelle', at: iso(addDays(a, -1)) },
    ];
    return steps.filter(s => !bookedOn || s.at >= iso(bookedOn) || s.key === 'envoi');
  }

  /* Statut du questionnaire pour un rendez-vous donné, à la date « today » */
  function questionnaireStatus(appointmentDate, receivedOn, today) {
    if (receivedOn) return { key: 'recu', label: 'Reçu le ' + fmt(receivedOn) };
    const due = dueDate(appointmentDate), t = iso(today || Date.now());
    const left = Math.round((day(due) - day(t)) / DAY);
    if (left < 0) return { key: 'retard', label: 'En retard de ' + (-left) + ' j', left };
    if (left <= 7) return { key: 'bientot', label: 'À recevoir dans ' + left + ' j', left };
    return { key: 'attente', label: 'Attendu avant le ' + fmt(due), left };
  }

  /* Règle du cabinet : pas de consultation la troisième semaine du mois (jours 15 à 21) */
  function isConsultationDay(date) {
    const d = day(date), wd = d.getDay(), dm = d.getDate();
    return wd >= 1 && wd <= 5 && !(dm >= 15 && dm <= 21);
  }

  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function fmt(d, withDay) {
    const x = day(d);
    return (withDay ? DAYS[x.getDay()] + ' ' : '') + x.getDate() + ' ' + MONTHS[x.getMonth()] + ' ' + x.getFullYear();
  }

  /* Modèles d'e-mails : {prenom}, {date}, {heure}, {lieu}, {echeance}, {lien} */
  const TEMPLATES = {
    confirmation: { name: 'Confirmation du rendez-vous', subject: 'Votre rendez-vous du {date}', body: 'Bonjour {prenom},\n\nVotre rendez-vous est confirmé le {date} à {heure}, {lieu}.\n\nAvant de venir, merci de remplir votre questionnaire en ligne, au plus tard le {echeance} : {lien}\nVos réponses sont enregistrées au fur et à mesure, vous pouvez le compléter en plusieurs fois.\n\nÀ apporter : votre carte d’identité et 2 vignettes de mutuelle.\n\nAnnick Dejonckheere' },
    rappel1: { name: 'Rappel du questionnaire', subject: 'Votre questionnaire, à renvoyer avant le {echeance}', body: 'Bonjour {prenom},\n\nVotre questionnaire n’est pas encore complet. Il permet de préparer votre consultation du {date}.\nMerci de le terminer avant le {echeance} : {lien}\n\nAnnick Dejonckheere' },
    rappel2: { name: 'Dernier rappel', subject: 'Dernier rappel : votre questionnaire', body: 'Bonjour {prenom},\n\nSans votre questionnaire d’ici le {echeance}, le rendez-vous du {date} pourrait être annulé.\nVous pouvez le terminer ici : {lien}\n\nAnnick Dejonckheere' },
    veille: { name: 'Rappel de la veille', subject: 'Demain, {heure} : votre consultation', body: 'Bonjour {prenom},\n\nÀ demain, {heure}, {lieu}.\nPensez à votre carte d’identité, à 2 vignettes de mutuelle et à votre dernière prise de sang.\n\nPour annuler ou déplacer : appelez le secrétariat. Un rendez-vous non annulé est facturé.\n\nAnnick Dejonckheere' },
    biologie: { name: 'Demande de biologie', subject: 'Votre demande de prise de sang', body: 'Bonjour {prenom},\n\nVous trouverez ci-joint la demande de biologie remise en consultation. La prise de sang se fait uniquement dans un laboratoire spécialisé.\nLes résultats nous parviennent directement ; nous les analyserons ensemble lors du deuxième rendez-vous.\n\nAnnick Dejonckheere' },
    medecin: { name: 'Compte rendu au médecin traitant', subject: 'Compte rendu de consultation, {patient}', body: 'Chère Consœur, cher Confrère,\n\nJ’ai reçu {patient} en consultation de nutrithérapie le {date}.\nVous trouverez ci-joint la synthèse et les recommandations proposées.\n\nBien confraternellement,\nAnnick Dejonckheere' },
  };
  /* Versions courtes pour SMS et WhatsApp : uniquement la logistique, jamais d'information de santé */
  const SHORT = {
    confirmation: 'Cabinet A. Dejonckheere : rendez-vous confirmé le {date} à {heure}, {lieuCourt}. Questionnaire à remplir avant le {echeance} : {lien}',
    rappel1: 'Cabinet A. Dejonckheere : votre questionnaire est à renvoyer avant le {echeance}. {lien}',
    rappel2: 'Cabinet A. Dejonckheere : dernier rappel, sans questionnaire avant le {echeance} le rendez-vous du {date} peut être annulé. {lien}',
    veille: 'Cabinet A. Dejonckheere : demain {heure}, {lieuCourt}. Carte d’identité et 2 vignettes de mutuelle. Pour annuler : le secrétariat.',
    biologie: 'Cabinet A. Dejonckheere : votre demande de prise de sang vous a été envoyée par e-mail.',
    medecin: '',
  };
  const CHANNELS = { email: 'E-mail', sms: 'SMS', whatsapp: 'WhatsApp' };
  function render(tpl, vars, channel) {
    const t = TEMPLATES[tpl];
    const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    if (channel && channel !== 'email' && SHORT[tpl]) return { subject: '', body: fill(SHORT[tpl]) };
    return { subject: fill(t.subject), body: fill(t.body) };
  }

  const Engine = { SCALE, AXES, RED_FLAGS, TEMPLATES, SHORT, CHANNELS, itemsFor, profile, priorities, flags, dueDate, reminderPlan, questionnaireStatus, isConsultationDay, fmt, iso, addDays, day, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
