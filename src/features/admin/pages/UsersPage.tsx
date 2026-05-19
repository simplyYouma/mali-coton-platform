import { useMemo, useState } from 'react';
import { Mail, Pencil, Phone, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  IconButton,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { formatRelativeTime } from '@/lib/format';
import type { UserRole } from '@/types/common';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '../hooks/useAdmin';
import type { ManagedUser } from '../api/admin.types';
import styles from './UsersPage.module.css';

/** Rôles éligibles à la connexion plateforme. Agents et labos sont exclus
 *  (ils n'accèdent pas à la plateforme, voir docs/CAHIER_PROJET.md §1.2). */
type LoginableRole = 'admin' | 'superviseur' | 'visitor';

const ROLE_OPTIONS: Array<{ value: LoginableRole; label: string }> = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'superviseur', label: 'Superviseur' },
  { value: 'visitor', label: 'Observateur' },
];

const ROLE_VARIANT: Record<LoginableRole, 'warning' | 'info' | 'neutral'> = {
  admin: 'warning',
  superviseur: 'info',
  visitor: 'neutral',
};

const ROLE_LABEL: Record<LoginableRole, string> = {
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  visitor: 'Observateur',
};

interface FormState {
  email: string;
  fullName: string;
  role: LoginableRole;
  assignedSiteIds: string[];
  locale: 'fr';
  phone: string;
}

const EMPTY_FORM: FormState = {
  email: '',
  fullName: '',
  role: 'superviseur',
  assignedSiteIds: [],
  locale: 'fr',
  phone: '',
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

type RoleFilter = 'all' | LoginableRole;

export function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: usersPage, isLoading } = useUsers();
  const { data: sitesPage } = useSites();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [query, setQuery] = useState('');

  const sitesList = useMemo(() => sitesPage?.items ?? [], [sitesPage]);
  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesList.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesList]);

  /** Filtre des utilisateurs : exclut les agents et labos (non-loginables). */
  const allUsers = useMemo(
    () =>
      (usersPage?.items ?? []).filter(
        (u) => u.role !== 'agent' && u.role !== 'lab',
      ),
    [usersPage],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (
        q &&
        !u.fullName.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [allUsers, roleFilter, query]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (user: ManagedUser) => {
    setForm({
      email: user.email,
      fullName: user.fullName,
      role: user.role as LoginableRole,
      assignedSiteIds: user.assignedSiteIds,
      locale: 'fr',
      phone: user.phone ?? '',
    });
    setEditing(user);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const toggleSite = (siteId: string) => {
    setForm((f) => ({
      ...f,
      assignedSiteIds: f.assignedSiteIds.includes(siteId)
        ? f.assignedSiteIds.filter((id) => id !== siteId)
        : [...f.assignedSiteIds, siteId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.fullName.trim()) {
      toast.error('E-mail et nom complet obligatoires.');
      return;
    }
    if (form.role === 'superviseur' && form.assignedSiteIds.length === 0) {
      toast.error('Un superviseur doit être affecté à au moins un site.');
      return;
    }
    try {
      const payload = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        assignedSiteIds: form.assignedSiteIds,
        locale: form.locale,
        phone: form.phone.trim() || undefined,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: payload });
        toast.success('Utilisateur mis à jour.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Utilisateur créé.');
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    const next = !user.isActive;
    try {
      await updateMut.mutateAsync({ id: user.id, patch: { isActive: next } });
      toast.success(
        next
          ? `${user.fullName} réactivé — accès rétabli.`
          : `${user.fullName} désactivé — accès suspendu.`,
      );
      // Si on est en train d'éditer cet user, mettre à jour la référence locale
      if (editing && editing.id === user.id) {
        setEditing({ ...editing, isActive: next });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    const ok = await confirm({
      title: `Supprimer ${user.fullName} ?`,
      message: 'Suppression définitive. L\'action est tracée dans le journal d\'audit.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(user.id);
      toast.success('Utilisateur supprimé.');
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const totalActive = allUsers.filter((u) => u.isActive).length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Utilisateurs</h1>
          <span className={styles.heroCount}>
            {totalActive} actif{totalActive > 1 ? 's' : ''} · {allUsers.length} au total
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
              aria-label="Rechercher un utilisateur"
            />
          </div>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Ajouter
          </Button>
        </div>
      </header>

      <div className={styles.chips} role="tablist" aria-label="Filtrer par rôle">
        <button
          type="button"
          className={`${styles.chip} ${roleFilter === 'all' ? styles.chipActive : ''}`}
          onClick={() => setRoleFilter('all')}
        >
          Tous
        </button>
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`${styles.chip} ${roleFilter === r.value ? styles.chipActive : ''}`}
            onClick={() => setRoleFilter(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur"
            description={
              query || roleFilter !== 'all'
                ? 'Aucun utilisateur ne correspond aux filtres.'
                : 'Créez le premier compte pour démarrer.'
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Sites affectés</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const role = user.role as LoginableRole;
                return (
                  <tr
                    key={user.id}
                    className={styles.row}
                    onClick={() => openEdit(user)}
                  >
                    <td>
                      <div className={styles.user}>
                        <span className={styles.avatar} aria-hidden="true">
                          {initials(user.fullName)}
                        </span>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{user.fullName}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={ROLE_VARIANT[role]} size="sm">
                        {ROLE_LABEL[role]}
                      </Badge>
                    </td>
                    <td>
                      {user.assignedSiteIds.length === 0 ? (
                        <span className={styles.muted}>
                          {user.role === 'admin' ? 'Tous (admin)' : '—'}
                        </span>
                      ) : (
                        <span className={styles.sitesList}>
                          {user.assignedSiteIds
                            .map((id) => sitesById.get(id) ?? id)
                            .join(' · ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {user.lastLoginAt ? (
                        <span className={styles.muted}>
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      ) : (
                        <span className={styles.disabled}>jamais</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                        {user.isActive ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Détail / édition utilisateur */}
      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? editing.fullName : 'Nouvel utilisateur'}
        width={640}
        footer={
          <>
            {editing ? (
              <Button
                variant="ghost"
                iconLeft={<Trash2 size={14} />}
                onClick={() => handleDelete(editing)}
                loading={deleteMut.isPending}
              >
                Supprimer
              </Button>
            ) : null}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={closeModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              iconLeft={editing ? <Pencil size={14} /> : <Plus size={14} />}
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className={styles.detailHeader}>
            <span className={styles.detailAvatar} aria-hidden="true">
              {initials(editing.fullName)}
            </span>
            <div className={styles.detailMain}>
              <div className={styles.detailContactRow}>
                <a href={`mailto:${editing.email}`} className={styles.detailLink}>
                  <Mail size={12} aria-hidden="true" />
                  {editing.email}
                </a>
                {editing.phone ? (
                  <a href={`tel:${editing.phone}`} className={styles.detailLink}>
                    <Phone size={12} aria-hidden="true" />
                    {editing.phone}
                  </a>
                ) : null}
              </div>
              <div className={styles.detailMeta}>
                {editing.lastLoginAt
                  ? `Connecté ${formatRelativeTime(editing.lastLoginAt)}`
                  : 'Jamais connecté'}
              </div>
            </div>
            <div className={styles.detailToggle}>
              <Switch
                checked={editing.isActive}
                onChange={() => void handleToggleActive(editing)}
                label={editing.isActive ? 'Compte actif' : 'Compte désactivé'}
                aria-label="Activer ou désactiver l'accès"
              />
              <span className={styles.detailToggleHint}>
                {editing.isActive ? (
                  <>
                    <UserCheck size={11} aria-hidden="true" /> Accès autorisé
                  </>
                ) : (
                  <>
                    <UserX size={11} aria-hidden="true" /> Accès suspendu
                  </>
                )}
              </span>
            </div>
          </div>
        ) : null}

        <div className={styles.formGrid}>
          <FormField label="Nom complet" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Ex : Awa Diarra"
            />
          </FormField>
          <FormField label="E-mail" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="prenom.nom@pnud.org"
            />
          </FormField>
          <FormField label="Rôle" required>
            <Select<LoginableRole>
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(role) => setForm((f) => ({ ...f, role }))}
            />
          </FormField>
          <FormField label="Mobile">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+22376112233"
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField
              label="Sites affectés"
              required={form.role === 'superviseur'}
              hint={form.role === 'admin' ? "Un admin a accès à tous les sites." : undefined}
            >
              <div className={styles.checklist}>
                {sitesList.map((site) => (
                  <Checkbox
                    key={site.id}
                    checked={form.assignedSiteIds.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                    disabled={form.role === 'admin'}
                    label={`${site.shortName} — ${site.location.commune}`}
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
