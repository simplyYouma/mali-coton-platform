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
];
