import type { Recommandation } from '@/features/recommandations/api/recommandations.types';

const MS_DAY = 86_400_000;
function daysAgo(d: number): string {
  return new Date(Date.now() - d * MS_DAY).toISOString();
}
function daysFromNow(d: number): string {
  return new Date(Date.now() + d * MS_DAY).toISOString();
}

/**
 * Recommandations mockées — exemples réalistes liés aux sites et collectes
 * pilotes (cf. CAHIER_PROJET §3.4 Recommandation).
 */
export const mockRecommandations: Recommandation[] = [
  {
    id: 'reco-001',
    titre: 'Mettre en place un système de neutralisation du pH avant rejet',
    description:
      'Le pH des effluents est chroniquement au-delà du seuil (mesures à 11,25 en mai 2026). Installer une cuve de neutralisation à l\'acide faible avant le caniveau de rejet. Coût estimé : 850 000 FCFA. Impact attendu : ramener le pH dans la plage 6,5–8,5.',
    niveauPriorite: 'critique',
    statut: 'en_cours',
    siteId: 'site-dianeguela',
    responsableSuivi: 'Moussa Coulibaly',
    dateEcheance: daysFromNow(45),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(3),
    createdBy: 'u-sup-1',
    notifications: [
      {
        id: 'rn-001-c-mail',
        channel: 'email',
        recipient: 'superviseur@sahel.com',
        recipientName: 'Moussa Coulibaly',
        kind: 'created',
        sentAt: daysAgo(14),
        ref: 'msg-reco001@plateforme.pnud.org',
      },
      {
        id: 'rn-001-c-sms',
        channel: 'sms',
        recipient: '+22376554477',
        recipientName: 'Moussa Coulibaly',
        kind: 'created',
        sentAt: daysAgo(14),
        ref: 'SMS-RECO01',
      },
      {
        id: 'rn-001-s-mail',
        channel: 'email',
        recipient: 'superviseur@sahel.com',
        recipientName: 'Moussa Coulibaly',
        kind: 'status_changed',
        statutSnapshot: 'en_cours',
        sentAt: daysAgo(3),
        ref: 'msg-reco001-s@plateforme.pnud.org',
      },
    ],
  },
  {
    id: 'reco-002',
    titre: 'Doter les teinturières d\'EPI complets (gants, tabliers, masques)',
    description:
      'Le taux d\'utilisation d\'EPI observé est de 30 % (norme : 80 %). Risque d\'affections dermatologiques documenté. Achat groupé recommandé, partenariat possible avec FENATEPAM.',
    niveauPriorite: 'haute',
    statut: 'proposee',
    siteId: 'site-galanimassiriw',
    responsableSuivi: 'Aminata Konaté',
    dateEcheance: daysFromNow(30),
    createdAt: daysAgo(7),
    createdBy: 'u-sup-1',
  },
  {
    id: 'reco-003',
    titre: 'Vérifier la calibration du pH-mètre portable',
    description:
      'Plusieurs mesures de pH récentes paraissent en limite haute de validité. Demander à l\'agent de re-calibrer son appareil avec les solutions tampon avant la prochaine tournée.',
    niveauPriorite: 'moyenne',
    statut: 'suivie',
    collectionId: 'col-0001',
    resultatIndicatorId: 'water.ph',
    responsableSuivi: 'Aïcha Touré',
    dateEcheance: daysFromNow(7),
    createdAt: daysAgo(2),
    createdBy: 'u-sup-1',
  },
  {
    id: 'reco-004',
    titre: 'Implanter une fosse compostière pour les boues solides',
    description:
      'NDOMO est un modèle de référence avec sa fosse compostière. Étudier la faisabilité d\'une démarche similaire à DJIGUIYASO (terrain disponible, INDIGO à faible toxicité).',
    niveauPriorite: 'basse',
    statut: 'proposee',
    siteId: 'site-djiguiyaso',
    responsableSuivi: 'Mariam Doumbia',
    dateEcheance: daysFromNow(90),
    createdAt: daysAgo(21),
    createdBy: 'u-admin-1',
  },
  {
    id: 'reco-005',
    titre: 'Documenter la consommation hebdomadaire de sulfure de sodium',
    description:
      'Données manquantes pour le calcul du score environnemental. Mettre en place un registre simple à remplir chaque samedi par le responsable d\'atelier.',
    niveauPriorite: 'moyenne',
    statut: 'resolue',
    siteId: 'site-atpek',
    responsableSuivi: 'Aminata Konaté',
    dateEcheance: daysAgo(5),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(5),
    createdBy: 'u-admin-1',
  },
  /* Cas avec echeance depassee — pour illustrer le badge 'En retard' */
  {
    id: 'reco-006',
    titre: 'Installer un bac de décantation des boues teinture',
    description:
      'Les boues de teinture sont actuellement déversées directement dans le caniveau. Installer un bac de décantation 200 L avant rejet permettrait de capter les particules les plus grossières et de réduire la charge MES de l\'effluent. Coût estimé : 320 000 FCFA.',
    niveauPriorite: 'haute',
    statut: 'en_cours',
    siteId: 'site-galanimassiriw',
    resultatIndicatorId: 'water.mes',
    responsableSuivi: 'Kadiatou Diarra',
    dateEcheance: daysAgo(8), // 8j de retard
    createdAt: daysAgo(35),
    updatedAt: daysAgo(8),
    createdBy: 'u-sup-1',
  },
  /* Cas 'non appliquee' — le responsable a fait remonter que la
   * recommandation ne pourra pas etre mise en oeuvre (raisons budgetaires
   * ou techniques). Le sup l'a tracee dans ce statut pour audit. */
  {
    id: 'reco-007',
    titre: 'Reconstruire le canal de drainage en béton coulé',
    description:
      'Le canal actuel est en terre battue, perméable. Reconstruction en béton coulé proposée. Refusée par le responsable de site : coût prohibitif (1,8 M FCFA) et acceptabilité sociale faible — alternative recherchée.',
    niveauPriorite: 'moyenne',
    statut: 'non_appliquee',
    siteId: 'site-djiguiyaso',
    responsableSuivi: 'Mariam Doumbia',
    dateEcheance: daysAgo(22),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(20),
    createdBy: 'u-sup-1',
  },
  /* Cas reco transversale (pas attachee a un site) — bonne pratique
   * generale qui s'applique a tous les sites pilotes. */
  {
    id: 'reco-008',
    titre: 'Standardiser le format d\'étiquetage des flacons labo',
    description:
      "Variations observees dans le format des etiquettes flacons (ECH-XX vs ECH-SITE-XX). Standardiser sur ECH-SITE-YYYYMMDD-NNN pour faciliter le tri labo et la tracabilite.",
    niveauPriorite: 'basse',
    statut: 'proposee',
    /* siteId absent → transversale */
    responsableSuivi: 'Awa Diarra',
    dateEcheance: daysFromNow(30),
    createdAt: daysAgo(2),
    createdBy: 'u-admin-1',
  },
];
