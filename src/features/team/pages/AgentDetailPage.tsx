import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Smartphone,
  Trash2,
  UserX,
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
import {
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '@/features/admin/hooks/useAdmin';
import type { ManagedUser } from '@/features/admin/api/admin.types';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { STATUS_LABEL, STATUS_VARIANT } from '@/features/collection/api/collection.types';
import styles from './AgentDetailPage.module.css';

interface EditFormState {
  fullName: string;
  email: string;
  phone: string;
  koboUsername: string;
  assignedSiteIds: string[];
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: usersPage, isLoading } = useUsers();
  const { data: sitesPage } = useSites();
  const { data: collectionsPage } = useCollections({ agentId: id });
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const agent = useMemo<ManagedUser | undefined>(
    () => (usersPage?.items ?? []).find((u) => u.id === id && u.role === 'agent'),
    [usersPage, id],
  );

  const sitesById = useMemo(() => {
    const map = new Map<string, { shortName: string; commune: string; city: string }>();
    (sitesPage?.items ?? []).forEach((s) =>
      map.set(s.id, {
        shortName: s.shortName,
        commune: s.location.commune,
        city: s.location.city,
      }),
    );
    return map;
  }, [sitesPage]);

  const collections = useMemo(
    () =>
      [...(collectionsPage?.items ?? [])].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      ),
    [collectionsPage],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EditFormState>({
    fullName: '',
    email: '',
    phone: '',
    koboUsername: '',
    assignedSiteIds: [],
  });

  const openEdit = () => {
    if (!agent) return;
    setForm({
      fullName: agent.fullName,
      email: agent.email,
      phone: agent.phone ?? '',
      koboUsername: agent.koboUsername ?? '',
      assignedSiteIds: agent.assignedSiteIds,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!agent) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Nom et e-mail obligatoires.');
      return;
    }
    if (form.assignedSiteIds.length === 0) {
      toast.error('Un agent doit être affecté à au moins un site.');
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: agent.id,
        patch: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          koboUsername: form.koboUsername.trim() || undefined,
          assignedSiteIds: form.assignedSiteIds,
        },
      });
      toast.success('Agent mis à jour.');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la mise à jour.');
    }
  };

  const toggleActive = async () => {
    if (!agent) return;
    try {
      await updateMut.mutateAsync({
        id: agent.id,
        patch: { isActive: !agent.isActive },
      });
      toast.success(agent.isActive ? 'Agent désactivé.' : 'Agent réactivé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    if (!window.confirm(`Supprimer définitivement ${agent.fullName} ? L'historique de ses collectes est conservé.`)) {
      return;
    }
    try {
      await deleteMut.mutateAsync(agent.id);
      toast.success('Agent supprimé.');
      navigate('/agents');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la suppression.');
    }
  };

  const toggleSite = (siteId: string) =>
    setForm((f) => ({
      ...f,
      assignedSiteIds: f.assignedSiteIds.includes(siteId)
        ? f.assignedSiteIds.filter((id) => id !== siteId)
        : [...f.assignedSiteIds, siteId],
    }));

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={48} />
        <Skeleton height={120} />
        <Skeleton height={240} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="Agent introuvable"
          description="Cet agent n'existe pas ou a été supprimé."
          action={
            <Link to="/agents">
              <Button variant="ghost" iconLeft={<ArrowLeft size={14} />}>
                Retour aux agents
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const stats = {
    total: collections.length,
    validated: collections.filter((c) => c.status === 'validated').length,
    pending: collections.filter(
      (c) => c.status === 'submitted' || c.status === 'lab_complete' || c.status === 'awaiting_lab',
    ).length,
    correction: collections.filter((c) => c.status === 'needs_correction').length,
  };

  return (
    <div className={styles.page}>
      <Link to="/agents" className={styles.back}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Tous les agents</span>
      </Link>

      <header className={styles.hero}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(agent.fullName)}
        </span>
        <div className={styles.heroMain}>
          <span className={styles.heroEyebrow}>
            Agent de terrain ·{' '}
            {agent.koboUsername ? (
              <code className={styles.koboTag}>@{agent.koboUsername}</code>
            ) : (
              'sans compte Kobo'
            )}
          </span>
          <h1 className={styles.heroTitle}>{agent.fullName}</h1>
          <div className={styles.heroMeta}>
            <a className={styles.heroMetaLink} href={`mailto:${agent.email}`}>
              <Mail size={12} aria-hidden="true" />
              {agent.email}
            </a>
            {agent.phone ? (
              <a className={styles.heroMetaLink} href={`tel:${agent.phone}`}>
                <Phone size={12} aria-hidden="true" />
                {agent.phone}
              </a>
            ) : null}
            <Badge variant={agent.isActive ? 'success' : 'neutral'} size="sm">
              {agent.isActive ? 'Compte actif' : 'Désactivé'}
            </Badge>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Button
            variant="secondary"
            iconLeft={<Pencil size={14} />}
            onClick={openEdit}
          >
            Modifier
          </Button>
          <Button
            variant="ghost"
            iconLeft={<UserX size={14} />}
            onClick={toggleActive}
            loading={updateMut.isPending}
          >
            {agent.isActive ? 'Désactiver' : 'Réactiver'}
          </Button>
          <Button
            variant="ghost"
            iconLeft={<Trash2 size={14} />}
            onClick={handleDelete}
            loading={deleteMut.isPending}
          >
            Supprimer
          </Button>
        </div>
      </header>

      <section className={styles.statGrid} aria-label="Résumé">
        <Stat label="Collectes" value={stats.total} />
        <Stat label="Validées" value={stats.validated} tone="success" />
        <Stat label="En attente" value={stats.pending} tone="info" />
        <Stat label="À corriger" value={stats.correction} tone="warning" />
      </section>

      <section className={styles.sitesSection} aria-label="Sites affectés">
        <h2 className={styles.sectionTitle}>
          <MapPin size={14} aria-hidden="true" /> Sites affectés
        </h2>
        {agent.assignedSiteIds.length === 0 ? (
          <p className={styles.empty}>Cet agent n'est affecté à aucun site.</p>
        ) : (
          <ul className={styles.siteList}>
            {agent.assignedSiteIds.map((siteId) => {
              const s = sitesById.get(siteId);
              return (
                <li key={siteId}>
                  <Link to={`/sites/${siteId}`} className={styles.siteChip}>
                    {s ? s.shortName : siteId}
                    {s ? (
                      <span className={styles.siteChipMeta}>
                        {s.commune}, {s.city}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.collectionsSection} aria-label="Collectes récentes">
        <h2 className={styles.sectionTitle}>
          <ClipboardList size={14} aria-hidden="true" /> Collectes récentes ·{' '}
          <span className={styles.sectionCount}>{collections.length}</span>
        </h2>
        {collections.length === 0 ? (
          <p className={styles.empty}>Aucune collecte enregistrée pour cet agent.</p>
        ) : (
          <table className={styles.collectionsTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>Statut</th>
                <th>Photos</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {collections.slice(0, 25).map((c) => {
                const site = sitesById.get(c.siteId);
                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.collectionDate}>
                        {formatDateTime(c.collectedAt, 'dd MMM yyyy · HH:mm')}
                      </span>
                      <span className={styles.collectionRel}>
                        {formatRelativeTime(c.collectedAt)}
                      </span>
                    </td>
                    <td>{site?.shortName ?? c.siteId}</td>
                    <td>
                      <Badge variant={STATUS_VARIANT[c.status]} size="sm">
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </td>
                    <td>{c.photos.length}</td>
                    <td>
                      <Link to={`/collecte/${c.id}`} className={styles.collectionLink}>
                        Détail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Modifier ${agent.fullName}`}
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={updateMut.isPending}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Nom complet" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </FormField>
          <FormField label="E-mail" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </FormField>
          <FormField label="Mobile (E.164)">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </FormField>
          <FormField label="Compte Kobo">
            <Input
              value={form.koboUsername}
              onChange={(e) => setForm((f) => ({ ...f, koboUsername: e.target.value }))}
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

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'info' | 'warning' }) {
  return (
    <div className={styles.stat} data-tone={tone ?? 'neutral'}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
