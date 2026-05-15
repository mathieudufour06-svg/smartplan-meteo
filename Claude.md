# PROJECT_RULES.md

## Projet
SmartPlan Météo

Application web de planification de travaux terrain avec :
- calendrier
- météo (Open-Meteo, sans clé API)
- dictée vocale
- notifications client
- création et report de travaux

## Architecture actuelle
- projet principal en un seul fichier : `index.html`
- HTML + CSS + JS doivent rester intégrés dans ce fichier sauf demande explicite
- Netlify déploie automatiquement depuis GitHub (branche `main`)
- le fichier principal doit toujours être `index.html`

## Workflow Git / Netlify
- travailler sur la branche `claude/weather-widget-compact-NzXeM` (branche de travail active)
- accumuler plusieurs commits avant de merger dans main
- créer une PR + merger uniquement quand un lot cohérent est prêt, ou sur validation explicite
- **un merge = un build Netlify** — éviter les merges fréquents pour économiser les crédits
- ne jamais merger commit par commit
- éviter les branches temporaires inutiles

## Priorités produit
1. Fonctionnel : compléter les flows, corriger les bugs réels
2. Mobile iPhone : stabilité, scroll, clavier, performance
3. UI : cohérence, pas de redesign infini
4. Éviter le perfectionnisme UI — passer en polish seulement quand le produit est solide

## Contraintes
- ne pas créer un autre fichier principal
- ne pas casser le calendrier
- ne pas casser la création de travaux
- ne pas casser la dictée vocale
- ne pas casser les imports/exports `.ics`
- garder le style dark premium (glassmorphism)
- garder une bonne lisibilité mobile

## Règles UI
- interface plus aérée que condensée
- dates, échéances, lieu, heure : bien lisibles
- éviter boutons trop gros vs texte trop petit
- “Date cédulée” avant “Date limite”
- ne pas afficher “Date préférée”
- un seul champ “Type de travail”
- changements minimaux — patch ciblé, pas de refonte globale sauf demande

## Dictée vocale
La dictée doit :
- permettre plusieurs passages
- ne jamais effacer le texte existant
- permettre arrêt puis reprise
- ne pas afficher de fausse erreur lors d’un arrêt manuel

## Météo
- API Open-Meteo (gratuite, sans clé)
- fallback mockForecast() si offline
- ne pas inventer une intégration API sans demande explicite
