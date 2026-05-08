import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Plus } from 'lucide-react';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Tabs,
  EmptyState,
  Skeleton,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useDeleteSite, useSites } from '../hooks/useSites';
import { SiteCard } from '../components/SiteCard';
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
        eyebrow={`${sites.length} site${sites.length > 1 ? 's' : ''} pilote${sites.length > 1 ? 's' : ''}`}
        title="Sites de teintureries"
        description="Cartographie et suivi des ateliers — ajoutez, modifiez ou retirez les sites du panel."
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
        <div className={styles.grid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={220} radius={14} />
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
        <div className={styles.grid}>
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onEdit={canManage ? openEdit : undefined}
              onDelete={canManage ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {canManage ? (
        <SiteForm open={formOpen} onClose={() => setFormOpen(false)} site={editing} />
      ) : null}
    </>
  );
}
