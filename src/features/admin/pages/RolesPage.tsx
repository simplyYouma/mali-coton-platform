import { useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Textarea,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
  useCreatePermission,
  useCreateRole,
  useDeletePermission,
  useDeleteRole,
  usePermissions,
  useRoles,
  useUpdatePermission,
  useUpdateRole,
} from '../hooks/useAdmin';
import type { BackendPermission, BackendRole } from '../api/admin.types';
import type { PermissionCreateInput, RoleCreateInput } from '../api/admin.types';
import styles from './RolesPage.module.css';

type Tab = 'roles' | 'permissions';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/* ── Formulaire rôle ── */
interface RoleForm { libelle: string; code: string; description: string; permissionIris: string[] }
const EMPTY_ROLE: RoleForm = { libelle: '', code: '', description: '', permissionIris: [] };

/* ── Formulaire permission ── */
interface PermForm { libelle: string; code: string; description: string }
const EMPTY_PERM: PermForm = { libelle: '', code: '', description: '' };

export function RolesPage() {
  const [tab, setTab] = useState<Tab>('roles');

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Rôles &amp; permissions</h1>
          <p className={styles.heroDescription}>
            Gérez les rôles du système et les permissions qui leur sont associées.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'roles'}
          className={`${styles.tab} ${tab === 'roles' ? styles.tabActive : ''}`}
          onClick={() => setTab('roles')}
        >
          <ShieldCheck size={14} />
          Rôles
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'permissions'}
          className={`${styles.tab} ${tab === 'permissions' ? styles.tabActive : ''}`}
          onClick={() => setTab('permissions')}
        >
          <KeyRound size={14} />
          Permissions
        </button>
      </div>

      {tab === 'roles' ? <RolesPanel /> : <PermissionsPanel />}
    </div>
  );
}

/* ════════════════════════════════════════
   Panel Rôles
════════════════════════════════════════ */
function RolesPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: roles = [], isLoading } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();

  const [editing, setEditing] = useState<BackendRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<RoleForm>(EMPTY_ROLE);

  const permsMap = useMemo(() => {
    const m = new Map<string, BackendPermission>();
    permissions.forEach((p) => { if (p['@id']) m.set(p['@id'], p); });
    return m;
  }, [permissions]);

  const openCreate = () => { setForm(EMPTY_ROLE); setEditing(null); setCreating(true); };
  const openEdit = (r: BackendRole) => {
    setForm({ libelle: r.libelle, code: r.code, description: r.description ?? '', permissionIris: r.permissions ?? [] });
    setEditing(r);
    setCreating(false);
  };
  const closeModal = () => { setEditing(null); setCreating(false); };

  const togglePerm = (iri: string) =>
    setForm((f) => ({
      ...f,
      permissionIris: f.permissionIris.includes(iri)
        ? f.permissionIris.filter((p) => p !== iri)
        : [...f.permissionIris, iri],
    }));

  const handleSubmit = async () => {
    if (!form.libelle.trim() || !form.code.trim()) {
      toast.error('Libellé et code obligatoires.');
      return;
    }
    const payload: RoleCreateInput = {
      libelle: form.libelle.trim(),
      code: form.code.trim(),
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.permissionIris.length > 0 && { permissions: form.permissionIris }),
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: String(editing.id), patch: payload });
        toast.success('Rôle mis à jour.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Rôle créé.');
      }
      closeModal();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Échec.'); }
  };

  const handleDelete = async (r: BackendRole) => {
    const ok = await confirm({
      title: `Supprimer le rôle "${r.libelle}" ?`,
      message: 'Les utilisateurs ayant ce rôle le perdront immédiatement.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(String(r.id));
      toast.success('Rôle supprimé.');
      closeModal();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Échec.'); }
  };

  return (
    <>
      <div className={styles.panelHeader}>
        <span className={styles.panelCount}>{roles.length} rôle{roles.length > 1 ? 's' : ''}</span>
        <Button variant="success" iconLeft={<Plus size={14} />} onClick={openCreate} size="sm">
          Ajouter un rôle
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.skeletons}><Skeleton height={48} /><Skeleton height={48} /></div>
        ) : roles.length === 0 ? (
          <EmptyState title="Aucun rôle" description="Créez le premier rôle pour commencer." />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Code</th>
                <th>Permissions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className={styles.row} onClick={() => openEdit(r)}>
                  <td className={styles.cellMain}>{r.libelle}</td>
                  <td><code className={styles.code}>{r.code}</code></td>
                  <td>
                    {(r.permissions ?? []).length === 0 ? (
                      <span className={styles.muted}>Aucune</span>
                    ) : (
                      <div className={styles.badges}>
                        {(r.permissions ?? []).slice(0, 3).map((iri) => (
                          <Badge key={iri} variant="info" size="sm">
                            {permsMap.get(iri)?.libelle ?? iri}
                          </Badge>
                        ))}
                        {(r.permissions ?? []).length > 3 && (
                          <Badge variant="neutral" size="sm">
                            +{(r.permissions ?? []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                      aria-label="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
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
        title={editing ? `Modifier · ${editing.libelle}` : 'Nouveau rôle'}
        width={520}
        footer={
          <>
            {editing && (
              <Button
                variant="ghost-danger"
                iconLeft={<Trash2 size={14} />}
                onClick={() => handleDelete(editing)}
                loading={deleteMut.isPending}
              >
                Supprimer
              </Button>
            )}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
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
        <div className={styles.formGrid}>
          <FormField label="Libellé" required>
            <Input
              value={form.libelle}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, libelle: v, code: f.code || slugify(v) }));
              }}
              placeholder="Ex : Superviseur"
            />
          </FormField>
          <FormField label="Code" required>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="superviseur"
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description optionnelle du rôle…"
                rows={2}
              />
            </FormField>
          </div>
          <div className={styles.formGridFull}>
            <FormField
              label="Permissions"
              hint={permissions.length === 0 ? 'Aucune permission disponible — créez-en d\'abord.' : undefined}
            >
              <div className={styles.checklist}>
                {permissions.map((p) => (
                  <Checkbox
                    key={String(p.id)}
                    checked={form.permissionIris.includes(p['@id'] ?? '')}
                    onChange={() => togglePerm(p['@id'] ?? '')}
                    label={p.libelle}
                  />
                ))}
              </div>
            </FormField>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ════════════════════════════════════════
   Panel Permissions
════════════════════════════════════════ */
function PermissionsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: permissions = [], isLoading } = usePermissions();
  const createMut = useCreatePermission();
  const updateMut = useUpdatePermission();
  const deleteMut = useDeletePermission();

  const [editing, setEditing] = useState<BackendPermission | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PermForm>(EMPTY_PERM);

  const openCreate = () => { setForm(EMPTY_PERM); setEditing(null); setCreating(true); };
  const openEdit = (p: BackendPermission) => {
    setForm({ libelle: p.libelle, code: p.code, description: p.description ?? '' });
    setEditing(p);
    setCreating(false);
  };
  const closeModal = () => { setEditing(null); setCreating(false); };

  const handleSubmit = async () => {
    if (!form.libelle.trim() || !form.code.trim()) {
      toast.error('Libellé et code obligatoires.');
      return;
    }
    const payload: PermissionCreateInput = {
      libelle: form.libelle.trim(),
      code: form.code.trim(),
      ...(form.description.trim() && { description: form.description.trim() }),
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: String(editing.id), patch: payload });
        toast.success('Permission mise à jour.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Permission créée.');
      }
      closeModal();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Échec.'); }
  };

  const handleDelete = async (p: BackendPermission) => {
    const ok = await confirm({
      title: `Supprimer la permission "${p.libelle}" ?`,
      message: 'Elle sera retirée de tous les rôles qui l\'utilisent.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(String(p.id));
      toast.success('Permission supprimée.');
      closeModal();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Échec.'); }
  };

  return (
    <>
      <div className={styles.panelHeader}>
        <span className={styles.panelCount}>{permissions.length} permission{permissions.length > 1 ? 's' : ''}</span>
        <Button variant="success" iconLeft={<Plus size={14} />} onClick={openCreate} size="sm">
          Ajouter une permission
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.skeletons}><Skeleton height={48} /><Skeleton height={48} /></div>
        ) : permissions.length === 0 ? (
          <EmptyState title="Aucune permission" description="Créez les permissions atomiques avant d'en assigner aux rôles." />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Code</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id} className={styles.row} onClick={() => openEdit(p)}>
                  <td className={styles.cellMain}>{p.libelle}</td>
                  <td><code className={styles.code}>{p.code}</code></td>
                  <td className={styles.muted}>{p.description ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      aria-label="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
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
        title={editing ? `Modifier · ${editing.libelle}` : 'Nouvelle permission'}
        width={480}
        footer={
          <>
            {editing && (
              <Button
                variant="ghost-danger"
                iconLeft={<Trash2 size={14} />}
                onClick={() => handleDelete(editing)}
                loading={deleteMut.isPending}
              >
                Supprimer
              </Button>
            )}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
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
        <div className={styles.formGrid}>
          <FormField label="Libellé" required>
            <Input
              value={form.libelle}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, libelle: v, code: f.code || slugify(v) }));
              }}
              placeholder="Ex : Voir les collectes"
            />
          </FormField>
          <FormField label="Code" required>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="voir_collectes"
            />
          </FormField>
          <div className={styles.formGridFull}>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description optionnelle…"
                rows={2}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </>
  );
}
