import { useMemo, useState } from 'react';
import { FileSpreadsheet, Mail, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Switch,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatRelativeTime } from '@/lib/format';
import {
  useCreateUser,
  useDeleteUser,
  useRoles,
  useUpdateUser,
  useUsers,
} from '../hooks/useAdmin';
import type { BackendRole, ManagedUser } from '../api/admin.types';
import type { UserCreateInput } from '../api/admin.types';
import styles from './UsersPage.module.css';

interface FormState {
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  roleIris: string[];
}

const EMPTY_FORM: FormState = {
  nom: '',
  prenom: '',
  email: '',
  actif: true,
  roleIris: [],
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

function resolveRoleLabels(roleIris: string[], rolesMap: Map<string, BackendRole>): string {
  if (!roleIris.length) return '—';
  return roleIris.map((iri) => rolesMap.get(iri)?.libelle ?? iri).join(', ');
}

export function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: usersPage, isLoading } = useUsers();
  const { data: rolesData = [] } = useRoles();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [query, setQuery] = useState('');

  const rolesMap = useMemo(() => {
    const m = new Map<string, BackendRole>();
    rolesData.forEach((r) => {
      if (r['@id']) m.set(r['@id'], r);
    });
    return m;
  }, [rolesData]);

  const allUsers = useMemo(() => usersPage?.items ?? [], [usersPage]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleIris.some((iri) =>
          (rolesMap.get(iri)?.libelle ?? '').toLowerCase().includes(q),
        ),
    );
  }, [allUsers, query, rolesMap]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (user: ManagedUser) => {
    setForm({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      actif: user.isActive,
      roleIris: user.roleIris,
    });
    setEditing(user);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const toggleRole = (iri: string) => {
    setForm((f) => ({
      ...f,
      roleIris: f.roleIris.includes(iri)
        ? f.roleIris.filter((r) => r !== iri)
        : [...f.roleIris, iri],
    }));
  };

  const handleSubmit = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast.error('Prénom et nom obligatoires.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('E-mail obligatoire.');
      return;
    }
    try {
      const payload: UserCreateInput = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        actif: form.actif,
        ...(form.roleIris.length > 0 && { roles: form.roleIris }),
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
      await updateMut.mutateAsync({ id: user.id, patch: { actif: next } });
      toast.success(
        next
          ? `${user.fullName} réactivé — accès rétabli.`
          : `${user.fullName} désactivé — accès suspendu.`,
      );
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
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Utilisateurs</h1>
          <span className={styles.heroCount}>
            {totalActive} actif{totalActive > 1 ? 's' : ''} · {allUsers.length} au total
          </span>
          <p className={styles.heroDescription}>
            Gestion des comptes plateforme et des rôles associés.
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, e-mail ou rôle…"
              aria-label="Rechercher un utilisateur"
            />
          </div>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            disabled={filtered.length === 0}
            onClick={() => {
              exportRowsToXlsx({
                filename: 'utilisateurs',
                sheetName: 'Utilisateurs',
                columns: [
                  { header: 'ID', accessor: (u) => u.id },
                  { header: 'Prénom', accessor: (u) => u.prenom },
                  { header: 'Nom', accessor: (u) => u.nom },
                  { header: 'E-mail', accessor: (u) => u.email },
                  { header: 'Rôles', accessor: (u) => resolveRoleLabels(u.roleIris, rolesMap) },
                  { header: 'Statut', accessor: (u) => (u.isActive ? 'Actif' : 'Inactif') },
                  { header: 'Créé le', accessor: (u) => u.createdAt ?? '' },
                ],
                rows: filtered,
              });
            }}
          >
            Exporter XLSX
          </Button>
          <Button variant="success" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Ajouter
          </Button>
        </div>
      </header>

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
              query
                ? 'Aucun utilisateur ne correspond à la recherche.'
                : 'Créez le premier compte pour démarrer.'
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle(s)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
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
                    {user.roleIris.length === 0 ? (
                      <span className={styles.muted}>Aucun rôle</span>
                    ) : (
                      <div className={styles.rolesList}>
                        {user.roleIris.map((iri) => (
                          <Badge key={iri} variant="info" size="sm">
                            {rolesMap.get(iri)?.libelle ?? iri}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </Badge>
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
        title={editing ? editing.fullName : 'Nouvel utilisateur'}
        width={560}
        footer={
          <>
            {editing ? (
              <Button
                variant="ghost-danger"
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
              variant="success"
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
              </div>
              <div className={styles.detailMeta}>
                {editing.createdAt
                  ? `Créé ${formatRelativeTime(editing.createdAt)}`
                  : ''}
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
                  <><UserCheck size={11} aria-hidden="true" /> Accès autorisé</>
                ) : (
                  <><UserX size={11} aria-hidden="true" /> Accès suspendu</>
                )}
              </span>
            </div>
          </div>
        ) : null}

        <div className={styles.formGrid}>
          <FormField label="Prénom" required>
            <Input
              value={form.prenom}
              onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
              placeholder="Ex : Awa"
            />
          </FormField>
          <FormField label="Nom" required>
            <Input
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Ex : Diarra"
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField label="E-mail" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="prenom.nom@pnud.org"
              />
            </FormField>
          </div>
          <div className={styles.formGridFull}>
            <FormField
              label="Rôles"
              hint={rolesData.length === 0 ? 'Aucun rôle défini — créez des rôles d\'abord.' : undefined}
            >
              <div className={styles.checklist}>
                {rolesData.map((role) => (
                  <Checkbox
                    key={String(role.id)}
                    checked={form.roleIris.includes(role['@id'] ?? '')}
                    onChange={() => toggleRole(role['@id'] ?? '')}
                    label={role.libelle}
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
