import type {
  Collection,
  CollectionNotification,
  CollectionStatus,
} from '@/features/collection/api/collection.types';

/**
 * Génère un UUID v4 déterministe-en-apparence pour les soumissions Kobo.
 * En prod c'est Kobo qui le forge — ici on en fabrique un stable par compteur
 * pour que les fixtures restent identifiables à travers les rechargements.
 */
function koboUuid(seed: number): string {
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
  const a = hex(seed * 2654435761, 8).slice(-8);
  const b = hex(seed * 40503, 4).slice(-4);
  return `${a}-${b}-4${a.slice(0, 3)}-9${b.slice(0, 3)}-${hex(seed, 12).slice(-12)}`;
}

const SITES = [
  { id: 'site-atpek', agent: 'u-agent-bko' },
  { id: 'site-dianeguela', agent: 'u-agent-bko' },
  { id: 'site-galanimassiriw', agent: 'u-agent-bko' },
  { id: 'site-djiguiyaso', agent: 'u-agent-bko' },
  { id: 'site-ndomo', agent: 'u-agent-segou' },
];

const MS_DAY = 86_400_000;

function daysAgo(d: number): string {
  return new Date(Date.now() - d * MS_DAY).toISOString();
}

function rand<T>(arr: T[]): T {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const STATUSES_OLD: CollectionStatus[] = ['validated', 'validated', 'validated', 'rejected'];
const STATUSES_RECENT: CollectionStatus[] = ['submitted', 'submitted', 'validated'];

/**
 * Banque de photos illustratives — Picsum (stable via seed).
 * Chaque seed est associé à un type de scène plausible pour une collecte
 * (cuves de teinture, effluent, EPI agent, étiquette échantillon labo).
 */
const PHOTO_SEEDS = {
  vatsOverview: 'pnud-vats-1',
  effluentDitch: 'pnud-effluent-2',
  workshopArea: 'pnud-workshop-3',
  ppeAgent: 'pnud-ppe-4',
  sampleLabel: 'pnud-sample-5',
  rinseTank: 'pnud-rinse-6',
  wasteHeap: 'pnud-waste-7',
  drainOutlet: 'pnud-drain-8',
} as const;

function photoUrl(seed: string, w = 800, h = 600): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

/**
 * Météo plausible pour Bamako/Ségou en fonction du mois de la collecte.
 * Saison sèche (oct → mai) : sunny majoritaire, harmattan = windy en déc-fév.
 * Saison des pluies (juin → septembre) : rainy/cloudy, températures plus basses.
 */
type Weather = 'sunny' | 'cloudy' | 'rainy' | 'windy';
function weatherForDate(iso: string): { weather: Weather; ambientTempC: number } {
  const m = new Date(iso).getMonth(); // 0 = janv
  const r = Math.random();
  if (m >= 5 && m <= 8) {
    // saison des pluies
    const w: Weather = r < 0.45 ? 'rainy' : r < 0.85 ? 'cloudy' : 'sunny';
    return { weather: w, ambientTempC: Math.round(26 + Math.random() * 6) };
  }
  if (m === 11 || m === 0 || m === 1) {
    // harmattan
    const w: Weather = r < 0.5 ? 'windy' : r < 0.9 ? 'sunny' : 'cloudy';
    return { weather: w, ambientTempC: Math.round(22 + Math.random() * 8) };
  }
  // saison sèche chaude (mars → mai, octobre)
  const w: Weather = r < 0.75 ? 'sunny' : r < 0.95 ? 'cloudy' : 'windy';
  return { weather: w, ambientTempC: Math.round(30 + Math.random() * 8) };
}

/** Sites qui longent un cours d'eau (Niger ou bras secondaire). */
const SITES_WITH_WATERCOURSE = new Set([
  'site-dianeguela',
  'site-galanimassiriw',
  'site-djiguiyaso',
]);

/**
 * Notes de validation possibles laissées par le superviseur lorsqu'il valide
 * une collecte (cf. CDC §5.2.3 — facultatif). Réutilisées sur quelques fixtures
 * pour montrer le rendu.
 */
const VALIDATION_NOTES_BANK: string[] = [
  "Valeurs cohérentes avec l'historique du site. Photos exploitables. Validé sans réserve.",
  "pH légèrement au-dessus de la moyenne du site mais photo de la lecture jointe — RAS.",
  "Bordereau labo conforme, délai contractuel respecté. Bonne saisie agent.",
  "Confirmation visuelle des cuves et du caniveau de rejet. Validation après recoupement avec la collecte précédente.",
];

export const mockCollections: Collection[] = (() => {
  const list: Collection[] = [];
  let counter = 0;

  // Historique long pour chaque site (12 collectes étalées sur 90 jours)
  for (const site of SITES) {
    for (let i = 0; i < 12; i++) {
      counter += 1;
      const days = i * 7 + Math.floor(Math.random() * 3);
      const status = i < 2 ? rand(STATUSES_RECENT) : rand(STATUSES_OLD);
      const collectedIso = daysAgo(days);
      const weather = weatherForDate(collectedIso);
      const isValidated = status === 'validated';
      const includeValidationNote = isValidated && Math.random() < 0.55;
      list.push({
        id: `col-${String(counter).padStart(4, '0')}`,
        koboSubmissionUuid: koboUuid(counter),
        koboVersion: 1,
        siteId: site.id,
        agentId: site.agent,
        collectedAt: collectedIso,
        status,
        syncedAt: daysAgo(days - 0.01),
        gps: { lat: 12.6 + (Math.random() - 0.5) * 0.5, lng: -7.95 + (Math.random() - 0.5) * 0.5, accuracy: 4 + Math.random() * 6 },
        context: {
          weather: weather.weather,
          ambientTempC: weather.ambientTempC,
          hasNearbyWatercourse: SITES_WITH_WATERCOURSE.has(site.id),
          observations:
            weather.weather === 'rainy'
              ? "Pluie battante au moment de la collecte — accès atelier difficile."
              : weather.weather === 'windy'
                ? 'Vent de sable (harmattan) — visibilité réduite, échantillons couverts.'
                : i % 4 === 0
                  ? "Activité teinture en cours, atelier à pleine capacité."
                  : undefined,
        },
        measurements: [
          {
            indicatorId: 'water.ph',
            acquisition: 'in_situ',
            value:
              site.id === 'site-dianeguela'
                ? 10.6 + Math.random() * 1.2 // chronique critique : 10.6–11.8
                : site.id === 'site-atpek'
                  ? 9.0 + Math.random() * 0.9 // surveillance : 9.0–9.9
                  : site.id === 'site-galanimassiriw'
                    ? 8.0 + Math.random() * 1.3 // variable : 8.0–9.3
                    : site.id === 'site-djiguiyaso'
                      ? 7.6 + Math.random() * 1.1 // 7.6–8.7
                      : 7.4 + Math.random() * 1.0, // NDOMO référence : 7.4–8.4
            unit: '',
          },
          {
            indicatorId: 'air.pm25',
            acquisition: 'in_situ',
            value: 18 + Math.random() * 12,
            unit: 'µg/m³',
          },
          {
            indicatorId: 'water.sulfates',
            acquisition: 'lab_received',
            value: site.id === 'site-dianeguela' ? 4332 : 200 + Math.random() * 800,
            unit: 'mg/L',
          },
          {
            indicatorId: 'health.epi_usage',
            acquisition: 'in_situ',
            value: site.id === 'site-ndomo' ? 95 : site.id === 'site-djiguiyaso' ? 70 : 30 + Math.random() * 30,
            unit: '%',
          },
          {
            indicatorId: 'soil.ph',
            acquisition: 'in_situ',
            value:
              site.id === 'site-ndomo'
                ? 6.8 + Math.random() * 0.6
                : site.id === 'site-dianeguela'
                  ? 9.0 + Math.random() * 0.5 // hors seuil — sol contaminé
                  : 6.0 + Math.random() * 2.0,
            unit: '',
          },
          {
            indicatorId: 'waste.quantity',
            acquisition: 'in_situ',
            value: 40 + Math.random() * 80, // kg/semaine
            unit: 'kg/semaine',
          },
          {
            indicatorId: 'socio.workforce_present',
            acquisition: 'in_situ',
            value: Math.floor(15 + Math.random() * 30),
            unit: 'pers.',
          },
        ],
        photos: [],
        notes: i === 0 ? 'Visite régulière. RAS sur les conditions d\'accueil.' : undefined,
        validatedBy: isValidated ? 'u-sup-1' : undefined,
        validatedAt: isValidated ? daysAgo(Math.max(0, days - 0.4)) : undefined,
        validationNotes: includeValidationNote
          ? VALIDATION_NOTES_BANK[counter % VALIDATION_NOTES_BANK.length]
          : undefined,
      });
    }
  }

  // ─── Collectes "needs_correction" ─────────────────────────────────────────
  // Démonstration du flux CDC §5.2.3 « Corriger » : le superviseur a renvoyé
  // la collecte à l'agent avec un motif circonstancié et des étapes ciblées.
  const correctionCases: Array<{
    siteId: string;
    daysAgo: number;
    targetSteps: string[];
    notes: string;
    waterPh: number;
    sulfates: number;
    epiUsage: number;
    photos: Array<{ seed: string; note: string; offsetMin: number }>;
  }> = [
    {
      siteId: 'site-galanimassiriw',
      daysAgo: 2.1,
      targetSteps: ['water', 'review'],
      notes:
        "pH = 12,4 mesuré in-situ : valeur extrême peu plausible vu l'historique du site (8,2–9,1). "
        + "Merci de re-tester avec une bandelette neuve et de joindre une photo de la lecture du pH-mètre. "
        + "Si la valeur est confirmée, ajouter une note de contexte (rejet exceptionnel ?).",
      waterPh: 12.4,
      sulfates: 612,
      epiUsage: 45,
      photos: [
        { seed: PHOTO_SEEDS.vatsOverview, note: 'Cuves de teinture indigo — atelier en activité', offsetMin: -32 },
        { seed: PHOTO_SEEDS.effluentDitch, note: 'Rejet liquide vers caniveau extérieur', offsetMin: -24 },
        { seed: PHOTO_SEEDS.rinseTank, note: 'Bac de rinçage en fin de cycle', offsetMin: -16 },
        { seed: PHOTO_SEEDS.sampleLabel, note: "Étiquette échantillon — envoi LNE Bamako", offsetMin: -8 },
      ],
    },
    {
      siteId: 'site-djiguiyaso',
      daysAgo: 4.4,
      targetSteps: ['review', 'context'],
      notes:
        "Album photos incomplet : il manque la vue d'ensemble de l'atelier (étape 5). "
        + "Le contexte météo indique « ensoleillé » mais les photos montrent des flaques importantes "
        + "— préciser dans les observations et corriger si la pluie est récente.",
      waterPh: 8.6,
      sulfates: 418,
      epiUsage: 72,
      photos: [
        { seed: PHOTO_SEEDS.rinseTank, note: 'Bac de rinçage — eau visiblement chargée', offsetMin: -40 },
        { seed: PHOTO_SEEDS.ppeAgent, note: 'Teinturière équipée (gants, tablier)', offsetMin: -28 },
        { seed: PHOTO_SEEDS.drainOutlet, note: 'Point de rejet — flaques visibles au sol', offsetMin: -12 },
      ],
    },
    {
      siteId: 'site-ndomo',
      daysAgo: 6.8,
      targetSteps: ['review'],
      notes:
        "Coordonnées GPS hors emprise du site (>180 m du polygone Ndomo). "
        + "Vérifier l'activation du GPS sur la tablette et reprendre le point depuis l'atelier.",
      waterPh: 7.9,
      sulfates: 245,
      epiUsage: 95,
      photos: [
        { seed: PHOTO_SEEDS.workshopArea, note: "Vue d'ensemble Ndomo — espace teinture extérieur", offsetMin: -50 },
        { seed: PHOTO_SEEDS.vatsOverview, note: 'Cuves Ndomo — détail proche', offsetMin: -32 },
        { seed: PHOTO_SEEDS.wasteHeap, note: 'Stockage déchets solides (boues teinture)', offsetMin: -20 },
      ],
    },
  ];

  for (const c of correctionCases) {
    counter += 1;
    const requestedAt = daysAgo(c.daysAgo - 0.4);
    const collectedIso = daysAgo(c.daysAgo);
    const agentEmail = 'agent.bamako@sahel.com';
    const agentPhone = '+22376112233';
    const notifications: CollectionNotification[] = [
      {
        id: `notif-${counter}-mail`,
        channel: 'email',
        recipient: agentEmail,
        recipientUserId: 'u-agent-bko',
        kind: 'correction_requested',
        sentAt: requestedAt,
        ref: `msg-${counter}@plateforme.pnud.org`,
      },
      {
        id: `notif-${counter}-sms`,
        channel: 'sms',
        recipient: agentPhone,
        recipientUserId: 'u-agent-bko',
        kind: 'correction_requested',
        sentAt: requestedAt,
        ref: `SMS-${counter}-OR`,
      },
    ];
    list.push({
      id: `col-${String(counter).padStart(4, '0')}`,
      koboSubmissionUuid: koboUuid(counter),
      koboVersion: 1,
      siteId: c.siteId,
      agentId: 'u-agent-bko',
      collectedAt: collectedIso,
      status: 'needs_correction',
      syncedAt: daysAgo(c.daysAgo - 0.05),
      notifications,
      gps: c.siteId === 'site-ndomo'
        ? { lat: 12.95, lng: -7.42, accuracy: 38 } // hors site Ndomo
        : { lat: 12.6 + (Math.random() - 0.5) * 0.4, lng: -7.95 + (Math.random() - 0.5) * 0.4, accuracy: 5 },
      measurements: [
        { indicatorId: 'water.ph', acquisition: 'in_situ', value: c.waterPh, unit: '' },
        { indicatorId: 'water.sulfates', acquisition: 'lab_received', value: c.sulfates, unit: 'mg/L' },
        { indicatorId: 'air.pm25', acquisition: 'in_situ', value: 22 + Math.random() * 8, unit: 'µg/m³' },
        { indicatorId: 'health.epi_usage', acquisition: 'in_situ', value: c.epiUsage, unit: '%' },
      ],
      photos: c.photos.map((p, idx) => ({
        id: `photo-${counter}-${idx}`,
        url: photoUrl(p.seed),
        takenAt: new Date(new Date(collectedIso).getTime() + p.offsetMin * 60_000).toISOString(),
        note: p.note,
      })),
      correctionRequest: {
        requestedBy: 'u-sup-1',
        requestedAt,
        targetSteps: c.targetSteps,
        notes: c.notes,
      },
      agentCertified: true,
    });
  }

  // ─── Pipeline labo : collectes avec échantillons à différents stades du cycle
  // (sent / received_at_lab / in_analysis / bordereau_returned / refused / accepted)
  // Modélise correctement le flacon physique : un containerId regroupe les
  // indicateurs partageant le même prélèvement (un flacon d'eau → pH + sulfates + métaux).
  const labCases: Array<{
    siteId: string;
    daysSinceSent: number;
    labId: string;
    status:
      | 'sent'
      | 'received_at_lab'
      | 'in_analysis'
      | 'bordereau_returned'
      | 'refused_by_lab'
      | 'rejected_by_supervisor'
      | 'accepted';
    sulfatesValue?: number;
    heavyMetalsValue?: number;
    bordereauRef?: string;
    refusalReason?: string;
    rejectionReason?: string;
  }> = [
    { siteId: 'site-atpek', daysSinceSent: 1.2, labId: 'lab.lne', status: 'sent' },
    { siteId: 'site-dianeguela', daysSinceSent: 2.1, labId: 'lab.lne', status: 'sent' },
    { siteId: 'site-galanimassiriw', daysSinceSent: 2.9, labId: 'lab.lns-bamako', status: 'received_at_lab' },
    { siteId: 'site-djiguiyaso', daysSinceSent: 4.0, labId: 'lab.lne', status: 'received_at_lab' },
    { siteId: 'site-dianeguela', daysSinceSent: 5.4, labId: 'lab.lne', status: 'in_analysis' },
    { siteId: 'site-ndomo', daysSinceSent: 6.8, labId: 'lab.sotuba', status: 'in_analysis' },
    {
      siteId: 'site-atpek',
      daysSinceSent: 8.2,
      labId: 'lab.lne',
      status: 'bordereau_returned',
      sulfatesValue: 612,
      heavyMetalsValue: 0.08,
      bordereauRef: 'LNE-2026-0421',
    },
    {
      siteId: 'site-galanimassiriw',
      daysSinceSent: 7.6,
      labId: 'lab.lns-bamako',
      status: 'bordereau_returned',
      sulfatesValue: 880,
      heavyMetalsValue: 0.12,
      bordereauRef: 'LNS-2026-0188',
    },
    {
      siteId: 'site-djiguiyaso',
      daysSinceSent: 3.4,
      labId: 'lab.lne',
      status: 'refused_by_lab',
      refusalReason: 'Volume insuffisant (35 mL reçus, 100 mL requis pour analyse complète). Re-prélèvement nécessaire.',
    },
    {
      siteId: 'site-dianeguela',
      daysSinceSent: 9.0,
      labId: 'lab.lne',
      status: 'rejected_by_supervisor',
      sulfatesValue: 8520,
      heavyMetalsValue: 0.04,
      bordereauRef: 'LNE-2026-0398',
      rejectionReason: 'Valeur sulfates incohérente (8 520 mg/L = 4× le pic historique du site). Demande de ré-analyse en duplicate.',
    },
    {
      siteId: 'site-atpek',
      daysSinceSent: 13.0,
      labId: 'lab.lne',
      status: 'accepted',
      sulfatesValue: 720,
      heavyMetalsValue: 0.09,
      bordereauRef: 'LNE-2026-0387',
    },
  ];

  for (const lc of labCases) {
    counter += 1;
    const collectedIso = daysAgo(lc.daysSinceSent + 0.3);
    const sentIso = daysAgo(lc.daysSinceSent);
    const sla = lc.labId === 'lab.lns-bamako' ? 7 : lc.labId === 'lab.cnrst' ? 14 : 10;
    const expectedBy = new Date(new Date(sentIso).getTime() + sla * 86_400_000).toISOString();
    const containerId = `flacon-${counter}-water`;
    const sampleId = `${lc.labId.split('.')[1]!.toUpperCase()}-${String(counter).padStart(4, '0')}`;
    const receivedAt =
      lc.status === 'received_at_lab' ||
      lc.status === 'in_analysis' ||
      lc.status === 'bordereau_returned' ||
      lc.status === 'rejected_by_supervisor' ||
      lc.status === 'accepted'
        ? daysAgo(lc.daysSinceSent - 0.8)
        : undefined;
    const analysisStartedAt =
      lc.status === 'in_analysis' ||
      lc.status === 'bordereau_returned' ||
      lc.status === 'rejected_by_supervisor' ||
      lc.status === 'accepted'
        ? daysAgo(lc.daysSinceSent - 1.5)
        : undefined;
    const analyzedAt =
      lc.status === 'bordereau_returned' ||
      lc.status === 'rejected_by_supervisor' ||
      lc.status === 'accepted'
        ? daysAgo(lc.daysSinceSent - 2.2)
        : undefined;
    const analyzedBy =
      analyzedAt ? (lc.labId === 'lab.lns-bamako' ? 'u-lab-2' : 'u-lab-1') : undefined;
    const rejectedAt =
      lc.status === 'rejected_by_supervisor' ? daysAgo(lc.daysSinceSent - 2.6) : undefined;

    const sharedSample = {
      sampleId,
      containerId,
      labId: lc.labId,
      status: lc.status,
      sentAt: sentIso,
      expectedBy,
      receivedAt,
      analysisStartedAt,
      analyzedAt,
      analyzedBy,
      bordereauRef: lc.bordereauRef,
      bordereauUrl: lc.bordereauRef ? `https://stub.local/bordereau/${lc.bordereauRef}.pdf` : undefined,
      refusalReason: lc.refusalReason,
      rejectionReason: lc.rejectionReason,
      rejectedBy: rejectedAt ? 'u-sup-1' : undefined,
      rejectedAt,
    };

    // Le flacon contient 2 analyses : sulfates + métaux lourds
    const valuePresent =
      lc.status === 'bordereau_returned' ||
      lc.status === 'rejected_by_supervisor' ||
      lc.status === 'accepted';

    const collectionStatus: CollectionStatus =
      lc.status === 'accepted' ? 'lab_complete' : 'awaiting_lab';

    list.push({
      id: `col-${String(counter).padStart(4, '0')}`,
      koboSubmissionUuid: koboUuid(counter),
      koboVersion: 1,
      siteId: lc.siteId,
      agentId: lc.siteId === 'site-ndomo' ? 'u-agent-segou' : 'u-agent-bko',
      collectedAt: collectedIso,
      status: collectionStatus,
      syncedAt: sentIso,
      gps: { lat: 12.6 + (Math.random() - 0.5) * 0.3, lng: -7.95 + (Math.random() - 0.5) * 0.3, accuracy: 5 },
      context: {
        weather: 'sunny',
        ambientTempC: 33,
        hasNearbyWatercourse: SITES_WITH_WATERCOURSE.has(lc.siteId),
      },
      measurements: [
        { indicatorId: 'water.ph', acquisition: 'in_situ', value: 8.5, unit: '' },
        {
          indicatorId: 'water.sulfates',
          acquisition: valuePresent && lc.status === 'accepted' ? 'lab_received' : 'lab_pending',
          value: valuePresent ? lc.sulfatesValue ?? null : null,
          unit: 'mg/L',
          sample: sharedSample,
        },
        {
          indicatorId: 'water.metals.cr',
          acquisition: valuePresent && lc.status === 'accepted' ? 'lab_received' : 'lab_pending',
          value: valuePresent ? lc.heavyMetalsValue ?? null : null,
          unit: 'mg/L',
          sample: sharedSample,
        },
        { indicatorId: 'air.pm25', acquisition: 'in_situ', value: 22, unit: 'µg/m³' },
      ],
      photos: [],
      agentCertified: true,
    });
  }

  // ─── Cas "boucle fermée" : collecte renvoyée pour correction puis ré-soumise
  // par l'agent via Kobo (même UUID, version 2). Démontre que la plateforme
  // reconnaît la collecte revenue corrigée — pas une nouvelle collecte.
  {
    counter += 1;
    const reviseSeed = counter;
    const originalRequestedAt = daysAgo(3.6);
    const resubmittedAt = daysAgo(0.4);
    const collectedIso = daysAgo(4);
    list.push({
      id: `col-${String(counter).padStart(4, '0')}`,
      koboSubmissionUuid: koboUuid(reviseSeed),
      koboVersion: 2,
      siteId: 'site-atpek',
      agentId: 'u-agent-bko',
      collectedAt: collectedIso,
      status: 'submitted',
      syncedAt: resubmittedAt,
      gps: { lat: 12.61, lng: -7.99, accuracy: 4 },
      context: {
        weather: 'sunny',
        ambientTempC: 34,
        hasNearbyWatercourse: false,
        observations: "Reprise après correction superviseur : pH re-mesuré avec bandelette neuve, photo de l'écran pH-mètre jointe.",
      },
      measurements: [
        { indicatorId: 'water.ph', acquisition: 'in_situ', value: 9.4, unit: '' },
        { indicatorId: 'water.sulfates', acquisition: 'lab_received', value: 540, unit: 'mg/L' },
        { indicatorId: 'air.pm25', acquisition: 'in_situ', value: 24, unit: 'µg/m³' },
        { indicatorId: 'health.epi_usage', acquisition: 'in_situ', value: 60, unit: '%' },
        { indicatorId: 'soil.ph', acquisition: 'in_situ', value: 7.2, unit: '' },
      ],
      photos: [
        {
          id: `photo-${counter}-1`,
          url: photoUrl(PHOTO_SEEDS.vatsOverview),
          takenAt: new Date(new Date(collectedIso).getTime() - 20 * 60_000).toISOString(),
          note: 'Cuves de teinture — version corrigée',
        },
        {
          id: `photo-${counter}-2`,
          url: photoUrl(PHOTO_SEEDS.sampleLabel),
          takenAt: new Date(new Date(collectedIso).getTime() - 8 * 60_000).toISOString(),
          note: 'Photo de la lecture du pH-mètre (demandée par le superviseur)',
        },
      ],
      agentCertified: true,
      revisions: [
        {
          version: 1,
          submittedAt: daysAgo(4.1),
          measurementsCount: 4,
          photosCount: 1,
          reason: 'correction_requested',
          triggeredBy: 'u-sup-1',
        },
      ],
      notifications: [
        {
          id: `notif-${counter}-mail-1`,
          channel: 'email',
          recipient: 'agent.bamako@sahel.com',
          recipientUserId: 'u-agent-bko',
          kind: 'correction_requested',
          sentAt: originalRequestedAt,
          ref: `msg-${counter}-v1@plateforme.pnud.org`,
        },
        {
          id: `notif-${counter}-sms-1`,
          channel: 'sms',
          recipient: '+22376112233',
          recipientUserId: 'u-agent-bko',
          kind: 'correction_requested',
          sentAt: originalRequestedAt,
          ref: `SMS-${counter}-v1`,
        },
      ],
    });
  }

  // ─── Album photos sur quelques collectes validées récentes ────────────────
  // Donne au superviseur un aperçu de ce que produit l'agent en tournée.
  const photoAlbums: Array<Array<keyof typeof PHOTO_SEEDS>> = [
    ['vatsOverview', 'rinseTank', 'effluentDitch', 'ppeAgent', 'sampleLabel'],
    ['workshopArea', 'wasteHeap', 'drainOutlet'],
    ['vatsOverview', 'effluentDitch', 'sampleLabel', 'ppeAgent'],
    ['workshopArea', 'vatsOverview', 'rinseTank', 'effluentDitch'],
    ['ppeAgent', 'sampleLabel', 'drainOutlet'],
    ['vatsOverview', 'wasteHeap', 'rinseTank', 'workshopArea', 'effluentDitch'],
    ['effluentDitch', 'drainOutlet', 'sampleLabel'],
  ];
  const albumNotes: Record<keyof typeof PHOTO_SEEDS, string> = {
    vatsOverview: "Cuves de teinture en cours d'utilisation",
    effluentDitch: 'Caniveau de rejet — exutoire principal',
    workshopArea: "Vue d'ensemble de l'aire de travail",
    ppeAgent: "Teinturier·ère en EPI (gants + tablier)",
    sampleLabel: 'Étiquette échantillon avant envoi labo',
    rinseTank: "Bac de rinçage — fin de cycle",
    wasteHeap: 'Stockage des déchets solides (boues teinture)',
    drainOutlet: "Point de rejet vers l'extérieur du site",
  };

  let albumIdx = 0;
  const albumStatuses: CollectionStatus[] = ['submitted', 'lab_complete', 'validated'];
  for (const c of list) {
    if (!albumStatuses.includes(c.status)) continue;
    if (albumIdx >= photoAlbums.length) break;
    const album = photoAlbums[albumIdx]!;
    c.photos = album.map((key, idx) => ({
      id: `photo-${c.id}-${idx}`,
      url: photoUrl(PHOTO_SEEDS[key]),
      takenAt: new Date(new Date(c.collectedAt).getTime() - (album.length - idx) * 8 * 60_000).toISOString(),
      note: albumNotes[key],
    }));
    albumIdx += 1;
  }

  return list.sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );
})();
