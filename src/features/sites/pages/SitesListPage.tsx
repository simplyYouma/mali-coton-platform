import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, FileSpreadsheet } from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Tabs,
  EmptyState,
  Skeleton,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useSiteDetail, useSites } from '../hooks/useSites';
import { useConformiteGlobale } from '@/features/conformite/hooks/useConformite';
import type { ConformiteSiteSummary, StatutConformite } from '@/features/conformite/api/conformite';
import type { Site } from '../api/site.types';
import styles from './SitesListPage.module.css';

const STATUT_CONFORMITE_LABEL: Record<string, string> = {
  CONFORME: 'Conforme',
  A_SURVEILLER: 'À surveiller',
  CRITIQUE: 'Critique',
  NON_EVALUE: '—',
};

const CONFORMITY_TABS: Array<{ value: 'all' | StatutConformite; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'CONFORME', label: 'Conformes' },
  { value: 'A_SURVEILLER', label: 'À surveiller' },
  { value: 'CRITIQUE', label: 'Non conformes' },
];

export function SitesListPage() {
  const toast = useToast();

  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('all');
  const [commune, setCommune] = useState<string>('all');
  const [conformity, setConformity] = useState<'all' | StatutConformite>('all');

  // GET /api/site_teintures ne supporte aucun paramètre de filtre côté
  // backend (voir docs/openapi-backend.json — seul `page` est documenté) :
  // recherche, type et commune sont donc tous filtrés côté client sur la
  // liste complète.
  const { data, isLoading } = useSites();

  // La conformité réelle vient du backend labo (`/donnees-environnementales/conformite`),
  // pas du champ `Site.conformity` qui n'est pas alimenté en live.
  const { data: conformiteData } = useConformiteGlobale();
  const conformiteMap = useMemo(
    () => new Map<number, ConformiteSiteSummary>((conformiteData?.sites ?? []).map((c) => [c.id, c])),
    [conformiteData],
  );

  const searched = useMemo(() => {
    const items = data?.items ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((s) => {
      const haystack = [s.name, s.shortName, s.codeSite, s.location.commune, s.location.city, s.location.quartier]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, q]);

  const filteredByTypeConformity = useMemo(() => {
    let items = searched;
    if (type !== 'all') items = items.filter((s) => s.type === type);
    if (conformity !== 'all') {
      items = items.filter((s) => conformiteMap.get(Number(s.id))?.statut === conformity);
    }
    return items;
  }, [searched, type, conformity, conformiteMap]);

  const communes = useMemo(() => {
    const set = new Set<string>();
    filteredByTypeConformity.forEach((s) => {
      if (s.location.commune) set.add(s.location.commune);
    });
    return Array.from(set).sort();
  }, [filteredByTypeConformity]);

  const sites = useMemo(
    () =>
      commune === 'all'
        ? filteredByTypeConformity
        : filteredByTypeConformity.filter((s) => s.location.commune === commune),
    [filteredByTypeConformity, commune],
  );

  const handleExport = () => {
    exportRowsToXlsx({
      filename: 'sites',
      sheetName: 'Sites',
      columns: [
        { header: 'Code', accessor: (s) => s.shortName },
        { header: 'Nom complet', accessor: (s) => s.name },
        { header: 'Type', accessor: (s) => s.type },
        { header: 'Statut légal', accessor: (s) => s.legalStatus },
        { header: 'Effectif', accessor: (s) => s.workforce },
        { header: 'Année création', accessor: (s) => s.createdYear },
        { header: 'Commune', accessor: (s) => s.location.commune },
        { header: 'Ville', accessor: (s) => s.location.city },
        { header: 'Quartier', accessor: (s) => s.location.quartier ?? '' },
        { header: 'Latitude', accessor: (s) => s.coordinates.lat },
        { header: 'Longitude', accessor: (s) => s.coordinates.lng },
        {
          header: 'Conformité',
          accessor: (s) => {
            const statut = conformiteMap.get(Number(s.id))?.statut;
            return statut ? (STATUT_CONFORMITE_LABEL[statut] ?? statut) : '—';
          },
        },
      ],
      rows: sites,
    });
    toast.success(`Export XLSX — ${sites.length} sites.`);
  };

  return (
    <>
      <PageHeader
        eyebrow={`${sites.length} site${sites.length > 1 ? 's' : ''}`}
        title="Sites"
        description="Référentiel des sites pilotes et leur conformité actuelle."
        actions={
          <>
            <Button
              variant="excel"
              iconLeft={<FileSpreadsheet size={16} />}
              onClick={handleExport}
              disabled={sites.length === 0}
            >
              Exporter XLSX
            </Button>
            <Link to="/cartographie">
              <Button variant="secondary" iconLeft={<MapPin size={16} />}>
                Voir sur la carte
              </Button>
            </Link>
          </>
        }
      />

      <section className={styles.toolbar} aria-label="Filtres">
        <div className={styles.searchInput}>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, commune…"
            prefix={<Search size={16} />}
            inputSize="md"
            aria-label="Rechercher un site"
          />
        </div>
        <Select<string>
          value={commune}
          onChange={setCommune}
          options={[
            { value: 'all', label: 'Toutes communes' },
            ...communes.map((c) => ({ value: c, label: c })),
          ]}
          aria-label="Filtrer par commune"
        />
        <Select<string>
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Tous les types' },
            { value: 'GALA', label: 'GALA' },
            { value: 'INDIGO', label: 'INDIGO' },
            { value: 'GALA_INDIGO', label: 'GALA + INDIGO' },
            { value: 'NATURELLE', label: 'Teinture naturelle' },
          ]}
          aria-label="Type de teinture"
        />
        <Tabs
          value={conformity}
          onChange={setConformity}
          items={CONFORMITY_TABS}
          variant="pill"
          aria-label="Niveau de conformité"
        />
        <span className={styles.count}>
          <Filter size={14} aria-hidden="true" /> {sites.length} site{sites.length > 1 ? 's' : ''}
        </span>
      </section>

      {isLoading ? (
        <div className={styles.skeletonStack}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={56} radius={8} />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="Aucun site ne correspond à votre recherche"
          description="Essayez d'ajuster les filtres ou de vider la recherche."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ('');
                setType('all');
                setCommune('all');
                setConformity('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : (
        <ConformiteTable sites={sites} conformiteMap={conformiteMap} />
      )}
    </>
  );
}

// ── ConformiteTable ────────────────────────────────────────────────────────

function ConformiteBadge({ statut }: { statut: string }) {
  const cls =
    statut === 'CONFORME'
      ? styles.confBadgeOk
      : statut === 'CRITIQUE'
        ? styles.confBadgeCrit
        : statut === 'A_SURVEILLER'
          ? styles.confBadgeWarn
          : styles.confBadgeNd;
  return <span className={`${styles.confBadge} ${cls}`}>{STATUT_CONFORMITE_LABEL[statut] ?? statut}</span>;
}

interface ConformiteTableProps {
  sites: Site[];
  conformiteMap: Map<number, ConformiteSiteSummary>;
}

function ConformiteTable({ sites, conformiteMap }: ConformiteTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Site</th>
            <th>Localisation</th>
            <th>Responsable</th>
            <th>Statut juridique</th>
            <th>Année création</th>
            <th>Conformité</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <SiteRow key={site.id} site={site} conformite={conformiteMap.get(Number(site.id))} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── SiteRow ───────────────────────────────────────────────────────────────────

interface SiteRowProps {
  site: Site;
  conformite?: ConformiteSiteSummary;
}

function SiteRow({ site, conformite }: SiteRowProps) {
  const navigate = useNavigate();
  const { data: detail } = useSiteDetail(site.id);
  const collecte = detail?.collecteSite;
  const goToSite = () => navigate(`/sites/${site.id}`);
  const onKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToSite();
    }
  };

  const responsable = collecte?.nomResponsable ?? site.responsableName ?? '—';
  const statutJuridique = collecte?.statutJuridique ?? (site.legalStatus === 'formel' ? 'Formel' : 'Informel');
  const anneeCreation = collecte?.anneeCreation ?? (site.createdYear > 0 ? site.createdYear : null);

  return (
    <tr
      className={styles.row}
      onClick={goToSite}
      onKeyDown={onKey}
      tabIndex={0}
      role="link"
      aria-label={`Détail du site ${site.shortName}`}
    >
      <td>
        <span className={styles.siteText}>
          <span className={styles.siteName}>{site.shortName}</span>
        </span>
      </td>
      <td>
        <span className={styles.location}>
          <MapPin size={12} aria-hidden="true" />
          {[site.location.commune, site.location.city].filter(Boolean).join(', ')}
        </span>
      </td>
      <td>{responsable}</td>
      <td>{statutJuridique ?? '—'}</td>
      <td>{anneeCreation ?? '—'}</td>
      <td>
        {conformite
          ? <ConformiteBadge statut={conformite.statut} />
          : <span className={styles.confBadgeNd}>—</span>}
      </td>
    </tr>
  );
}
