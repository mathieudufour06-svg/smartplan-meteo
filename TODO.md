# TODO SmartPlan Météo

- [ ] Corriger le parsing vocal du courriel client
- [ ] Corriger le parsing de l’adresse complète
- [ ] Mieux nettoyer le nom du job
- [ ] Corriger le doublon de "Type de travail"
- [ ] Mettre "Date cédulée" avant "Date limite"
- [ ] Revoir la logique de notification SMS / courriel / les deux
- [ ] Refaire la section "Tolérances météo"

## Exemple dicté à supporter
“Abattre arbre chez Germaine Larivière au 132 rue Saint-Louis, Henryville, 514-342-9622, commercial hotmail point com. On peut le texter ou lui écrire un courriel. Puis c’est environ 4-5 heures. J’aimerais faire ça jeudi le 6 octobre 2026.”

## Résultat attendu
- nom du job : Abattre arbre
- client : Germaine Larivière
- lieu : 132 rue Saint-Louis, Henryville
- téléphone : 514-342-9622
- courriel : commercial@hotmail.com
- notification : SMS + Courriel
- durée : 4.5 ou 5
- date cédulée : 2026-10-06
