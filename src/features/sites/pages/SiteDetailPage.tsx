import { useState } from 'react';
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
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSite, useSiteDetail, useSiteEmployes } from '../hooks/useSites';
import { SiteForm } from '../components/SiteForm';
import { DonneesEnvPanel } from '../components/DonneesEnvPanel';
import { SITE_TYPE_LABEL } from '../api/site.types';
import type { KoboCodedItem, KoboPhotoBackend } from '../api/sites.adapter';
import { SitePhotoGallery } from '../components/SitePhotoGallery';
import { formatDateTime, formatGps } from '@/lib/format';
import styles from './SiteDetailPage.module.css';

/* ─── helpers ─── */

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

/* Seul jeu de couleurs conserve sur cette page : il traduit une gravite. */
const CONFORMITE_LABEL: Record<string, string> = {
  conforming: 'Conforme',
  warning: 'À surveiller',
  critical: 'Critique',
};

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

/**
 * Une donnee de la fiche : intitule discret au-dessus, valeur en avant.
 *
 * L'ancienne mise en ligne — intitule a gauche, valeur a droite — obligeait a
 * balayer horizontalement et imposait des colonnes de largeur arbitraire. En
 * pile, les valeurs s'alignent verticalement et se lisent d'un coup d'oeil.
 *
 * `large` reserve toute la largeur aux champs de texte libre, qu'une colonne
 * etroite rendrait illisibles.
 */
/**
 * Jauge de repartition femmes / hommes.
 *
 * Les deux parts sont representees, chacune avec sa teinte et son
 * pourcentage : montrer la seule part des femmes obligeait a deduire l'autre.
 * Les effectifs restent affiches en clair au-dessus — la jauge donne l'ordre
 * de grandeur, elle ne remplace pas les chiffres.
 */
function RatioBar({ femmes, hommes }: { femmes: number | null; hommes: number | null }) {
  const f = femmes ?? 0;
  const h = hommes ?? 0;
  const total = f + h;
  if (total === 0) return null;

  const partFemmes = Math.round((f / total) * 100);
  const partHommes = 100 - partFemmes;

  return (
    <span className={styles.ratio}>
      <span
        className={styles.ratioTrack}
        role="img"
        aria-label={`${partFemmes}% de femmes, ${partHommes}% d'hommes`}
      >
        <span
          className={styles.ratioPart}
          data-part="femmes"
          style={{ width: `${partFemmes}%` }}
        />
        <span
          className={styles.ratioPart}
          data-part="hommes"
          style={{ width: `${partHommes}%` }}
        />
      </span>
      <span className={styles.ratioLegend}>
        <span className={styles.ratioKey}>
          <span className={styles.ratioDot} data-part="femmes" aria-hidden="true" />
          {partFemmes}% femmes
        </span>
        <span className={styles.ratioKey}>
          <span className={styles.ratioDot} data-part="hommes" aria-hidden="true" />
          {partHommes}% hommes
        </span>
      </span>
    </span>
  );
}

function FieldRow({
  label, children, large,
}: {
  label: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className={`${styles.dataItem} ${large ? styles.dataItemLarge : ''}`}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={styles.dataValue}>{children}</span>
    </div>
  );
}

/**
 * Un groupe de la fiche.
 *
 * Les donnees etaient auparavant enfermees dans autant de cartes bordees,
 * juxtaposees sans hierarchie : la page se lisait comme une mosaique de
 * boites de tailles inegales, avec des vides la ou une carte comptait moins
 * de lignes que sa voisine.
 *
 * Le groupe n'a plus de chrome propre. Il s'annonce par un intitule discret
 * prolonge d'un filet, et pose ses donnees dans une grille fluide. Toute la
 * fiche partage alors une seule surface, et le rythme vient de la typographie
 * plutot que des bordures.
 */
function SectionCard({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.group}>
      <header className={styles.groupHead}>
        <span className={styles.groupIcon}>{icon}</span>
        <h3 className={styles.groupTitle}>{title}</h3>
        <span className={styles.groupRule} aria-hidden="true" />
      </header>
      <div className={styles.groupGrid}>{children}</div>
    </section>
  );
}

/* ─── Page ─── */

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const { data: site, isLoading, isError } = useSite(id);
  const { data: detail, isLoading: detailLoading } = useSiteDetail(id);

  const [tab, setTab] = useState<'profil' | 'conditions' | 'appuis' | 'employes' | 'photos' | 'env'>('profil');
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

  const cs = detail?.collecteSite ?? null;
  const photos: KoboPhotoBackend[] = detail?.photos ?? [];
  const typesTeinture: KoboCodedItem[] = detail?.typesTeinture ?? [];

  /* Effectifs : la fiche terrain fait foi, le referentiel du site sert de
   * repli quand la visite n'a pas encore ete importee. */
  const effectifTotal = cs?.nbEmployesTotal ?? site?.workforce ?? null;
  const effectifFemmes = cs?.nbFemmes ?? site?.workforceWomen ?? null;
  const effectifHommes = cs?.nbHommes ?? site?.workforceMen ?? null;
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

      {/* ── Bande d'identite ──
       *  Remplace les deux rangees de cartes qui repetaient l'effectif a trois
       *  endroits. Meme principe que la fiche collecte : une ligne dense, la
       *  couleur reservee au seul indicateur qui en merite — la conformite. */}
      <section className={styles.infoStrip} aria-label="Identité du site">
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Commune</span>
          <span className={styles.infoValue}>
            <MapPin size={12} aria-hidden="true" />
            {site.location.commune || cs?.ville || '—'}
          </span>
        </div>

        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Statut foncier</span>
          <span className={styles.infoValue}>
            {site.legalStatus === 'formel' ? 'Formel' : 'Informel'}
            {cs?.anneeCreation ? (
              <span className={styles.infoAside}>depuis {cs.anneeCreation}</span>
            ) : null}
          </span>
        </div>

        {/* Effectif et repartition tiennent desormais sur une seule ligne. */}
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Effectif</span>
          <span className={styles.infoValue}>
            <Users size={12} aria-hidden="true" />
            {effectifTotal ?? '—'}
            {effectifFemmes != null || effectifHommes != null ? (
              <span className={styles.infoAside}>
                {effectifFemmes ?? '—'} F · {effectifHommes ?? '—'} H
              </span>
            ) : null}
          </span>
        </div>

        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Teinture</span>
          <span className={styles.infoValue}>
            {typesTeinture.length
              ? typesTeinture.map((t) => t.libelle).join(' · ')
              : '—'}
          </span>
        </div>

        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Dernière visite</span>
          <span className={styles.infoValue}>
            {cs?.dateVisite ? formatDateTime(cs.dateVisite, 'dd MMM yyyy') : '—'}
          </span>
        </div>

        {/* Seule cellule coloree : elle porte une information de gravite. */}
        <div className={styles.infoCell}>
          <span className={styles.infoLabel}>Conformité</span>
          <span className={styles.infoValue}>
            <span className={styles.conformiteTag} data-level={site.conformity}>
              {CONFORMITE_LABEL[site.conformity] ?? '—'}
            </span>
          </span>
        </div>

        {/* Releve de position, en bout de bande : traitement cartographique
         *  pour qu'on le reconnaisse sans lire l'intitule. */}
        <div className={`${styles.infoCell} ${styles.gpsCell}`}>
          <span className={styles.infoLabel}>Position GPS</span>
          <span className={styles.gpsValue}>
            <MapPin size={13} aria-hidden="true" />
            {site.coordinates.lat !== 0
              ? formatGps(site.coordinates.lat, site.coordinates.lng)
              : 'Non relevée'}
          </span>
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
          { value: 'env', label: 'Données env.' },
        ]}
        aria-label="Sections de la fiche site"
      />

      <div className={styles.body}>
        {/* ── Squelette chargement (commun aux 3 onglets de collecte) ── */}
        {detailLoading && (tab === 'profil' || tab === 'conditions' || tab === 'appuis') ? (
          <div className={styles.sheet}>
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
          <div className={styles.sheet}>
            {/* Commune, annee, effectifs, teinture et GPS figurent deja dans la
             *  bande d'identite : les repeter ici n'apprendrait rien. Ne restent
             *  que les informations propres a la visite. */}
            <SectionCard title="Visite de terrain" icon={<Calendar size={16} />}>
              <FieldRow label="Date de visite">
                {cs.dateVisite ? formatDateTime(cs.dateVisite, 'dd MMM yyyy') : '—'}
              </FieldRow>
              <FieldRow label="Agent collecteur">{formatName(cs.agent)}</FieldRow>
              <FieldRow label="Statut juridique">{cs.statutJuridique ?? '—'}</FieldRow>
              <FieldRow label="Identifiant Kobo">
                {cs.koboSubmissionId ? <code className={styles.codeInline}>{cs.koboSubmissionId}</code> : '—'}
              </FieldRow>
            </SectionCard>

            <SectionCard title="Responsable du site" icon={<User size={16} />}>
              <FieldRow label="Nom">{cs.nomResponsable ?? site.responsableName ?? '—'}</FieldRow>
              <FieldRow label="Genre">{formatCode(cs.genreResponsable)}</FieldRow>
              <FieldRow label="Répartition de l'effectif">
                {effectifFemmes ?? '—'} femmes · {effectifHommes ?? '—'} hommes
                <RatioBar femmes={effectifFemmes} hommes={effectifHommes} />
              </FieldRow>
            </SectionCard>

            {cs.observationsGenerales || cs.recommandations ? (
              <SectionCard title="Synthèse de la visite" icon={<MessageSquare size={16} />}>
                {cs.observationsGenerales ? (
                  <FieldRow label="Observations générales" large>{cs.observationsGenerales}</FieldRow>
                ) : null}
                {cs.recommandations ? (
                  <FieldRow label="Recommandations" large>{cs.recommandations}</FieldRow>
                ) : null}
              </SectionCard>
            ) : null}
          </div>
        ) : null}

        {/* ══ Onglet Conditions de travail ══ */}
        {tab === 'conditions' && cs ? (
          <div className={styles.sheet}>
            <SectionCard title="Ressource en eau" icon={<Droplet size={16} />}>
              <FieldRow label="Source d'eau">{formatCode(cs.sourceEau)}</FieldRow>
              <FieldRow label="État de la source"><QualBadge val={cs.etatSourcePrincipale} /></FieldRow>
              <FieldRow label="Consommation (m³)">
                {cs.consommationEauM3 != null ? `${cs.consommationEauM3} m³` : '—'}
              </FieldRow>
              {cs.observationsEau ? (
                <FieldRow label="Observations" large>{cs.observationsEau}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="Équipements" icon={<Wrench size={16} />}>
              <FieldRow label="Équipements disponibles">
                <Chips items={equipements} />
              </FieldRow>
              <FieldRow label="État général"><QualBadge val={cs.etatGeneralEquipements} /></FieldRow>
              {cs.observationsEquipements ? (
                <FieldRow label="Observations" large>{cs.observationsEquipements}</FieldRow>
              ) : null}
            </SectionCard>

            <SectionCard title="EPI — Protection individuelle" icon={<Shield size={16} />}>
              <FieldRow label="EPI disponibles">
                <Chips items={epis} />
              </FieldRow>
              <FieldRow label="Qualité des EPI"><QualBadge val={cs.qualiteEpi} /></FieldRow>
              <FieldRow label="Formation EPI reçue">
                <OuiNon val={cs.formationEpiRecue} />
              </FieldRow>
              {cs.observationsEpiSite ? (
                <FieldRow label="Observations" large>{cs.observationsEpiSite}</FieldRow>
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
                <FieldRow label="Description" large>{cs.descriptionAccidents}</FieldRow>
              ) : null}
              {cs.observationsSecurite ? (
                <FieldRow label="Observations" large>{cs.observationsSecurite}</FieldRow>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {/* ══ Onglet Appuis & Besoins ══ */}
        {tab === 'appuis' && cs ? (
          <div className={styles.sheet}>
            <SectionCard title="Gestion administrative" icon={<ListChecks size={16} />}>
              <FieldRow label="Comptabilité">{formatCode(cs.comptabilite)}</FieldRow>
              <FieldRow label="Couverture sociale"><QualBadge val={cs.couvertureSociale} /></FieldRow>
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
                    <FieldRow label="Observations générales" large>{cs.observationsGenerales}</FieldRow>
                  ) : null}
                  {cs.recommandations ? (
                    <FieldRow label="Recommandations" large>{cs.recommandations}</FieldRow>
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
                        <div className={styles.empSection}>
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
                        <div className={styles.empSection}>
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
                            <FieldRow label="Observations santé" large>{dc.obsSante}</FieldRow>
                          ) : null}
                        </div>

                        {/* Rémunération */}
                        <div className={styles.empSection}>
                          <span className={styles.empSectionTitle}>
                            <Banknote size={13} /> Rémunération
                          </span>
                          <FieldRow label="Mode">{formatCode(dc?.modeRemuneration)}</FieldRow>
                          <FieldRow label="Revenu suffisant"><QualBadge val={dc?.revenuSuffisant} /></FieldRow>
                          <FieldRow label="Revenu unique"><OuiNon val={dc?.revenuUnique} /></FieldRow>
                          <FieldRow label="Couverture sociale"><OuiNon val={dc?.couvertureSociale} /></FieldRow>
                        </div>

                        {/* Besoins */}
                        <div className={styles.empSection}>
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
                              <FieldRow label="Observations" large>{dc.observations}</FieldRow>
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
              description="Les photos du site apparaîtront ici une fois importées."
            />
          ) : (
            <SitePhotoGallery photos={photos} />
          )
        ) : null}

        {/* ══ Onglet Données environnementales ══ */}
        {tab === 'env' ? <DonneesEnvPanel siteId={id!} /> : null}
      </div>

      {isAdmin ? (
        <SiteForm open={editOpen} onClose={() => setEditOpen(false)} site={site} />
      ) : null}
    </>
  );
}
