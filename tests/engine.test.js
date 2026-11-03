/* Tests du moteur : npm test (ou node --test) */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/engine.js');

test('le questionnaire est attendu 30 jours avant le rendez-vous', () => {
  assert.equal(E.dueDate('2026-12-10'), '2026-11-10');
});

test('statut du questionnaire : reçu, en retard, bientôt, en attente', () => {
  assert.equal(E.questionnaireStatus('2026-12-10', '2026-11-01', '2026-11-03').key, 'recu');
  assert.equal(E.questionnaireStatus('2026-12-01', null, '2026-11-03').key, 'retard');
  assert.equal(E.questionnaireStatus('2026-12-08', null, '2026-11-03').key, 'bientot');
  assert.equal(E.questionnaireStatus('2027-01-20', null, '2026-11-03').key, 'attente');
});

test('rappels à J-37, J-32, alerte à J-30 et veille', () => {
  const plan = E.reminderPlan('2026-12-20', new Date('2026-11-01'));
  const at = Object.fromEntries(plan.map(s => [s.key, s.at]));
  assert.equal(at.rappel1, '2026-11-13');
  assert.equal(at.rappel2, '2026-11-18');
  assert.equal(at.alerte, '2026-11-20');
  assert.equal(at.veille, '2026-12-19');
});

test('pas de consultation le week-end ni la troisième semaine', () => {
  assert.equal(E.isConsultationDay('2026-11-04'), true);  // mercredi
  assert.equal(E.isConsultationDay('2026-11-07'), false); // samedi
  assert.equal(E.isConsultationDay('2026-11-17'), false); // mardi, 3e semaine
});

test('score par axe de 0 à 100 et priorités', () => {
  const ax = E.AXES.find(a => a.id === 'magnesium');
  const answers = {};
  E.itemsFor(ax, 'F').forEach(({ i }) => { answers['magnesium:' + i] = 3; });
  const prof = E.profile(answers, 'F').filter(Boolean);
  assert.equal(prof.find(a => a.id === 'magnesium').score, 100);
  assert.equal(E.priorities(prof)[0].id, 'magnesium');
  assert.equal(E.profile({}, 'F').filter(Boolean).every(a => a.score === 0), true);
});

test('les axes réservés aux femmes disparaissent pour un homme', () => {
  const women = E.AXES.filter(a => a.women);
  assert.ok(women.length > 0);
  women.forEach(a => assert.equal(E.itemsFor(a, 'M').length, 0));
});

test('points de vigilance détectés à partir des réponses', () => {
  assert.equal(E.flags({}).length, 0);
  assert.equal(E.flags({ 'fer:6': 1 }).length, 1);
});

test('SMS et WhatsApp : message court, sans information de santé', () => {
  const vars = { date: 'jeudi 10 décembre', heure: '10 h 30', lieuCourt: 'Anderlecht', echeance: '10 novembre 2026', lien: 'x' };
  const sms = E.render('confirmation', vars, 'sms');
  assert.equal(sms.subject, '');
  assert.ok(sms.body.length < 200);
  assert.ok(!/\{\w+\}/.test(sms.body));
  const mail = E.render('confirmation', vars, 'email');
  assert.ok(mail.subject.length > 0);
});

test('les dates restent des jours de calendrier locaux (pas de décalage UTC)', () => {
  assert.equal(E.iso(new Date(2026, 10, 3)), '2026-11-03');
  assert.equal(E.iso(E.addDays('2026-03-28', 2)), '2026-03-30'); // passage à l'heure d'été
  assert.equal(E.fmt('2026-11-03', true), 'mardi 3 novembre 2026');
});
