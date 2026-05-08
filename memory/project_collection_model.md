---
name: Modèle de données collecte — hybride in situ / labo
description: Une collecte est un dossier progressif (in situ immédiat + résultats labo différés), pas un objet atomique
type: project
---

**Fait** : Une "collecte" Mali Coton n'est PAS soumise en un seul coup. C'est un dossier qui agrège progressivement trois flux de données distincts (CDC §7.2 — approche hybride 3 méthodes) :

1. **Saisie tablette terrain** (immédiat) — identification site, déchets solides, santé/SST, socio-éco
2. **Mesures in situ via capteurs portables** (immédiat) — pH, conductivité, T°, turbidité, TDS, PM2.5, PM10, CO2, CO, NOx
3. **Prélèvements + analyses labo agréé** (différé, jours à semaines) — DBO5, DCO, NH4+, NO2-, NO3-, phosphore, MES, métaux lourds (AAS), coloration Pt-Co, COV (PID/tubes adsorbants)

**Why** : J'avais initialement modélisé une `Collection` atomique soumise en une fois → ça aurait masqué tous les indicateurs labo (la majorité des indicateurs §4) ou forcé une saisie fictive. Youma a posé la question, le CDC §7.2 confirme l'approche hybride et §7.6 identifie même "délais labo" comme risque géré par SLA contractuels.

**How to apply** :

- Chaque `Measurement` porte un champ `acquisition: 'in_situ' | 'lab_pending' | 'lab_received'`.
- Pour `lab_pending`/`lab_received`, le champ `sample` contient `{ sampleId, labId, sentAt, expectedBy, receivedAt?, bordereauUrl? }`.
- Les statuts collecte s'étendent : `draft → pending_sync → submitted → awaiting_lab → lab_complete → validated/rejected`.
- Sur le wizard agent terrain, dans les étapes Eaux / Sol / Air, **deux sections distinctes** : "Mesures in situ" (saisie valeur) et "Prélèvements pour labo" (juste sampleId + labo destinataire + photo étiquette + date envoi).
- Page **superviseur** dédiée `/collectes/:id/resultats-labo` pour saisir les bordereaux quand ils reviennent du labo (upload PDF + valeurs + calcul conformité).
- Référentiel `labs` (admin-configurable) avec SLA contractuel par labo → alerte automatique si bordereau en retard.
- Dashboard widget "Bordereaux labo en retard".

**Ne jamais** modéliser une collecte comme un POST unique avec toutes les valeurs renseignées. Les valeurs labo arrivent toujours après.
