import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ClipboardList,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Input,
  Tabs,
  Skeleton,
  EmptyState,
  Select,
} from '@/components/common';
import { useCollections } from '../hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import { useAuth } from '@/app/providers/AuthProvider';
import { mockUsers } from '@/mocks/fixtures/users';
import { CollectionRow } from '../components/CollectionRow';
import { STATUS_LABEL, type CollectionStatus } from '../api/collection.types';
import styles from './CollectionsListPage.module.css';

const TABS: Array<{ value: 'all' | CollectionStatus; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'draft', label: STATUS_LABEL.draft },
  { value: 'pending_sync', label: STATUS_LABEL.pending_sync },
  { value: 'submitted', label: STATUS_LABEL.submitted },
  { value: 'needs_correction', label: STATUS_LABEL.needs_correction },
  { value: 'validated', label: STATUS_LABEL.validated },
  { value: 'rejected', label: STATUS_LABEL.rejected },
];

export function CollectionsListPage() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<'all' | CollectionStatus>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const isAgent = role === 'agent';

  const { data: sitesData } = useSites();
  const { data, isLoading } = useCollections({
    agentId: isAgent ? user?.id : undefined,
    status: tab === 'all' ? undefined : tab,
    siteId: siteFilter === 'all' ? undefined : siteFilter,
  });

  const sitesById = useMemo(() => {
    const map = new Map<string, { id: string; shortName: string; city: string }>();
    sitesData?.items.forEach((s) =>
      map.set(s.id, { id: s.id, shortName: s.shortName, city: s.location.city }),
    );
    return map;
  }, [sitesData]);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (dateRange !== 'all') {
      const days = Number(dateRange);
      const cutoff = Date.now() - days * 86_400_000;
      items = items.filter((c) => new Date(c.collectedAt).getTime() >= cutoff);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      items = items.filter((c) => {
        const site = sitesById.get(c.siteId);
        return c.id.toLowerCase().includes(s) || site?.shortName.toLowerCase().includes(s);
      });
    }
    return items;
  }, [data, q, dateRange, sitesById]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: data?.items.length ?? 0 };
    data?.items.forEach((c) => {
      map[c.status] = (map[c.status] ?? 0) + 1;
    });
    return map;
  }, [data]);

  const tabsWithBadge = TABS.map((t) => ({
    ...t,
    badge: counts[t.value] ? counts[t.value] : undefined,
  }));

  /* Reset page quand les filtres changent */
  useEffect(() => {
    setPage(1);
  }, [tab, siteFilter, dateRange, q]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const rangeFrom = filteredItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(safePage * PAGE_SIZE, filteredItems.length);

  const visiblePages: number[] = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, 5];
    if (safePage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2];
  })();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            {isAgent ? 'Mes collectes' : 'Suivi des collectes'}
          </span>
          <h1 className={styles.heroTitle}>
            {isAgent ? 'Mes collectes terrain' : 'Collectes'}
          </h1>
        </div>
        <div className={styles.heroActions}>
          <Link to="/collecte/import">
            <Button variant="primary" iconLeft={<FileSpreadsheet size={16} />}>
              Importer depuis Kobo
            </Button>
          </Link>
          {!isAgent ? <Button variant="ghost">Exporter (CSV)</Button> : null}
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Filtres collectes">
        <div className={styles.searchInput}>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par identifiant ou site…"
            prefix={<Search size={16} />}
            aria-label="Rechercher une collecte"
          />
        </div>
        <Select<string>
          value={siteFilter}
          onChange={setSiteFilter}
          options={[
            { value: 'all', label: 'Tous les sites' },
            ...(sitesData?.items.map((s) => ({ value: s.id, label: s.shortName })) ?? []),
          ]}
          aria-label="Filtrer par site"
        />
        <Select<typeof dateRange>
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: 'all', label: 'Toutes périodes' },
            { value: '7', label: '7 derniers jours' },
            { value: '30', label: '30 derniers jours' },
            { value: '90', label: '90 derniers jours' },
          ]}
          aria-label="Filtrer par période"
        />
      </section>

      <Tabs value={tab} onChange={setTab} items={tabsWithBadge} aria-label="Filtre par statut" />

      <div className={styles.list}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={68} radius={10} />)
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Aucune collecte trouvée"
            description="Importez depuis Kobo ou ajustez les filtres."
            action={
              <Link to="/collecte/import">
                <Button variant="primary" iconLeft={<FileSpreadsheet size={16} />}>
                  Importer depuis Kobo
                </Button>
              </Link>
            }
          />
        ) : (
          pageItems.map((c) => (
            <CollectionRow
              key={c.id}
              collection={c}
              site={sitesById.get(c.siteId)}
              agentName={usersById.get(c.agentId)}
              href={`/collecte/${c.id}`}
            />
          ))
        )}
      </div>

      {filteredItems.length > PAGE_SIZE ? (
        <nav className={styles.pagination} aria-label="Pagination des collectes">
          <span className={styles.paginationInfo}>
            {rangeFrom}–{rangeTo} sur {filteredItems.length}
          </span>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Page précédente"
            >
              <ChevronLeft size={14} />
            </button>
            {visiblePages[0] !== 1 ? (
              <>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage(1)}
                >
                  1
                </button>
                <span style={{ color: 'var(--color-text-muted)' }}>…</span>
              </>
            ) : null}
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageButton} ${p === safePage ? styles.pageButtonActive : ''}`}
                onClick={() => setPage(p)}
                aria-current={p === safePage ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            {visiblePages[visiblePages.length - 1] !== totalPages ? (
              <>
                <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
