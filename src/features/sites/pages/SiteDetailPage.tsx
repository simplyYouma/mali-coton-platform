import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  ClipboardList,
  ImageOff,
  Pencil,
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
} from 'lucide-react';
import {
  Button,
  Tabs,
  Skeleton,
  EmptyState,
  Badge,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { mockUsers } from '@/mocks/fixtures/users';
import { findRule, computeLocalConformity } from '@/features/collection/lib/indicatorRules';
import type { Collection, Measurement } from '@/features/collection/api/collection.types';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import type { ConformityLevel } from '@/types/common';
import { useSite, useSiteDetail, useDeleteSite } from '../hooks/useSites';
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

function Chips({ items }: { items: KoboCodedItem[] }) {
  if (!items.length) return <span className={styles.fieldEmpty}>—</span>;
  return (
    <div className={styles.chipRow}>
      {items.map((it) => (
        <span key={it.id} className={styles.chip}>
          {it.libelle}
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
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionCard}>
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
  const toast = useToast();
  const confirm = useConfirm();

  const { data: site, isLoading, isError } = useSite(id);
  const { data: detail, isLoading: detailLoading } = useSiteDetail(id);
  const deleteMut = useDeleteSite();

  const { data: collectionsPage } = useCollections({ siteId: id });
  const siteCollections = useMemo(
    () =>
      [...(collectionsPage?.items ?? [])].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      ),
    [collectionsPage],
  );

  const [tab, setTab] = useState<'profil' | 'conditions' | 'appuis' | 'photos' | 'historique'>('profil');
  const [editOpen, setEditOpen] = useState(false);
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

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Supprimer ${site.shortName} ?`,
      message: 'Suppression définitive du site et de toutes ses données associées.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(site.id);
      toast.success(`${site.shortName} supprimé.`);
      window.location.href = '/sites';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

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
        <div className={styles.heroActions}>
          {isAdmin ? (
            <>
              <Button
                variant="secondary"
                iconLeft={<Pencil size={16} />}
                onClick={() => setEditOpen(true)}
              >
                Modifier
              </Button>
              <Button variant="ghost" onClick={handleDelete} loading={deleteMut.isPending}>
                Supprimer
              </Button>
            </>
          ) : null}
        </div>
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
            <SectionCard title="Identification" icon={<Calendar size={16} />}>
              <FieldRow label="Date de visite">
                {cs.dateVisite ? formatDateTime(cs.dateVisite, 'dd MMM yyyy') : '—'}
              </FieldRow>
              <FieldRow label="Agent collecteur">{cs.agent ?? '—'}</FieldRow>
              <FieldRow label="Ville / Commune">{cs.ville ?? '—'}</FieldRow>
              <FieldRow label="Année de création">{cs.anneeCreation ?? '—'}</FieldRow>
              <FieldRow label="Statut juridique">{cs.statutJuridique ?? '—'}</FieldRow>
              <FieldRow label="GPS collecte">
                {cs.latitude && cs.longitude
                  ? formatGps(cs.latitude, cs.longitude)
                  : cs.gpsSiteRaw ?? '—'}
              </FieldRow>
            </SectionCard>

            <SectionCard title="Responsable du site" icon={<User size={16} />}>
              <FieldRow label="Nom">{cs.nomResponsable ?? site.responsableName ?? '—'}</FieldRow>
              <FieldRow label="Genre">{cs.genreResponsable ?? '—'}</FieldRow>
            </SectionCard>

            <SectionCard title="Effectifs" icon={<Users size={16} />}>
              <FieldRow label="Total">{cs.nbEmployesTotal ?? '—'}</FieldRow>
              <FieldRow label="Femmes">{cs.nbFemmes ?? '—'}</FieldRow>
              <FieldRow label="Hommes">{cs.nbHommes ?? '—'}</FieldRow>
            </SectionCard>

            <SectionCard title="Types de teinture" icon={<Flame size={16} />}>
              <Chips items={typesTeinture} />
            </SectionCard>
          </div>
        ) : null}

        {/* ══ Onglet Conditions de travail ══ */}
        {tab === 'conditions' && cs ? (
          <div className={styles.ficheGrid}>
            <SectionCard title="Ressource en eau" icon={<Droplet size={16} />}>
              <FieldRow label="Source d'eau">{cs.sourceEau ?? '—'}</FieldRow>
              <FieldRow label="État de la source">{cs.etatSourcePrincipale ?? '—'}</FieldRow>
              <FieldRow label="Consommation (m³)">
                {cs.consommationEauM3 != null ? `${cs.consommationEauM3} m³` : '—'}
              </FieldRow>
              {cs.observationsEau ? (
                <FieldRow label="Observations">{cs.observationsEau}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Équipements" icon={<Wrench size={16} />}>
              <FieldRow label="Équipements disponibles">
                <Chips items={equipements} />
              </FieldRow>
              <FieldRow label="État général">{cs.etatGeneralEquipements ?? '—'}</FieldRow>
              {cs.observationsEquipements ? (
                <FieldRow label="Observations">{cs.observationsEquipements}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="EPI — Protection individuelle" icon={<Shield size={16} />}>
              <FieldRow label="EPI disponibles">
                <Chips items={epis} />
              </FieldRow>
              <FieldRow label="Qualité des EPI">{cs.qualiteEpi ?? '—'}</FieldRow>
              <FieldRow label="Formation EPI reçue">
                <OuiNon val={cs.formationEpiRecue} />
              </FieldRow>
              {cs.observationsEpiSite ? (
                <FieldRow label="Observations">{cs.observationsEpiSite}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Sécurité du site" icon={<AlertTriangle size={16} />}>
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
            <SectionCard title="Gestion administrative" icon={<ListChecks size={16} />}>
              <FieldRow label="Comptabilité">{cs.comptabilite ?? '—'}</FieldRow>
              <FieldRow label="Couverture sociale">{cs.couvertureSociale ?? '—'}</FieldRow>
            </SectionCard>

            <SectionCard title="Formations reçues" icon={<BookOpen size={16} />}>
              <Chips items={formations} />
              {cs.formationsAutre ? (
                <FieldRow label="Autres">{cs.formationsAutre}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Appuis reçus" icon={<HandHelping size={16} />}>
              <Chips items={appuis} />
            </SectionCard>

            <SectionCard title="Besoins prioritaires" icon={<ListChecks size={16} />}>
              <Chips items={besoins} />
            </SectionCard>

            {cs.observationsGenerales || cs.recommandations ? (
              <div className={styles.fullWidth}>
                <SectionCard title="Observations & Recommandations" icon={<MessageSquare size={16} />}>
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
