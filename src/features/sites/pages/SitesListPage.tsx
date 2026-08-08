import { useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Pencil, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import {
  PageHeader,
  Button,
  IconButton,
  Input,
  Select,
  Tabs,
  EmptyState,
  Skeleton,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useDeleteSite, useSiteDetail, useSites } from '../hooks/useSites';
import { SiteForm } from '../components/SiteForm';
import type { Site } from '../api/site.types';
import type { ConformityLevel } from '@/types/common';
import styles from './SitesListPage.module.css';

const CONFORMITY_TABS: Array<{ value: 'all' | ConformityLevel; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'conforming', label: 'Conformes' },
  { value: 'warning', label: 'À surveiller' },
  { value: 'critical', label: 'Non conformes' },
];

export function SitesListPage() {
  const { role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = role === 'admin';
  const deleteMut = useDeleteSite();

  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('all');
  const [commune, setCommune] = useState<string>('all');
  const [conformity, setConformity] = useState<'all' | ConformityLevel>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  // Seule la recherche texte est envoyée à l'API (full-text).
  // Type, conformité et commune sont filtrés côté client sur les valeurs
  // déjà normalisées par l'adapter, ce qui évite le décalage avec les
  // valeurs brutes Kobo renvoyées par le backend.
  const { data, isLoading } = useSites({ q: q || undefined });

  const filteredByTypeConformity = useMemo(() => {
    let items = data?.items ?? [];
    if (type !== 'all') items = items.filter((s) => s.type === type);
    if (conformity !== 'all') items = items.filter((s) => s.conformity === conformity);
    return items;
  }, [data, type, conformity]);

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
        { header: 'Conformité', accessor: (s) => s.conformity },
      ],
      rows: sites,
    });
    toast.success(`Export XLSX — ${sites.length} sites.`);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditing(site);
    setFormOpen(true);
  };

  const handleDelete = async (site: Site) => {
    const ok = await confirm({
      title: `Supprimer "${site.shortName}" ?`,
      message: 'Suppression définitive du site. Les collectes associées resteront archivées.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(site.id);
      toast.success(`Site ${site.shortName} supprimé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
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
            {canManage ? (
              <Button variant="success" iconLeft={<Plus size={16} />} onClick={openCreate}>
                Nouveau site
              </Button>
            ) : null}
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
            canManage ? (
              <Button variant="success" iconLeft={<Plus size={16} />} onClick={openCreate}>
                Créer le premier site
              </Button>
            ) : (
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
            )
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Site</th>
                <th>Localisation</th>
                <th>Responsable</th>
                <th>Statut juridique</th>
                <th>Année création</th>
                <th>Couverture sociale</th>
                {canManage ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  onEdit={canManage ? openEdit : undefined}
                  onDelete={canManage ? handleDelete : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <SiteForm open={formOpen} onClose={() => setFormOpen(false)} site={editing} />
      ) : null}
    </>
  );
}

interface SiteRowProps {
  site: Site;
  onEdit?: (site: Site) => void;
  onDelete?: (site: Site) => void;
}

function SiteRow({ site, onEdit, onDelete }: SiteRowProps) {
  const navigate = useNavigate();
  const { data: detail } = useSiteDetail(site.id);
  const collecte = detail?.collecteSite;
  const showActions = onEdit || onDelete;
  const goToSite = () => navigate(`/sites/${site.id}`);
  const onKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToSite();
    }
  };
  const stop = (handler: (s: Site) => void) => (e: MouseEvent) => {
    e.stopPropagation();
    handler(site);
  };

  const responsable = collecte?.nomResponsable ?? site.responsableName ?? '—';
  const statutJuridique = collecte?.statutJuridique ?? (site.legalStatus === 'formel' ? 'Formel' : 'Informel');
  const anneeCreation = collecte?.anneeCreation ?? (site.createdYear > 0 ? site.createdYear : null);
  const couvertureSociale = collecte?.couvertureSociale ?? null;

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
      <td>{couvertureSociale ?? '—'}</td>
      {showActions ? (
        <td className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {onEdit ? (
            <IconButton
              aria-label={`Modifier ${site.shortName}`}
              variant="ghost"
              onClick={stop(onEdit)}
            >
              <Pencil size={14} />
            </IconButton>
          ) : null}
          {onDelete ? (
            <IconButton
              aria-label={`Supprimer ${site.shortName}`}
              variant="ghost"
              onClick={stop(onDelete)}
            >
              <Trash2 size={14} />
            </IconButton>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}
