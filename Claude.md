# PROJECT_RULES.md

## Projet
SmartPlan Météo

Application web de planification de jobs terrain avec :
- calendrier
- météo
- dictée vocale
- notifications client
- création et report de jobs

## Architecture actuelle
- projet principal en un seul fichier : `index.html`
- HTML + CSS + JS doivent rester intégrés dans ce fichier sauf demande explicite
- Netlify déploie depuis GitHub
- le fichier principal doit toujours être `index.html`

## Contraintes
- ne pas créer un autre fichier principal
- ne pas casser le calendrier
- ne pas casser la création de job
- ne pas casser la dictée vocale
- ne pas casser les imports/exports `.ics`
- garder le style dark moderne
- garder une bonne lisibilité mobile

## Règles UI
- interface plus aérée que condensée
- dates, échéances, lieu, heure : bien lisibles
- éviter boutons trop gros vs texte trop petit
- “Date cédulée” avant “Date limite”
- ne pas afficher “Date préférée”
- un seul champ “Type de travail”

## Dictée vocale
La dictée doit :
- permettre plusieurs passages
- ne jamais effacer le texte existant
- permettre arrêt puis reprise
- ne pas afficher de fausse erreur lors d’un arrêt manuel

## Météo
- le champ lieu doit servir de zone météo
- si aucune API réelle n’est branchée, garder la météo simulée
- ne pas inventer une intégration API sans demande explicite

## Réponse attendue
- changements minimaux
- patch ciblé
- pas de refonte globale sauf demande explicite
