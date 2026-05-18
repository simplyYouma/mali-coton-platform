import { useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
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
import { useDeleteSite, useSites } from '../hooks/useSites';
import { SiteForm } from '../components/SiteForm';
import { ConformityBadge } from '../components/ConformityBadge';
import { SITE_TYPE_SHORT } from '../api/site.types';
import { formatRelativeTime } from '@/lib/format';
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
  const canManage = role === 'admin';
  const deleteMut = useDeleteSite();

  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('all');
  const [commune, setCommune] = useState<string>('all');
  const [conformity, setConformity] = useState<'all' | ConformityLevel>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const { data, isLoading } = useSites({
    q: q || undefined,
    type: type === 'all' ? undefined : type,
    conformity: conformity === 'all' ? undefined : conformity,
  });

  const allSites = data?.items ?? [];
  const communes = useMemo(() => {
    const set = new Set<string>();
    allSites.forEach((s) => set.add(s.location.commune));
    return Array.from(set).sort();
  }, [allSites]);
  const sites = useMemo(
    () => (commune === 'all' ? allSites : allSites.filter((s) => s.location.commune === commune)),
    [allSites, commune],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditing(site);
    setFormOpen(true);
  };

  const handleDelete = async (site: Site) => {
    if (
      !window.confirm(
        `Supprimer définitivement le site "${site.shortName}" ? Les collectes associées resteront archivées.`,
      )
    ) {
      return;
    }
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
        actions={
          <>
            <Link to="/cartographie">
              <Button variant="secondary" iconLeft={<MapPin size={16} />}>
                Voir sur la carte
              </Button>
            </Link>
            {canManage ? (
              <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
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
              <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
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
                <th>Type</th>
                <th>Localisation</th>
                <th>Effectif</th>
                <th>Conformité</th>
                <th>Dernière activité</th>
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
          <span className={styles.siteName}>
            {site.shortName}
            {site.isReference ? (
              <Star size={11} className={styles.refStar} aria-label="Site de référence" />
            ) : null}
          </span>
        </span>
      </td>
      <td>
        <span className={styles.typePill}>{SITE_TYPE_SHORT[site.type]}</span>
      </td>
      <td>
        <span className={styles.location}>
          <MapPin size={12} aria-hidden="true" />
          {site.location.commune}, {site.location.city}
        </span>
      </td>
      <td className={styles.workforce}>{site.workforce}</td>
      <td>
        <ConformityBadge level={site.conformity} size="sm" />
      </td>
      <td className={styles.activity}>
        {site.lastCollectionAt ? formatRelativeTime(site.lastCollectionAt) : '—'}
      </td>
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
