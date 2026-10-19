# Groupe CKL — vue groupe + présentation : journal des tours

Cible (utilisateur, 2026-10-15) : 8,5/10 sur tous les points ; boucle de notateurs frais.

## Tour 1 — audit complet, vue groupe (2026-10-15 21:06)
- Cible : build de prod figé (~/ominin-groupe-work/build, :5210), captures shots/r1.
- Snapshot code : 2a6c43add73e76cf1cda20555bf29500b20e415c (+ fichiers non suivis : lib/demo/groupe/*, components/demo/groupe/*, app/menu/demo/groupe/*, components/demo/use-sim-clock.ts).
- Agents : notateur « propriétaire », notateur « designer dashboard », relecteur ingénierie.
- Contraintes envoyées : briefs/constraints-groupe.txt (Laissac absent, démo simulée, FR).
- Présentation : en construction (agent dédié), pas encore notée.
- Scores tour 1 : propriétaire 7,5 ; designer 6 (plafonné : « Service terminé » avant l'ouverture ; 7 sinon) ; ingénierie 7.
- Rapports : scratch-owner-r1, scratch-designer-r1, scratch-eng-r1 (et messages de fin d'agent).
- Retenu (tous) : courbes cumulées + estimation de fermeture ; palette (Victoria bleu #5aa9ff, rouge réservé au retard, ligne groupe neutre, vert provisoire Laissac #3fc79b, validée CVD toutes paires) ; HH Café des Arts 16h–23h (site du groupe) ; service mesuré du ticket au service + délais recalés ; vocabulaire (Additions ouvertes / à payer au comptoir) ; alertes détaillées ; états avant ouverture et hors service ; TTC ; mobile replié ; dialogues natifs ; accessibilité graphique ; produits par id ; cache borné ; calcul de la période côté serveur ; horloge qui passe au jour suivant ; constantes dans la fixture.
- Décliné : mode « mur » 1920 sans défilement (coût élevé, à revoir si les notes le demandent encore).

## Tour 2 — audit complet, vue groupe (2026-10-15 ~22:40)
- Corrections du tour 1 appliquées (voir liste plus haut) + Brasserie Laissac ajoutée (copie temporaire du bloc registre de ~/ominin-laissac, patch laissac-menu-data.patch ; à remplacer par la branche brasserie-laissac au moment de livrer).
- Instant vitrine : samedi 2026-10-10 19:40 (référence) ; seuils : retard boissons 10 min, plats 25 min, comptoir 7 min.
- Snapshot code : fb3a9b961d91e4172ebabf7952e1a41bef9b598d ; build :5210 ; captures shots/r2.
- Agents : notateur propriétaire, notateur designer (frais), ingénierie (diff complet).

## Présentation — tour 1, audit complet (2026-10-15 ~23:00)
- 12 diapositives (/groupe-ckl/presentation, dev :5200), PDF 12 pages ; captures deck/r0 (s01–s12 état final, phone-*, present-*).
- Agents : lecteur propriétaire, designer présentation + mouvement, auditeur des faits, ingénierie (code de la présentation).
- Scores tour 2 : propriétaire 8 ; designer 7,5 (matin incohérent, % sur petites bases, HH Laissac non dit) ; ingénierie 8 (CSS [data-reveal] fuit vers Cyprien, ?jour → 500, diviseur d'étalonnage).
- Vérité produit (lib/gestion/api.ts createStaffOrder + trigger sync_order_tickets) : une commande saisie par l'équipe attend son encaissement et part en cuisine une fois payée ; « Payer au comptoir » = un serveur vient à la table avec le terminal (mémoire boho-table-payment-flow). Le modèle « addition réglée au départ » est retiré : « Additions ouvertes » devient « À encaisser ».
- Tour 3 (corrections) : simulation (encaissement avant ticket pour tous, statut paiement en ligne, étalonnage par arrivée sur 4 000 tables une fois par processus, cache LRU, après-midi + paliers happy hour, équipe recalibrée, goûter l'après-midi, cuisine fermée → bar), alertes métier (retard sur S−1), seuil de comparaison, estimation arrondie, mise en page (fil à droite des cartes, Encaissé double), dialogue Hypothèses en liste, CSS scopé, ?jour validé.
