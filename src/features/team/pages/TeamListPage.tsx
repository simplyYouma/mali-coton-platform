import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Smartphone,
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
import type { ManagedUser } from '@/features/admin/api/admin.types';
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
      toast.success('Agent ajouté — un e-mail d\'activation lui sera envoyé.');
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
          <span className={styles.heroEyebrow}>Référentiel agents</span>
          <h1 className={styles.heroTitle}>Équipe de terrain</h1>
          <p className={styles.heroSubtitle}>
            Les agents ne consultent pas la plateforme — leurs coordonnées ici
            servent à les notifier (e-mail / SMS) et à les relier aux soumissions Kobo.
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{agents.length}</span>
            <span className={styles.heroStatLabel}>
              agent{agents.length > 1 ? 's' : ''} actif{agents.length > 1 ? 's' : ''}
            </span>
          </div>
          <Button
            variant="primary"
            iconLeft={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Ajouter un agent
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, e-mail ou compte Kobo…"
            aria-label="Rechercher un agent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} radius={12} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={32} />}
          title="Aucun agent"
          description="Ajoutez un premier agent pour démarrer le suivi terrain."
        />
      ) : (
        <ul className={styles.grid}>
          {filtered.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              collectionsCount={collectionsByAgent.get(a.id) ?? 0}
              sitesById={sitesById}
            />
          ))}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un agent"
        description="Les champs seront utilisés pour le notifier (e-mail / SMS) et l'associer à ses soumissions Kobo."
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={createMut.isPending}
              iconLeft={<UserCheck size={14} />}
            >
              Créer l'agent
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
          <FormField label="Mobile (E.164)">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+22376112233"
            />
          </FormField>
          <FormField label="Compte Kobo" hint="Identifiant utilisé par l'agent dans Kobo Toolbox.">
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

interface AgentCardProps {
  agent: ManagedUser;
  collectionsCount: number;
  sitesById: Map<string, string>;
}

function AgentCard({ agent, collectionsCount, sitesById }: AgentCardProps) {
  return (
    <li>
      <Link to={`/equipe/${agent.id}`} className={styles.card}>
        <header className={styles.cardHead}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(agent.fullName)}
          </span>
          <div className={styles.cardTitleBlock}>
            <span className={styles.cardName}>{agent.fullName}</span>
            <span className={styles.cardSubtitle}>
              {agent.koboUsername ? `@${agent.koboUsername}` : 'Sans compte Kobo'}
            </span>
          </div>
          <Badge variant={agent.isActive ? 'success' : 'neutral'} size="sm">
            {agent.isActive ? 'Actif' : 'Désactivé'}
          </Badge>
        </header>
        <dl className={styles.cardMeta}>
          <div className={styles.cardMetaRow}>
            <dt>
              <Mail size={12} aria-hidden="true" />
            </dt>
            <dd>{agent.email}</dd>
          </div>
          {agent.phone ? (
            <div className={styles.cardMetaRow}>
              <dt>
                <Phone size={12} aria-hidden="true" />
              </dt>
              <dd>{agent.phone}</dd>
            </div>
          ) : null}
          <div className={styles.cardMetaRow}>
            <dt>
              <MapPin size={12} aria-hidden="true" />
            </dt>
            <dd>
              {agent.assignedSiteIds.length === 0
                ? 'Aucun site'
                : agent.assignedSiteIds
                    .map((id) => sitesById.get(id) ?? id)
                    .join(' · ')}
            </dd>
          </div>
        </dl>
        <footer className={styles.cardFooter}>
          <span className={styles.cardFooterStat}>
            <Smartphone size={12} aria-hidden="true" />
            {collectionsCount} collecte{collectionsCount > 1 ? 's' : ''}
          </span>
          <span className={styles.cardFooterAction}>Voir la fiche →</span>
        </footer>
      </Link>
    </li>
  );
}
