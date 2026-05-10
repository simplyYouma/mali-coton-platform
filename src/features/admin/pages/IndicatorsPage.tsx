import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  Button,
  FormField,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Switch,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import type { Indicator, IndicatorDomain } from '@/features/collection/api/collection.types';
import {
  useCreateIndicator,
  useDeleteIndicator,
  useIndicatorsAdmin,
  useUpdateIndicator,
} from '../hooks/useAdmin';
import type { IndicatorCreateInput } from '../api/admin';
import { refOptions } from '../lib/refData';
import styles from './IndicatorsPage.module.css';

const DOMAIN_LABEL: Record<IndicatorDomain, string> = {
  water: 'Eaux usées',
  soil: 'Sol',
  air: 'Air ambiant',
  waste: 'Déchets solides',
  health: 'Santé / SST',
  socio: 'Socio-économique',
};

const DOMAIN_OPTIONS: Array<{ value: IndicatorDomain; label: string }> = [
  { value: 'water', label: 'Eaux usées' },
  { value: 'soil', label: 'Sol' },
  { value: 'air', label: 'Air ambiant' },
  { value: 'waste', label: 'Déchets solides' },
  { value: 'health', label: 'Santé / SST' },
  { value: 'socio', label: 'Socio-économique' },
];

interface FormState {
  domain: IndicatorDomain;
  label: string;
  unit: string;
  method: string;
  source: string;
  minOk: string;
  maxOk: string;
  labOnly: boolean;
}

const EMPTY: FormState = {
  domain: 'water',
  label: '',
  unit: '',
  method: 'Saisie manuelle',
  source: '',
  minOk: '',
  maxOk: '',
  labOnly: false,
};

function fromIndicator(i: Indicator): FormState {
  return {
    domain: i.domain,
    label: i.label,
    unit: i.unit,
    method: i.method,
    source: i.source,
    minOk: i.minOk === undefined ? '' : String(i.minOk),
    maxOk: i.maxOk === undefined ? '' : String(i.maxOk),
    labOnly: !!i.labOnly,
  };
}

function toInput(f: FormState): IndicatorCreateInput {
  return {
    domain: f.domain,
    label: f.label.trim(),
    unit: f.unit.trim(),
    method: f.method.trim() || 'Saisie manuelle',
    source: f.source.trim() || 'Personnalisé (admin)',
    labOnly: f.labOnly,
    minOk: f.minOk.trim() === '' ? undefined : Number(f.minOk),
    maxOk: f.maxOk.trim() === '' ? undefined : Number(f.maxOk),
  };
}

export function IndicatorsPage() {
  const toast = useToast();
  const { data, isLoading } = useIndicatorsAdmin();
  const createMut = useCreateIndicator();
  const updateMut = useUpdateIndicator();
  const deleteMut = useDeleteIndicator();

  const [editing, setEditing] = useState<Indicator | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [filterDomain, setFilterDomain] = useState<IndicatorDomain | ''>('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (creating) setForm(EMPTY);
    else if (editing) setForm(fromIndicator(editing));
  }, [creating, editing]);

  const items = data?.items ?? [];

  const grouped = useMemo(() => {
    const map: Partial<Record<IndicatorDomain, Indicator[]>> = {};
    for (const i of items) {
      const isActive = i.isActive ?? true;
      if (!showInactive && !isActive) continue;
      if (filterDomain && i.domain !== filterDomain) continue;
      (map[i.domain] ??= []).push(i);
    }
    return map;
  }, [items, filterDomain, showInactive]);

  const totalActive = items.filter((i) => i.isActive ?? true).length;

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (i: Indicator) => {
    setCreating(false);
    setEditing(i);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) {
      toast.error('Le libellé est obligatoire.');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: toInput(form) });
        toast.success(`Indicateur ${form.label} mis à jour.`);
      } else {
        await createMut.mutateAsync(toInput(form));
        toast.success(`Indicateur ${form.label} créé.`);
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'opération.');
    }
  };

  const handleToggleActive = async (i: Indicator) => {
    const next = !(i.isActive ?? true);
    try {
      await updateMut.mutateAsync({ id: i.id, patch: { isActive: next } });
      toast.success(
        next
          ? `${i.label} réactivé — visible dans les nouvelles collectes.`
          : `${i.label} désactivé — masqué dans le wizard.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const handleDelete = async (i: Indicator) => {
    if (!i.isCustom) {
      toast.info('Seuls les indicateurs custom peuvent être supprimés. Désactivez ceux du référentiel.');
      return;
    }
    if (!window.confirm(`Supprimer l'indicateur "${i.label}" ? Action irréversible.`)) return;
    try {
      await deleteMut.mutateAsync(i.id);
      toast.success(`${i.label} supprimé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Indicateurs"
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
            Nouvel indicateur
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.toolbarSelect}>
          <Select<IndicatorDomain | ''>
            value={filterDomain}
            onChange={(v) => setFilterDomain(v)}
            options={[
              { value: '', label: 'Tous les domaines' },
              ...DOMAIN_OPTIONS,
            ]}
            aria-label="Filtrer par domaine"
          />
        </div>
        <Switch
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          label={showInactive ? 'Afficher inactifs : ON' : 'Afficher inactifs : OFF'}
        />
        <div className={styles.toolbarRight}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <strong>{totalActive}</strong> indicateurs actifs · <strong>{items.length}</strong> au total
          </span>
        </div>
      </div>

      {isLoading ? (
        <Skeleton height={320} />
      ) : (
        (Object.keys(grouped) as IndicatorDomain[]).map((domain) => {
          const list = grouped[domain] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={domain} className={styles.block} aria-label={DOMAIN_LABEL[domain]}>
              <header className={styles.blockHeader}>
                <h2 className={styles.blockTitle}>{DOMAIN_LABEL[domain]}</h2>
                <span className={styles.blockMeta}>{list.length} indicateurs</span>
              </header>

              {list.map((i) => {
                const isActive = i.isActive ?? true;
                return (
                  <div
                    key={i.id}
                    className={`${styles.row} ${!isActive ? styles.rowInactive : ''}`}
                  >
                    <div className={styles.indicatorMain}>
                      <span className={styles.indicatorLabel}>
                        {i.label}
                        {i.isCustom ? (
                          <span className={styles.badgeCustom}>
                            <Sparkles size={10} aria-hidden="true" /> Custom
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.indicatorMeta}>
                        {i.method} · {i.source}
                      </span>
                    </div>
                    <span className={styles.unit}>{i.unit || '—'}</span>
                    <span className={styles.bounds}>
                      {i.minOk !== undefined || i.maxOk !== undefined
                        ? `${i.minOk ?? '−∞'} — ${i.maxOk ?? '+∞'}`
                        : '—'}
                    </span>
                    <Switch
                      checked={isActive}
                      onChange={() => void handleToggleActive(i)}
                      label=""
                      aria-label={`${isActive ? 'Désactiver' : 'Activer'} ${i.label}`}
                    />
                    <div className={styles.actions}>
                      <IconButton
                        aria-label={`Modifier ${i.label}`}
                        variant="ghost"
                        onClick={() => openEdit(i)}
                      >
                        <Pencil size={14} />
                      </IconButton>
                      {i.isCustom ? (
                        <IconButton
                          aria-label={`Supprimer ${i.label}`}
                          variant="ghost"
                          onClick={() => void handleDelete(i)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? `Modifier ${editing.label}` : 'Nouvel indicateur'}
        description={
          editing?.isCustom === false
            ? "Indicateur du référentiel CDC §4 — vous pouvez modifier les bornes et la source mais pas le supprimer."
            : 'Définissez un nouvel indicateur métier — disponible dans le wizard de collecte.'
        }
        width={680}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer l\'indicateur'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Domaine" required>
            <Select<IndicatorDomain>
              value={form.domain}
              onChange={(domain) => setForm((f) => ({ ...f, domain }))}
              options={DOMAIN_OPTIONS}
            />
          </FormField>

          <FormField label="Unité">
            <Select<string>
              value={form.unit}
              onChange={(unit) => setForm((f) => ({ ...f, unit }))}
              options={[{ value: '', label: '— Aucune unité —' }, ...refOptions('units')]}
              placeholder="Sélectionner"
            />
          </FormField>

          <FormField label="Libellé affiché" required className={styles.formFull}>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex : Demande chimique en oxygène (DCO)"
            />
          </FormField>

          <FormField label="Borne min de conformité" hint="Vide = pas de plancher.">
            <Input
              type="number"
              inputMode="decimal"
              value={form.minOk}
              onChange={(e) => setForm((f) => ({ ...f, minOk: e.target.value }))}
              placeholder="Ex : 6.5"
            />
          </FormField>

          <FormField label="Borne max de conformité" hint="Vide = pas de plafond.">
            <Input
              type="number"
              inputMode="decimal"
              value={form.maxOk}
              onChange={(e) => setForm((f) => ({ ...f, maxOk: e.target.value }))}
              placeholder="Ex : 250"
            />
          </FormField>

          <FormField
            label="Méthode de mesure"
            className={styles.formFull}
          >
            <Select<string>
              value={form.method}
              onChange={(method) => setForm((f) => ({ ...f, method }))}
              options={[{ value: '', label: '— Choisir une méthode —' }, ...refOptions('methods')]}
              placeholder="Sélectionner"
            />
          </FormField>

          <FormField
            label="Source normative"
            className={styles.formFull}
          >
            <Select<string>
              value={form.source}
              onChange={(source) => setForm((f) => ({ ...f, source }))}
              options={[{ value: '', label: '— Choisir une source —' }, ...refOptions('sources')]}
              placeholder="Sélectionner"
            />
          </FormField>

          <FormField
            label="Mesure laboratoire"
            hint="Si activé, l'indicateur exige un prélèvement labo et n'est pas saisi sur tablette."
          >
            <Switch
              checked={form.labOnly}
              onChange={(e) => setForm((f) => ({ ...f, labOnly: e.target.checked }))}
              label={form.labOnly ? 'Oui — prélèvement labo' : 'Non — saisie in situ'}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
