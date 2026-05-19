import { useEffect, useMemo, useState } from 'react';
import { Lock, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  Button,
  FormField,
  IconButton,
  Input,
  Modal,
  Select,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
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

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));

export function RefDataPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(() => loadRefData());
  const [activeCategory, setActiveCategory] = useState<RefCategory>('units');
  const [editing, setEditing] = useState<{ entry: RefEntry; category: RefCategory } | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = data[activeCategory] ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q),
    );
  }, [data, activeCategory, query]);

  const counts = useMemo(() => {
    const map = {} as Record<RefCategory, number>;
    for (const c of CATEGORIES) {
      map[c] = (data[c] ?? []).length;
    }
    return map;
  }, [data]);

  const totalEntries = useMemo(
    () => CATEGORIES.reduce((acc, c) => acc + counts[c], 0),
    [counts],
  );

  const persist = (next: Record<RefCategory, RefEntry[]>) => {
    setData(next);
    saveRefData(next);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (entry: RefEntry, category: RefCategory) => {
    setEditing({ entry, category });
    setFormOpen(true);
  };

  const submitEntry = (entry: RefEntry, targetCategory: RefCategory) => {
    if (editing && editing.category !== targetCategory) {
      // Catégorie modifiée à l'édition : on retire de l'ancienne, on ajoute à la nouvelle
      const oldList = (data[editing.category] ?? []).filter((e) => e.id !== entry.id);
      const newList = [entry, ...(data[targetCategory] ?? [])];
      persist({
        ...data,
        [editing.category]: oldList,
        [targetCategory]: newList,
      });
      setActiveCategory(targetCategory);
    } else {
      const list = [...(data[targetCategory] ?? [])];
      const idx = list.findIndex((e) => e.id === entry.id);
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      persist({ ...data, [targetCategory]: list });
      setActiveCategory(targetCategory);
    }
    setFormOpen(false);
    toast.success(editing ? 'Entrée modifiée.' : 'Entrée ajoutée au référentiel.');
  };

  const removeEntry = async (entry: RefEntry) => {
    if (entry.locked) {
      toast.error('Cette entrée du socle CDC ne peut être supprimée.');
      return;
    }
    const ok = await confirm({
      title: `Supprimer « ${entry.label} » ?`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    const list = (data[activeCategory] ?? []).filter((e) => e.id !== entry.id);
    persist({ ...data, [activeCategory]: list });
    toast.success('Entrée supprimée.');
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Réinitialiser les référentiels ?',
      message: 'Tous vos ajouts personnalisés seront perdus. Seul le socle CDC sera conservé.',
      confirmLabel: 'Réinitialiser',
      tone: 'danger',
    });
    if (!ok) return;
    setData(resetRefData());
    toast.info('Référentiels réinitialisés.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Référentiels</h1>
          <span className={styles.heroCount}>
            {totalEntries} entrée{totalEntries > 1 ? 's' : ''} · {CATEGORIES.length} catégories
          </span>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans la catégorie active…"
              aria-label="Rechercher"
            />
          </div>
          <Button variant="ghost" iconLeft={<RotateCcw size={14} />} onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Ajouter
          </Button>
        </div>
      </header>

      <div className={styles.chips} role="tablist" aria-label="Catégorie">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === activeCategory}
            className={`${styles.chip} ${c === activeCategory ? styles.chipActive : ''}`}
            onClick={() => {
              setActiveCategory(c);
              setQuery('');
            }}
          >
            {CATEGORY_LABEL[c]}
            <span className={styles.chipCount}>{counts[c]}</span>
          </button>
        ))}
      </div>

      <p className={styles.contentHint}>{CATEGORY_HINT[activeCategory]}</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Description</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Aucune entrée dans cette catégorie.
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <code className={styles.code}>{e.code}</code>
                  </td>
                  <td>
                    <span className={styles.labelCell}>
                      <span className={styles.label}>{e.label}</span>
                      {e.locked ? (
                        <span
                          className={styles.lockIcon}
                          title="Socle CDC — suppression bloquée"
                          aria-label="Socle CDC"
                        >
                          <Lock size={11} />
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className={styles.description}>
                    {e.description ?? <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.actions}>
                    <IconButton
                      aria-label="Modifier"
                      variant="ghost"
                      onClick={() => openEdit(e, activeCategory)}
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      aria-label="Supprimer"
                      variant="ghost"
                      onClick={() => void removeEntry(e)}
                      disabled={e.locked}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RefEntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultCategory={editing?.category ?? activeCategory}
        entry={editing?.entry ?? null}
        onSubmit={submitEntry}
      />
    </div>
  );
}

interface RefEntryFormProps {
  open: boolean;
  onClose: () => void;
  defaultCategory: RefCategory;
  entry: RefEntry | null;
  onSubmit: (entry: RefEntry, category: RefCategory) => void;
}

function RefEntryForm({
  open,
  onClose,
  defaultCategory,
  entry,
  onSubmit,
}: RefEntryFormProps) {
  const [category, setCategory] = useState<RefCategory>(defaultCategory);
  const [code, setCode] = useState(entry?.code ?? '');
  const [label, setLabel] = useState(entry?.label ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setCode(entry?.code ?? '');
      setLabel(entry?.label ?? '');
      setDescription(entry?.description ?? '');
    }
  }, [entry, open, defaultCategory]);

  const handleSubmit = () => {
    if (!code.trim() || !label.trim()) return;
    onSubmit(
      {
        id: entry?.id ?? uuid(),
        code: code.trim(),
        label: label.trim(),
        description: description.trim() || undefined,
        isActive: entry?.isActive ?? true,
        locked: entry?.locked ?? false,
      },
      category,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? `Modifier ${entry.label}` : 'Nouvelle entrée'}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!code.trim() || !label.trim()}
          >
            {entry ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <FormField label="Catégorie" required className={styles.formFull}>
          <Select<RefCategory>
            value={category}
            onChange={(c) => setCategory(c)}
            options={CATEGORY_OPTIONS}
          />
        </FormField>

        <FormField label="Code" required>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="mg/L · OMS_AIR_2021 · GALA"
            disabled={!!entry?.locked}
          />
        </FormField>

        <FormField label="Libellé" required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé affiché à l'utilisateur"
          />
        </FormField>

        <FormField label="Description" className={styles.formFull}>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détail (optionnel)"
          />
        </FormField>
      </div>
    </Modal>
  );
}
