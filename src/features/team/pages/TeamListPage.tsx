import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  UserCheck,
  Users as UsersIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useCreateUser, useUsers } from '@/features/admin/hooks/useAdmin';
import styles from './TeamListPage.module.css';

interface AgentFormState {
  fullName: string;
  email: string;
  phone: string;
  koboUsername: string;
  assignedSiteIds: string[];
}

const EMPTY_FORM: AgentFormState = {
  fullName: '',
  email: '',
  phone: '',
  koboUsername: '',
  assignedSiteIds: [],
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TeamListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: usersPage, isLoading } = useUsers();
  const { data: sitesPage } = useSites();
  const { data: collectionsPage } = useCollections();
  const createMut = useCreateUser();

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<AgentFormState>(EMPTY_FORM);

  const agents = useMemo(
    () => (usersPage?.items ?? []).filter((u) => u.role === 'agent'),
    [usersPage],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.koboUsername ?? '').toLowerCase().includes(q),
    );
  }, [agents, query]);

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    (sitesPage?.items ?? []).forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const collectionsByAgent = useMemo(() => {
    const map = new Map<string, number>();
    (collectionsPage?.items ?? []).forEach((c) => {
      map.set(c.agentId, (map.get(c.agentId) ?? 0) + 1);
    });
    return map;
  }, [collectionsPage]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Nom et e-mail obligatoires.');
      return;
    }
    if (form.assignedSiteIds.length === 0) {
      toast.error('Affectez l\'agent à au moins un site.');
      return;
    }
    try {
      await createMut.mutateAsync({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: 'agent',
        assignedSiteIds: form.assignedSiteIds,
        locale: 'fr',
        phone: form.phone.trim() || undefined,
        koboUsername: form.koboUsername.trim() || undefined,
      });
      toast.success('Agent ajouté.');
      setForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création.');
    }
  };

  const toggleSite = (siteId: string) =>
    setForm((f) => ({
      ...f,
      assignedSiteIds: f.assignedSiteIds.includes(siteId)
        ? f.assignedSiteIds.filter((id) => id !== siteId)
        : [...f.assignedSiteIds, siteId],
    }));

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Agents</h1>
          <span className={styles.heroCount}>
            {agents.length} actif{agents.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un agent"
            />
          </div>
          <Button
            variant="success"
            iconLeft={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Ajouter
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.skeletonBlock}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={32} />}
          title="Aucun agent"
          description={query ? 'Aucun agent ne correspond à la recherche.' : 'Ajoutez un premier agent.'}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Contact</th>
                <th>Sites</th>
                <th className={styles.tdNumber}>Collectes</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const count = collectionsByAgent.get(a.id) ?? 0;
                const sites = a.assignedSiteIds.map((id) => sitesById.get(id) ?? id);
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/agents/${a.id}`)}
                    className={styles.row}
                  >
                    <td>
                      <div className={styles.agent}>
                        <span className={styles.avatar} aria-hidden="true">
                          {initials(a.fullName)}
                        </span>
                        <div className={styles.agentMain}>
                          <span className={styles.agentName}>{a.fullName}</span>
                          {a.koboUsername ? (
                            <span className={styles.agentKobo}>@{a.koboUsername}</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.contact}>
                        <span className={styles.contactMail}>{a.email}</span>
                        {a.phone ? (
                          <span className={styles.contactPhone}>{a.phone}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {sites.length === 0 ? (
                        <span className={styles.muted}>—</span>
                      ) : (
                        <span className={styles.sites}>{sites.join(' · ')}</span>
                      )}
                    </td>
                    <td className={styles.tdNumber}>{count}</td>
                    <td>
                      <Badge variant={a.isActive ? 'success' : 'neutral'} size="sm">
                        {a.isActive ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un agent"
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={handleCreate}
              loading={createMut.isPending}
              iconLeft={<UserCheck size={14} />}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Nom complet" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Ex : Aïcha Touré"
            />
          </FormField>
          <FormField label="E-mail" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="prenom.nom@sahel.com"
            />
          </FormField>
          <FormField label="Mobile">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+22376112233"
            />
          </FormField>
          <FormField label="Compte Kobo">
            <Input
              value={form.koboUsername}
              onChange={(e) => setForm((f) => ({ ...f, koboUsername: e.target.value }))}
              placeholder="prenom.nom"
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField label="Sites affectés" required>
              <div className={styles.checklist}>
                {(sitesPage?.items ?? []).map((s) => (
                  <Checkbox
                    key={s.id}
                    checked={form.assignedSiteIds.includes(s.id)}
                    onChange={() => toggleSite(s.id)}
                    label={`${s.shortName} — ${s.location.commune}`}
                  />
                ))}
              </div>
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
