# Démonstration : cabinet d’Annick Dejonckheere

Maquette fonctionnelle préparée par Mohamad HAJI pour montrer ce qui peut être automatisé dans un
cabinet de nutrithérapie : site, prise de rendez-vous, questionnaire en ligne, rappels par e-mail,
SMS ou WhatsApp, espace praticienne, statistiques, assistant de consultation et conformité.

**Site non officiel, non indexé.** Toutes les données sont fictives, générées dans le navigateur et
stockées en `localStorage`. Aucun envoi, aucun appel à un service extérieur. Les questionnaires
reprennent la structure des documents du cabinet, aucune réponse réelle.

## Pages

| Page | Contenu |
|---|---|
| `index.html` | Site vitrine, carnet « surlignez ce qui vous parle » |
| `rendez-vous.html` | Prise de rendez-vous avec les règles du cabinet |
| `questionnaire.html` | Questionnaire en 9 étapes, brouillon local |
| `espace.html` | Espace praticienne : tableau de bord, agenda, patients, messages, statistiques, automatisations, assistant IA, conformité |
| `pourquoi.html` | Avant / après, processus par processus |

## Lancer et tester

```powershell
npx serve .        # ou n'importe quel serveur statique
npm test           # tests du moteur (node --test)
```

Le déploiement passe uniquement par `.github/workflows/pages.yml` (tests, puis GitHub Pages).

## Polices

Bricolage Grotesque et Atkinson Hyperlegible Next, sous licence SIL Open Font License 1.1,
servies localement depuis `assets/fonts/`.
