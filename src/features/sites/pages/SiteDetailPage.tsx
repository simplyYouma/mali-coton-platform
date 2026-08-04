import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  ClipboardList,
  ImageOff,
  Calendar,
  User,
  Droplet,
  Wrench,
  Shield,
  BookOpen,
  HandHelping,
  ListChecks,
  MessageSquare,
  Zap,
  Eye,
  Lock,
  Flame,
  AlertTriangle,
  ChevronDown,
  Heart,
  Banknote,
  UserCheck,
} from 'lucide-react';
import {
  Button,
  Tabs,
  Skeleton,
  EmptyState,
  Badge,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { mockUsers } from '@/mocks/fixtures/users';
import { findRule, computeLocalConformity } from '@/features/collection/lib/indicatorRules';
import type { Collection, Measurement } from '@/features/collection/api/collection.types';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import type { ConformityLevel } from '@/types/common';
import { useSite, useSiteDetail, useSiteEmployes } from '../hooks/useSites';
import { ConformityBadge } from '../components/ConformityBadge';
import { SiteForm } from '../components/SiteForm';
import { SITE_TYPE_LABEL } from '../api/site.types';
import type { KoboCodedItem, KoboPhotoBackend } from '../api/sites.adapter';
import { SitePhoto } from '../components/KoboImage';
import { formatDateTime, formatGps } from '@/lib/format';
import styles from './SiteDetailPage.module.css';

/* ─── helpers ─── */

function worstConformity(measurements: Measurement[]): ConformityLevel {
  let worst: ConformityLevel = 'conforming';
  for (const m of measurements) {
    const rule = findRule(m.indicatorId);
    if (!rule) continue;
    const v = typeof m.value === 'number' ? m.value : Number(m.value);
    if (!Number.isFinite(v)) continue;
    const level = computeLocalConformity(rule, v);
    if (level === 'critical') return 'critical';
    if (level === 'warning' && worst === 'conforming') worst = 'warning';
  }
  return worst;
}

function isOui(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const s = String(val).toLowerCase();
  return s.startsWith('oui') || s === '1' || s === 'true';
}

function OuiNon({ val }: { val: unknown }) {
  const yes = isOui(val);
  if (val == null || val === '') return <span className={styles.fieldEmpty}>—</span>;
  return (
    <span className={`${styles.ouiNon} ${yes ? styles.ouiNonOui : styles.ouiNonNon}`}>
      {yes ? 'Oui' : 'Non'}
    </span>
  );
}

/* ── Formatage des codes Kobo (underscores → lisible) ── */
const CODE_LABELS: Record<string, string> = {
  moins_1an: '< 1 an', '1_3ans': '1 à 3 ans', '3_5ans': '3 à 5 ans',
  '5_10ans': '5 à 10 ans', plus_10ans: '+ 10 ans',
  teinturiere: 'Teinturière', gestion: 'Gestion', journalier: 'Journalier', permanent: 'Permanent',
  epi: 'EPI', formation_epi: 'Formation EPI', bilan_sante: 'Bilan santé',
  medicaments: 'Médicaments', eau: 'Eau', equipements: 'Équipements',
  formation_tech: 'Formation technique', formation_secu: 'Formation sécurité',
  formation_gest: 'Formation gestion', protection_soc: 'Protection sociale',
  infra_site: 'Infrastructure site', contact_peau: 'Contact peau',
  fumees: 'Fumées', vapeurs: 'Vapeurs', brulures: 'Brûlures',
  positions: 'Positions', soleil: 'Soleil', habitude: 'Habitude',
  indisponible: 'Indisponible', autre: 'Autre',
};

function formatCode(val: string | null | undefined): string {
  if (!val) return '—';
  return CODE_LABELS[val] ?? val.replace(/_/g, ' ');
}

function formatName(val: string | null | undefined): string {
  if (!val) return '—';
  return val
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/* ── Badge qualité coloré ── */
const QUAL_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  bonne: 'success', bon: 'success', toujours: 'success', suffisant: 'success',
  acceptable: 'warning', moyen: 'warning', moyenne: 'warning',
  partiel: 'warning', parfois: 'warning', souvent: 'warning', rarement: 'warning',
  mauvais: 'danger', mauvaise: 'danger', frequemment: 'danger', critique: 'danger',
};

function QualBadge({ val }: { val: string | null | undefined }) {
  if (!val) return <span className={styles.fieldEmpty}>—</span>;
  const key = val.toLowerCase().trim();
  const color = QUAL_COLORS[key];
  const label = formatCode(val);
  if (color === 'success') return <span className={`${styles.qualBadge} ${styles.qualSuccess}`}>{label}</span>;
  if (color === 'warning') return <span className={`${styles.qualBadge} ${styles.qualWarning}`}>{label}</span>;
  if (color === 'danger')  return <span className={`${styles.qualBadge} ${styles.qualDanger}`}>{label}</span>;
  return <span>{label}</span>;
}

type CardColor = 'primary' | 'blue' | 'orange' | 'yellow' | 'red' | 'green' | 'purple' | 'teal' | 'amber' | 'slate';

function Chips({ items }: { items: KoboCodedItem[] }) {
  if (!items.length) return <span className={styles.fieldEmpty}>—</span>;
  return (
    <div className={styles.chipRow}>
      {items.map((it) => (
        <span key={it.id} className={styles.chip}>
          {formatCode(it.libelle)}
        </span>
      ))}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

function SectionCard({
  title, icon, children, color,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color?: CardColor;
}) {
  return (
    <div className={styles.sectionCard} data-color={color}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

/* ─── Page ─── */

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const { data: site, isLoading, isError } = useSite(id);
  const { data: detail, isLoading: detailLoading } = useSiteDetail(id);

  const { data: collectionsPage } = useCollections({ siteId: id });
  const siteCollections = useMemo(
    () =>
      [...(collectionsPage?.items ?? [])].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      ),
    [collectionsPage],
  );

  const [tab, setTab] = useState<'profil' | 'conditions' | 'appuis' | 'employes' | 'photos' | 'historique'>('profil');
  const [editOpen, setEditOpen] = useState(false);
  const [openEmployes, setOpenEmployes] = useState<Set<number>>(new Set());

  const { data: employesData, isLoading: employesLoading } = useSiteEmployes(id);

  function toggleEmploye(empId: number) {
    setOpenEmployes((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }
  const isAdmin = role === 'admin';

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const cs = detail?.collecteSite ?? null;
  const photos: KoboPhotoBackend[] = detail?.photos ?? [];
  const typesTeinture: KoboCodedItem[] = detail?.typesTeinture ?? [];
  const equipements: KoboCodedItem[] = detail?.equipements ?? [];
  const epis: KoboCodedItem[] = detail?.epis ?? [];
  const risques: KoboCodedItem[] = detail?.risquesSecurite ?? [];
  const formations: KoboCodedItem[] = detail?.formationsRecues ?? [];
  const appuis: KoboCodedItem[] = detail?.appuisRecus ?? [];
  const besoins: KoboCodedItem[] = detail?.besoinsPrioritaires ?? [];

  /* ── loading / error ── */
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton height={48} width="40%" />
        <Skeleton height={200} radius={14} />
      </div>
    );
  }

  if (isError || !site) {
    return (
      <EmptyState
        title="Site introuvable"
        description="Ce site n'existe pas ou a été supprimé."
        action={
          <Link to="/sites">
            <Button variant="secondary" iconLeft={<ArrowLeft size={16} />}>
              Retour à la liste
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Link to="/sites" className={styles.back}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Tous les sites</span>
      </Link>

      {/* ── Hero ── */}
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroCode}>{site.codeSite}</span>
            {' · '}
            {SITE_TYPE_LABEL[site.type]}
          </span>
          <h1 className={styles.heroTitle}>{site.shortName}</h1>
          {site.niveauFormalisation ? (
            <p className={styles.heroDescription}>
              Niveau de formalisation : {site.niveauFormalisation}
            </p>
          ) : null}
        </div>
        <div className={styles.heroActions} />
      </header>

      {/* ── Info strip ── */}
      <section className={styles.infoStrip} aria-label="Informations site">
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Localisation</span>
          <span className={styles.infoValue}>
            <MapPin size={12} aria-hidden="true" />
            {site.location.commune || cs?.ville || '—'}
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Effectif</span>
          <span className={styles.infoValue}>
            <Users size={12} aria-hidden="true" />
            {site.workforce > 0 ? `${site.workforce} personnes` : (cs?.nbEmployesTotal ?? '—')}
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Statut foncier</span>
          <span className={styles.infoValue}>
            {site.legalStatus === 'formel' ? 'Formel' : 'Informel'}
            {cs?.anneeCreation ? ` · ${cs.anneeCreation}` : ''}
          </span>
        </div>
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>GPS</span>
          <span className={`${styles.infoValue} mono`}>
            {site.coordinates.lat !== 0
              ? formatGps(site.coordinates.lat, site.coordinates.lng)
              : '—'}
          </span>
        </div>
      </section>

      {/* ── Stat tiles ── */}
      <section className={styles.statGrid} aria-label="Chiffres clés">
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Employés total</span>
          <span className={styles.statValue}>
            {cs?.nbEmployesTotal ?? site.workforce ?? '—'}
          </span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Femmes</span>
          <span className={styles.statValue} data-gender="f">
            {cs?.nbFemmes ?? site.workforceWomen ?? '—'}
          </span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Hommes</span>
          <span className={styles.statValue} data-gender="m">
            {cs?.nbHommes ?? site.workforceMen ?? '—'}
          </span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Types de teinture</span>
          <span className={styles.statValue}>{typesTeinture.length || '—'}</span>
        </div>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'profil', label: 'Profil du site' },
          { value: 'conditions', label: 'Conditions de travail' },
          { value: 'appuis', label: 'Appuis & Besoins' },
          { value: 'employes', label: 'Employés', badge: employesData?.totalEmployes || undefined },
          { value: 'photos', label: 'Photos', badge: photos.length || undefined },
          { value: 'historique', label: 'Historique', badge: siteCollections.length || undefined },
        ]}
        aria-label="Sections de la fiche site"
      />

      <div className={styles.body}>
        {/* ── Squelette chargement (commun aux 3 onglets de collecte) ── */}
        {detailLoading && (tab === 'profil' || tab === 'conditions' || tab === 'appuis') ? (
          <div className={styles.ficheGrid}>
            <Skeleton height={220} radius={12} />
            <Skeleton height={220} radius={12} />
            <Skeleton height={180} radius={12} />
            <Skeleton height={180} radius={12} />
          </div>
        ) : null}

        {/* ── Empty state sans données (commun) ── */}
        {!detailLoading && !cs && (tab === 'profil' || tab === 'conditions' || tab === 'appuis') ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Pas encore de données collectées"
            description="La fiche terrain pour ce site n'a pas encore été importée."
          />
        ) : null}

        {/* ══ Onglet Profil du site ══ */}
        {tab === 'profil' && cs ? (
          <div className={styles.ficheGrid}>
            <SectionCard title="Identification" icon={<Calendar size={16} />} color="primary">
              <FieldRow label="Date de visite">
                {cs.dateVisite ? formatDateTime(cs.dateVisite, 'dd MMM yyyy') : '—'}
              </FieldRow>
              <FieldRow label="Agent collecteur">{formatName(cs.agent)}</FieldRow>
              <FieldRow label="Ville / Commune">{cs.ville ?? '—'}</FieldRow>
              <FieldRow label="Année de création">{cs.anneeCreation ?? '—'}</FieldRow>
              <FieldRow label="Statut juridique">{cs.statutJuridique ?? '—'}</FieldRow>
              <FieldRow label="GPS collecte">
                {cs.latitude && cs.longitude
                  ? formatGps(cs.latitude, cs.longitude)
                  : cs.gpsSiteRaw ?? '—'}
              </FieldRow>
            </SectionCard>

            <SectionCard title="Responsable du site" icon={<User size={16} />} color="purple">
              <FieldRow label="Nom">{cs.nomResponsable ?? site.responsableName ?? '—'}</FieldRow>
              <FieldRow label="Genre">{formatCode(cs.genreResponsable)}</FieldRow>
            </SectionCard>

            <SectionCard title="Effectifs" icon={<Users size={16} />} color="teal">
              <FieldRow label="Total">{cs.nbEmployesTotal ?? '—'}</FieldRow>
              <FieldRow label="Femmes">{cs.nbFemmes ?? '—'}</FieldRow>
              <FieldRow label="Hommes">{cs.nbHommes ?? '—'}</FieldRow>
            </SectionCard>

            <SectionCard title="Types de teinture" icon={<Flame size={16} />} color="amber">
              <Chips items={typesTeinture} />
            </SectionCard>
          </div>
        ) : null}

        {/* ══ Onglet Conditions de travail ══ */}
        {tab === 'conditions' && cs ? (
          <div className={styles.ficheGrid}>
            <SectionCard title="Ressource en eau" icon={<Droplet size={16} />} color="blue">
              <FieldRow label="Source d'eau">{formatCode(cs.sourceEau)}</FieldRow>
              <FieldRow label="État de la source"><QualBadge val={cs.etatSourcePrincipale} /></FieldRow>
              <FieldRow label="Consommation (m³)">
                {cs.consommationEauM3 != null ? `${cs.consommationEauM3} m³` : '—'}
              </FieldRow>
              {cs.observationsEau ? (
                <FieldRow label="Observations">{cs.observationsEau}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Équipements" icon={<Wrench size={16} />} color="orange">
              <FieldRow label="Équipements disponibles">
                <Chips items={equipements} />
              </FieldRow>
              <FieldRow label="État général"><QualBadge val={cs.etatGeneralEquipements} /></FieldRow>
              {cs.observationsEquipements ? (
                <FieldRow label="Observations">{cs.observationsEquipements}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="EPI — Protection individuelle" icon={<Shield size={16} />} color="yellow">
              <FieldRow label="EPI disponibles">
                <Chips items={epis} />
              </FieldRow>
              <FieldRow label="Qualité des EPI"><QualBadge val={cs.qualiteEpi} /></FieldRow>
              <FieldRow label="Formation EPI reçue">
                <OuiNon val={cs.formationEpiRecue} />
              </FieldRow>
              {cs.observationsEpiSite ? (
                <FieldRow label="Observations">{cs.observationsEpiSite}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Sécurité du site" icon={<AlertTriangle size={16} />} color="red">
              <div className={styles.boolRow}>
                <span className={styles.boolItem}>
                  <Lock size={12} />
                  Clôture
                  <OuiNon val={cs.cloture} />
                </span>
                <span className={styles.boolItem}>
                  <Zap size={12} />
                  Éclairage
                  <OuiNon val={cs.eclairage} />
                </span>
                <span className={styles.boolItem}>
                  <Eye size={12} />
                  Surveillance
                  <OuiNon val={cs.surveillance} />
                </span>
              </div>
              <FieldRow label="Risques identifiés">
                <Chips items={risques} />
              </FieldRow>
              <FieldRow label="Accidents récents">
                <OuiNon val={cs.accidentsRecents} />
              </FieldRow>
              {cs.descriptionAccidents ? (
                <FieldRow label="Description">{cs.descriptionAccidents}</FieldRow>
              ) : null}
              {cs.observationsSecurite ? (
                <FieldRow label="Observations">{cs.observationsSecurite}</FieldRow>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {/* ══ Onglet Appuis & Besoins ══ */}
        {tab === 'appuis' && cs ? (
          <div className={styles.ficheGrid}>
            <SectionCard title="Gestion administrative" icon={<ListChecks size={16} />} color="purple">
              <FieldRow label="Comptabilité">{formatCode(cs.comptabilite)}</FieldRow>
              <FieldRow label="Couverture sociale"><QualBadge val={cs.couvertureSociale} /></FieldRow>
            </SectionCard>

            <SectionCard title="Formations reçues" icon={<BookOpen size={16} />} color="teal">
              <Chips items={formations} />
              {cs.formationsAutre ? (
                <FieldRow label="Autres">{cs.formationsAutre}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Appuis reçus" icon={<HandHelping size={16} />} color="green">
              <Chips items={appuis} />
            </SectionCard>

            <SectionCard title="Besoins prioritaires" icon={<ListChecks size={16} />} color="amber">
              <Chips items={besoins} />
            </SectionCard>

            {cs.observationsGenerales || cs.recommandations ? (
              <div className={styles.fullWidth}>
                <SectionCard title="Observations & Recommandations" icon={<MessageSquare size={16} />} color="slate">
                  {cs.observationsGenerales ? (
                    <FieldRow label="Observations générales">{cs.observationsGenerales}</FieldRow>
                  ) : null}
                  {cs.recommandations ? (
                    <FieldRow label="Recommandations">{cs.recommandations}</FieldRow>
                  ) : null}
                </SectionCard>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ══ Onglet Employés ══ */}
        {tab === 'employes' ? (
          employesLoading ? (
            <div className={styles.empList}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={64} radius={12} />)}
            </div>
          ) : !employesData || employesData.employes.length === 0 ? (
            <EmptyState
              icon={<Users size={24} />}
              title="Aucun employé enregistré"
              description="Les fiches employés apparaîtront ici une fois collectées."
            />
          ) : (
            <div className={styles.empList}>
              {employesData.employes.map((emp) => {
                const isOpen = openEmployes.has(emp.id);
                const dc = emp.derniereCollecte;
                return (
                  <div key={emp.id} className={styles.empCard}>
                    <button
                      className={styles.empHeader}
                      onClick={() => toggleEmploye(emp.id)}
                      aria-expanded={isOpen}
                    >
                      <div className={styles.empHeaderLeft}>
                        <span className={styles.empCode}>{emp.codeEmploye}</span>
                        <span className={styles.empMeta}>
                          {[emp.genre, emp.fonction, emp.statut].filter(Boolean).map(formatCode).join(' · ')}
                        </span>
                        {emp.anciennete ? (
                          <span className={styles.chip}>{formatCode(emp.anciennete)}</span>
                        ) : null}
                      </div>
                      <ChevronDown
                        size={16}
                        className={`${styles.empChevron} ${isOpen ? styles.empChevronOpen : ''}`}
                      />
                    </button>

                    {isOpen ? (
                      <div className={styles.empBody}>
                        {/* EPI */}
                        <div className={styles.empSection} data-color="yellow">
                          <span className={styles.empSectionTitle}>
                            <Shield size={13} /> EPI utilisés
                          </span>
                          {emp.equipementsProtection.length ? (
                            <div className={styles.chipRow}>
                              {emp.equipementsProtection.map((e) => (
                                <span key={e.id} className={styles.chip}>{formatCode(e.libelle)}</span>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.fieldEmpty}>—</span>
                          )}
                          {dc?.frequenceEpi ? (
                            <FieldRow label="Fréquence EPI"><QualBadge val={dc.frequenceEpi} /></FieldRow>
                          ) : null}
                          {dc?.qualiteEpiPercue ? (
                            <FieldRow label="Qualité perçue"><QualBadge val={dc.qualiteEpiPercue} /></FieldRow>
                          ) : null}
                          {dc?.obstaclesEpi ? (
                            <FieldRow label="Obstacles">{formatCode(dc.obstaclesEpi)}</FieldRow>
                          ) : null}
                        </div>

                        {/* Santé */}
                        <div className={styles.empSection} data-color="red">
                          <span className={styles.empSectionTitle}>
                            <Heart size={13} /> Santé & sécurité
                          </span>
                          <FieldRow label="Affections dermato"><QualBadge val={dc?.affecDermato} /></FieldRow>
                          <FieldRow label="Affections respi"><QualBadge val={dc?.affecRespi} /></FieldRow>
                          <FieldRow label="Affections oculaires"><QualBadge val={dc?.affecOculaire} /></FieldRow>
                          <FieldRow label="Bilan santé reçu"><OuiNon val={dc?.bilanSanteRecu} /></FieldRow>
                          <FieldRow label="Suivi médical"><OuiNon val={dc?.suiviMedical} /></FieldRow>
                          {dc?.expositions ? (
                            <FieldRow label="Expositions">
                              {dc.expositions.split(' ').map((e) => formatCode(e)).join(', ')}
                            </FieldRow>
                          ) : null}
                          <FieldRow label="Confort du poste"><QualBadge val={dc?.confortPoste} /></FieldRow>
                          <FieldRow label="Connaissance risques"><OuiNon val={dc?.connaissanceRisques} /></FieldRow>
                          <FieldRow label="Formation sécu reçue"><OuiNon val={dc?.formationSecuRecue} /></FieldRow>
                          {dc?.structureSante ? (
                            <FieldRow label="Structure santé">{dc.structureSante}</FieldRow>
                          ) : null}
                          {dc?.obsSante ? (
                            <FieldRow label="Observations santé">{dc.obsSante}</FieldRow>
                          ) : null}
                        </div>

                        {/* Rémunération */}
                        <div className={styles.empSection} data-color="green">
                          <span className={styles.empSectionTitle}>
                            <Banknote size={13} /> Rémunération
                          </span>
                          <FieldRow label="Mode">{formatCode(dc?.modeRemuneration)}</FieldRow>
                          <FieldRow label="Revenu suffisant"><QualBadge val={dc?.revenuSuffisant} /></FieldRow>
                          <FieldRow label="Revenu unique"><OuiNon val={dc?.revenuUnique} /></FieldRow>
                          <FieldRow label="Couverture sociale"><OuiNon val={dc?.couvertureSociale} /></FieldRow>
                        </div>

                        {/* Besoins */}
                        <div className={styles.empSection} data-color="amber">
                          <span className={styles.empSectionTitle}>
                            <UserCheck size={13} /> Besoins prioritaires
                          </span>
                          {emp.besoins.length ? (
                            <div className={styles.chipRow}>
                              {emp.besoins.map((b) => (
                                <span key={b.id} className={styles.chip}>{formatCode(b.libelle)}</span>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.fieldEmpty}>—</span>
                          )}
                        </div>

                        {/* Suggestions / Observations */}
                        {dc?.suggestionsEmploye || dc?.observations ? (
                          <div className={styles.empSection}>
                            <span className={styles.empSectionTitle}>
                              <MessageSquare size={13} /> Suggestions & observations
                            </span>
                            {dc.suggestionsEmploye ? (
                              <FieldRow label="Suggestions">{dc.suggestionsEmploye}</FieldRow>
                            ) : null}
                            {dc.observations ? (
                              <FieldRow label="Observations">{dc.observations}</FieldRow>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )
        ) : null}

        {/* ══ Onglet Photos ══ */}
        {tab === 'photos' ? (
          photos.length === 0 ? (
            <EmptyState
              icon={<ImageOff size={24} />}
              title="Aucune photo pour ce site"
              description="Les photos Kobo apparaîtront ici une fois importées."
            />
          ) : (
            <div className={styles.photoGrid}>
              {photos.map((p) => (
                <div key={p.id} className={styles.photoCard}>
                  <SitePhoto
                    src={p.downloadMediumUrl ?? p.downloadUrl}
                    fullUrl={p.downloadLargeUrl ?? p.downloadUrl}
                    alt={p.mediaFileBasename ?? 'Photo du site'}
                  />
                  {p.mediaFileBasename ? (
                    <span className={styles.photoMeta}>{p.mediaFileBasename}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* ══ Onglet Historique ══ */}
        {tab === 'historique' ? (
          <section className={styles.panel} aria-label="Historique des collectes">
            {siteCollections.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={24} />}
                title="Aucune collecte enregistrée"
                description="Ce site n'a pas encore été visité par un agent."
              />
            ) : (
              <ul className={styles.timeline}>
                {siteCollections.slice(0, 12).map((entry: Collection, i) => {
                  const conformity = worstConformity(entry.measurements);
                  const isLast = i === Math.min(siteCollections.length, 12) - 1;
                  return (
                    <li key={entry.id} className={styles.timelineItem}>
                      <span
                        className={styles.timelineDot}
                        data-conformity={conformity}
                        aria-hidden="true"
                      />
                      {!isLast ? <span className={styles.timelineLine} aria-hidden="true" /> : null}
                      <div className={styles.timelineCard}>
                        <header className={styles.timelineHeader}>
                          <div>
                            <p className={styles.timelineDate}>
                              {formatDateTime(entry.collectedAt)}
                            </p>
                            <p className={styles.timelineAgent}>
                              par {usersById.get(entry.agentId) ?? entry.agentId}
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANT[entry.status]} size="sm">
                            {STATUS_LABEL[entry.status]}
                          </Badge>
                        </header>
                        <footer className={styles.timelineFooter}>
                          <ConformityBadge level={conformity} size="sm" />
                          <Link to={`/collecte/${entry.id}`}>
                            <Button variant="ghost" size="sm">
                              Détail de la collecte
                            </Button>
                          </Link>
                        </footer>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {isAdmin ? (
        <SiteForm open={editOpen} onClose={() => setEditOpen(false)} site={site} />
      ) : null}
    </>
  );
}
