import { useMemo, useState } from 'react';
import { Database, Lock, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { Button, Input, Modal, PageHeader } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { uuid } from '@/lib/uuid';
import {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  loadRefData,
  resetRefData,
  saveRefData,
  type RefCategory,
  type RefEntry,
} from '../lib/refData';
import styles from './RefDataPage.module.css';

const CATEGORIES: RefCategory[] = [
  'units',
  'methods',
  'sources',
  'siteTypes',
  'legalStatus',
  'domains',
  'labCapabilities',
];

export function RefDataPage() {
  const toast = useToast();
  const [data, setData] = useState(() => loadRefData());
  const [activeCategory, setActiveCategory] = useState<RefCategory>('units');
  const [editing, setEditing] = useState<RefEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const list = data[activeCategory] ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q),
    );
  }, [data, activeCategory, search]);

  const counts = useMemo(() => {
    const map = {} as Record<RefCategory, number>;
    for (const c of CATEGORIES) {
      map[c] = (data[c] ?? []).filter((e) => e.isActive).length;
    }
    return map;
  }, [data]);

  const persist = (next: Record<RefCategory, RefEntry[]>) => {
    setData(next);
    saveRefData(next);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (entry: RefEntry) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const submitEntry = (entry: RefEntry) => {
    const list = [...(data[activeCategory] ?? [])];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    persist({ ...data, [activeCategory]: list });
    setFormOpen(false);
    toast.success(idx >= 0 ? 'Entrée modifiée.' : 'Entrée ajoutée au référentiel.');
  };

  const toggleActive = (entry: RefEntry) => {
    const list = (data[activeCategory] ?? []).map((e) =>
      e.id === entry.id ? { ...e, isActive: !e.isActive } : e,
    );
    persist({ ...data, [activeCategory]: list });
  };

  const removeEntry = (entry: RefEntry) => {
    if (entry.locked) {
      toast.error('Cette entrée du socle CDC ne peut être supprimée.');
      return;
    }
    if (!window.confirm(`Supprimer « ${entry.label} » ?`)) return;
    const list = (data[activeCategory] ?? []).filter((e) => e.id !== entry.id);
    persist({ ...data, [activeCategory]: list });
    toast.success('Entrée supprimée.');
  };

  const handleReset = () => {
    if (!window.confirm('Réinitialiser tous les référentiels au socle CDC ? Vos ajouts seront perdus.')) return;
    setData(resetRefData());
    toast.info('Référentiels réinitialisés.');
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Référentiels"
        actions={
          <>
            <Button variant="ghost" iconLeft={<RotateCcw size={14} />} onClick={handleReset}>
              Réinitialiser
            </Button>
            <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
              Nouvelle entrée
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <aside className={styles.sidePanel} aria-label="Catégories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.catItem} ${c === activeCategory ? styles.catItemActive : ''}`}
              onClick={() => {
                setActiveCategory(c);
                setSearch('');
              }}
            >
              <span className={styles.catLabel}>{CATEGORY_LABEL[c]}</span>
              <span className={styles.catCount}>{counts[c]}</span>
            </button>
          ))}
        </aside>

        <section className={styles.content}>
          <header className={styles.contentHead}>
            <div>
              <h2 className={styles.contentTitle}>{CATEGORY_LABEL[activeCategory]}</h2>
              <p className={styles.contentHint}>{CATEGORY_HINT[activeCategory]}</p>
            </div>
            <div className={styles.searchWrap}>
              <Input
                type="search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Rechercher dans le référentiel"
              />
            </div>
          </header>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Libellé</th>
                  <th>Description</th>
                  <th>État</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Aucune entrée — ajoutez-en avec « Nouvelle entrée ».
                    </td>
                  </tr>
                ) : (
                  items.map((e) => (
                    <tr key={e.id} data-inactive={!e.isActive ? 'true' : undefined}>
                      <td>
                        <span className={styles.code}>{e.code}</span>
                      </td>
                      <td className={styles.labelCell}>
                        <span className={styles.label}>{e.label}</span>
                        {e.locked ? (
                          <span className={styles.lockTag} title="Entrée socle CDC — modification autorisée, suppression bloquée">
                            <Lock size={10} />
                            socle
                          </span>
                        ) : null}
                      </td>
                      <td className={styles.description}>
                        {e.description ?? <span className={styles.muted}>—</span>}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.statusToggle} ${e.isActive ? styles.statusActive : styles.statusInactive}`}
                          onClick={() => toggleActive(e)}
                        >
                          {e.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className={styles.actions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEdit(e)}
                          aria-label="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => removeEntry(e)}
                          aria-label="Supprimer"
                          disabled={e.locked}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <RefEntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={activeCategory}
        entry={editing}
        onSubmit={submitEntry}
      />
    </div>
  );
}

interface RefEntryFormProps {
  open: boolean;
  onClose: () => void;
  category: RefCategory;
  entry: RefEntry | null;
  onSubmit: (entry: RefEntry) => void;
}

function RefEntryForm({ open, onClose, category, entry, onSubmit }: RefEntryFormProps) {
  const [code, setCode] = useState(entry?.code ?? '');
  const [label, setLabel] = useState(entry?.label ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');

  // Reset state when entry change (open with different entry)
  useMemo(() => {
    setCode(entry?.code ?? '');
    setLabel(entry?.label ?? '');
    setDescription(entry?.description ?? '');
  }, [entry, open]);

  const handleSubmit = () => {
    if (!code.trim() || !label.trim()) return;
    onSubmit({
      id: entry?.id ?? uuid(),
      code: code.trim(),
      label: label.trim(),
      description: description.trim() || undefined,
      isActive: entry?.isActive ?? true,
      locked: entry?.locked ?? false,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? `Modifier — ${CATEGORY_LABEL[category]}` : `Ajouter à ${CATEGORY_LABEL[category]}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} iconLeft={<X size={14} />}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            iconLeft={<Save size={14} />}
            disabled={!code.trim() || !label.trim()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex. mg/L · OMS_AIR_2021 · GALA"
            disabled={!!entry?.locked}
            required
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Libellé affiché</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. mg/L · OMS Air 2021 · GALA — chimique"
            required
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Description (optionnelle)</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détail affiché en glossaire"
          />
        </label>
        {entry?.locked ? (
          <p className={styles.lockHint}>
            <Database size={12} aria-hidden="true" />
            Cette entrée fait partie du socle CDC : le code est verrouillé. Vous pouvez modifier
            son libellé, sa description ou la désactiver.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
