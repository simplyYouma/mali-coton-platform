import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
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

const ROLE_OPTIONS = [
  { value: 'admin' as UserRole, label: 'Administrateur' },
  { value: 'superviseur' as UserRole, label: 'Superviseur' },
  { value: 'agent' as UserRole, label: 'Agent terrain' },
  { value: 'lab' as UserRole, label: 'Agent laboratoire' },
  { value: 'visitor' as UserRole, label: 'Observateur' },
];

const ROLE_VARIANT: Record<UserRole, 'success' | 'info' | 'warning' | 'neutral'> = {
  admin: 'warning',
  superviseur: 'info',
  agent: 'success',
  lab: 'info',
  visitor: 'neutral',
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  agent: 'Agent terrain',
  lab: 'Agent laboratoire',
  visitor: 'Observateur',
};

interface FormState {
  email: string;
  fullName: string;
  role: UserRole;
  assignedSiteIds: string[];
  locale: 'fr';
}

const EMPTY_FORM: FormState = {
  email: '',
  fullName: '',
  role: 'agent',
  assignedSiteIds: [],
  locale: 'fr',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UsersPage() {
  const toast = useToast();
  const { data: usersPage, isLoading } = useUsers();
  const { data: sitesPage } = useSites();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const sitesList = useMemo(() => sitesPage?.items ?? [], [sitesPage]);
  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesList.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesList]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (user: ManagedUser) => {
    setForm({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedSiteIds: user.assignedSiteIds,
      locale: 'fr',
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
      toast.error('Email et nom complet obligatoires.');
      return;
    }
    if (form.role === 'agent' && form.assignedSiteIds.length === 0) {
      toast.error('Un agent doit être affecté à au moins un site.');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: form });
        toast.success('Utilisateur mis à jour.');
      } else {
        await createMut.mutateAsync(form);
        toast.success('Utilisateur créé. Un email d\'activation sera envoyé.');
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'opération.');
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (
      !window.confirm(
        `Supprimer définitivement ${user.fullName} ? Cette action est tracée dans le journal d'audit.`,
      )
    ) {
      return;
    }
    try {
      await deleteMut.mutateAsync(user.id);
      toast.success('Utilisateur supprimé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  const users = usersPage?.items ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description="Gestion des comptes et attribution des sites par rôle."
        actions={
          <Button variant="primary" iconLeft={<UserPlus size={16} />} onClick={openCreate}>
            Nouvel utilisateur
          </Button>
        }
      />

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur"
            description="Créez le premier compte pour démarrer."
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
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
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
                    <Badge variant={ROLE_VARIANT[user.role]} size="sm">
                      {ROLE_LABEL[user.role]}
                    </Badge>
                  </td>
                  <td>
                    {user.assignedSiteIds.length === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>Tous (admin)</span>
                    ) : (
                      <div className={styles.sitesCell}>
                        {user.assignedSiteIds.slice(0, 3).map((id) => (
                          <Badge key={id} variant="neutral" size="sm">
                            {sitesById.get(id) ?? id}
                          </Badge>
                        ))}
                        {user.assignedSiteIds.length > 3 ? (
                          <Badge variant="neutral" size="sm">
                            +{user.assignedSiteIds.length - 3}
                          </Badge>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    {user.lastLoginAt ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {formatRelativeTime(user.lastLoginAt)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm" dot>
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <IconButton
                        aria-label={`Modifier ${user.fullName}`}
                        variant="ghost"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        aria-label={`Supprimer ${user.fullName}`}
                        variant="ghost"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        width={640}
      >
        <div className={styles.formGrid}>
          <FormField label="Nom complet" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Ex : Aïcha Touré"
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="prenom.nom@sahel.com"
            />
          </FormField>
          <FormField label="Rôle" required>
            <Select
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(role) => setForm((f) => ({ ...f, role }))}
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField
              label="Sites affectés"
              hint={
                form.role === 'admin'
                  ? "Un admin a accès à tous les sites — sélection ignorée."
                  : 'Sites sur lesquels l\'utilisateur peut agir.'
              }
              required={form.role === 'agent'}
            >
              <div className={styles.checklist}>
                {sitesList.length === 0 ? (
                  <span style={{ color: 'var(--color-text-muted)' }}>Aucun site disponible.</span>
                ) : (
                  sitesList.map((site) => (
                    <Checkbox
                      key={site.id}
                      checked={form.assignedSiteIds.includes(site.id)}
                      onChange={() => toggleSite(site.id)}
                      disabled={form.role === 'admin'}
                      label={`${site.shortName} — ${site.location.commune}`}
                    />
                  ))
                )}
              </div>
            </FormField>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={closeModal}>
            Annuler
          </Button>
          <Button
            variant="primary"
            iconLeft={<Plus size={16} />}
            onClick={handleSubmit}
            loading={createMut.isPending || updateMut.isPending}
          >
            {editing ? 'Enregistrer' : 'Créer le compte'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
