import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileSpreadsheet, FlaskConical, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import {
  Badge,
  Button,
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

const DOMAIN_ORDER: IndicatorDomain[] = ['water', 'soil', 'air', 'waste', 'health', 'socio'];

const DOMAIN_OPTIONS: Array<{ value: IndicatorDomain; label: string }> = DOMAIN_ORDER.map((d) => ({
  value: d,
  label: DOMAIN_LABEL[d],
}));

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

/** Formate les bornes de manière compacte et lisible. */
function formatBounds(i: Indicator): string {
  const hasMin = i.minOk !== undefined;
  const hasMax = i.maxOk !== undefined;
  if (!hasMin && !hasMax) return '—';
  if (hasMin && hasMax) return `${i.minOk} – ${i.maxOk}`;
  if (hasMax) return `≤ ${i.maxOk}`;
  return `≥ ${i.minOk}`;
}

export function IndicatorsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading } = useIndicatorsAdmin();
  const createMut = useCreateIndicator();
  const updateMut = useUpdateIndicator();
  const deleteMut = useDeleteIndicator();

  const [editing, setEditing] = useState<Indicator | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [filterDomain, setFilterDomain] = useState<IndicatorDomain | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState('');
  /** Domaines ouverts. Par défaut : 'water' (la majorité des indicateurs).
   * Cliquer sur un chip de filtre ouvre automatiquement le domaine ciblé. */
  const [openDomains, setOpenDomains] = useState<Set<IndicatorDomain>>(
    () => new Set(['water']),
  );

  const toggleDomain = (d: IndicatorDomain) => {
    setOpenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleFilterDomain = (d: IndicatorDomain | 'all') => {
    setFilterDomain(d);
    if (d !== 'all') {
      setOpenDomains((prev) => new Set(prev).add(d));
    }
  };

  useEffect(() => {
    if (creating) setForm(EMPTY);
    else if (editing) setForm(fromIndicator(editing));
  }, [creating, editing]);

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const isActive = i.isActive ?? true;
      if (!showInactive && !isActive) return false;
      if (filterDomain !== 'all' && i.domain !== filterDomain) return false;
      if (
        q &&
        !i.label.toLowerCase().includes(q) &&
        !i.id.toLowerCase().includes(q) &&
        !i.method.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, filterDomain, showInactive, query]);

  const grouped = useMemo(() => {
    const map: Partial<Record<IndicatorDomain, Indicator[]>> = {};
    for (const i of filtered) {
      (map[i.domain] ??= []).push(i);
    }
    return map;
  }, [filtered]);

  const totalActive = items.filter((i) => i.isActive ?? true).length;
  const totalLab = items.filter((i) => i.labOnly).length;

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
        toast.success(`${form.label} mis à jour.`);
      } else {
        await createMut.mutateAsync(toInput(form));
        toast.success(`${form.label} créé.`);
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
      toast.success(next ? `${i.label} réactivé.` : `${i.label} désactivé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const handleDelete = async (i: Indicator) => {
    if (!i.isCustom) {
      toast.info('Seuls les indicateurs personnalisés peuvent être supprimés.');
      return;
    }
    const ok = await confirm({
      title: `Supprimer "${i.label}" ?`,
      message: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(i.id);
      toast.success(`${i.label} supprimé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Indicateurs</h1>
          <span className={styles.heroCount}>
            {totalActive} actifs · {totalLab} labo · {items.length} au total
          </span>
          <p className={styles.heroDescription}>
            Catalogue normatif des paramètres mesurés.
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un indicateur…"
              aria-label="Rechercher un indicateur"
            />
          </div>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            disabled={filtered.length === 0}
            onClick={() => {
              exportRowsToXlsx({
                filename: 'indicateurs',
                sheetName: 'Indicateurs',
                columns: [
                  { header: 'ID', accessor: (i) => i.id },
                  { header: 'Libellé', accessor: (i) => i.label },
                  { header: 'Domaine', accessor: (i) => i.domain },
                  { header: 'Unité', accessor: (i) => i.unit ?? '' },
                  { header: 'Méthode', accessor: (i) => i.method ?? '' },
                  { header: 'Source', accessor: (i) => i.source ?? '' },
                  { header: 'Min OK', accessor: (i) => i.minOk ?? '' },
                  { header: 'Max OK', accessor: (i) => i.maxOk ?? '' },
                  { header: 'Labo uniquement', accessor: (i) => (i.labOnly ? 'Oui' : 'Non') },
                  { header: 'Actif', accessor: (i) => (i.isActive === false ? 'Non' : 'Oui') },
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

      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="Filtrer par domaine">
          <button
            type="button"
            className={`${styles.chip} ${filterDomain === 'all' ? styles.chipActive : ''}`}
            onClick={() => handleFilterDomain('all')}
          >
            Tous
          </button>
          {DOMAIN_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`${styles.chip} ${filterDomain === d.value ? styles.chipActive : ''}`}
              onClick={() => handleFilterDomain(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className={styles.inactiveToggle}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span>Inclure inactifs</span>
        </label>
      </div>

      {isLoading ? (
        <Skeleton height={320} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          Aucun indicateur ne correspond aux filtres.
        </div>
      ) : (
        DOMAIN_ORDER.filter((d) => (grouped[d]?.length ?? 0) > 0).map((domain) => {
          const list = grouped[domain] ?? [];
          // Si une recherche est active, on force l'ouverture des blocs ayant des matches.
          const isOpen = openDomains.has(domain) || query.trim().length > 0;
          return (
            <section key={domain} className={styles.block} aria-label={DOMAIN_LABEL[domain]}>
              <button
                type="button"
                className={styles.blockHead}
                onClick={() => toggleDomain(domain)}
                aria-expanded={isOpen}
              >
                <span className={styles.blockHeadLeft}>
                  {isOpen ? (
                    <ChevronDown size={14} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                  <h2 className={styles.blockTitle}>{DOMAIN_LABEL[domain]}</h2>
                </span>
                <span className={styles.blockCount}>{list.length}</span>
              </button>
              {isOpen ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Indicateur</th>
                    <th>Unité</th>
                    <th>Bornes</th>
                    <th>Source</th>
                    <th>Actif</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => {
                    const isActive = i.isActive ?? true;
                    return (
                      <tr
                        key={i.id}
                        className={!isActive ? styles.rowInactive : ''}
                      >
                        <td>
                          <div className={styles.indicatorMain}>
                            <span className={styles.indicatorLabel}>
                              {i.label}
                              {i.labOnly ? (
                                <Badge size="sm" variant="info">
                                  <FlaskConical size={10} aria-hidden="true" />
                                  Labo
                                </Badge>
                              ) : null}
                              {i.isCustom ? (
                                <Badge size="sm" variant="warning">
                                  <Sparkles size={10} aria-hidden="true" />
                                  Custom
                                </Badge>
                              ) : null}
                            </span>
                            <span className={styles.indicatorMeta}>{i.method}</span>
                          </div>
                        </td>
                        <td>
                          <code className={styles.unitCode}>{i.unit || '—'}</code>
                        </td>
                        <td>
                          <span className={styles.bounds}>{formatBounds(i)}</span>
                        </td>
                        <td>
                          <span className={styles.source}>{i.source}</span>
                        </td>
                        <td>
                          <Switch
                            checked={isActive}
                            onChange={() => void handleToggleActive(i)}
                            label=""
                            aria-label={`${isActive ? 'Désactiver' : 'Activer'} ${i.label}`}
                          />
                        </td>
                        <td>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              ) : null}
            </section>
          );
        })
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? `Modifier ${editing.label}` : 'Nouvel indicateur'}
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Libellé" required className={styles.formFull}>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex : Demande chimique en oxygène"
            />
          </FormField>

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
              options={[{ value: '', label: '— Aucune —' }, ...refOptions('units')]}
            />
          </FormField>

          <FormField label="Borne minimale">
            <Input
              type="number"
              inputMode="decimal"
              value={form.minOk}
              onChange={(e) => setForm((f) => ({ ...f, minOk: e.target.value }))}
              placeholder="6.5"
            />
          </FormField>

          <FormField label="Borne maximale">
            <Input
              type="number"
              inputMode="decimal"
              value={form.maxOk}
              onChange={(e) => setForm((f) => ({ ...f, maxOk: e.target.value }))}
              placeholder="8.5"
            />
          </FormField>

          <FormField label="Méthode de mesure" className={styles.formFull}>
            <Select<string>
              value={form.method}
              onChange={(method) => setForm((f) => ({ ...f, method }))}
              options={[{ value: '', label: '— Choisir —' }, ...refOptions('methods')]}
            />
          </FormField>

          <FormField label="Source normative" className={styles.formFull}>
            <Select<string>
              value={form.source}
              onChange={(source) => setForm((f) => ({ ...f, source }))}
              options={[{ value: '', label: '— Choisir —' }, ...refOptions('sources')]}
            />
          </FormField>

          <FormField label="Mesure laboratoire" className={styles.formFull}>
            <Switch
              checked={form.labOnly}
              onChange={(e) => setForm((f) => ({ ...f, labOnly: e.target.checked }))}
              label={form.labOnly ? 'Oui — exige un prélèvement' : 'Non — saisie in situ'}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
