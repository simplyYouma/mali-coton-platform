import { useState, useMemo } from 'react';
import {
  FlaskConical,
  Ruler,
  BookOpen,
  Gauge,
  Search,
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import {
  Button,
  Modal,
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  Skeleton,
  EmptyState,
} from '@/components/common';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { iriOf } from '@/lib/jsonld';
import {
  useReferentielsSummary,
  useParametreAnalyses,
  useParametreUnites,
  useNormeReferences,
  useSeuilNormatifs,
  useSeuilsNonConfigures,
  useCreateParametreAnalyse,
  useUpdateParametreAnalyse,
  useDeleteParametreAnalyse,
  useCreateParametreUnite,
  useUpdateParametreUnite,
  useCreateNormeReference,
  useUpdateNormeReference,
  useCreateSeuilNormatif,
  useUpdateSeuilNormatif,
  useDeleteSeuilNormatif,
} from '../hooks/useAdmin';
import type {
  ParametreAnalyse,
  ParametreUnite,
  NormeReference,
  SeuilNormatif,
} from '../api/referentiels';
import styles from './RefDataPage.module.css';

// ── Constantes ────────────────────────────────────────────────────────────────

type Tab = 'parametres' | 'unites' | 'normes' | 'seuils';

const TABS: Array<{ value: Tab; label: string; icon: React.ReactNode }> = [
  { value: 'parametres', label: 'Paramètres', icon: <FlaskConical size={13} /> },
  { value: 'unites',     label: 'Unités',     icon: <Ruler size={13} /> },
  { value: 'normes',     label: 'Normes',     icon: <BookOpen size={13} /> },
  { value: 'seuils',     label: 'Seuils',     icon: <Gauge size={13} /> },
];

const CAT_LABEL: Record<string, string> = {
  chimique: 'Chimique',
  physique: 'Physique',
  AIR:      'Air',
  WATER:    'Eau',
  SOIL:     'Sol',
};

const CAT_OPTIONS = [
  { value: 'all',      label: 'Toutes les catégories' },
  { value: 'chimique', label: 'Chimique' },
  { value: 'physique', label: 'Physique' },
  { value: 'AIR',      label: 'Air' },
  { value: 'WATER',    label: 'Eau' },
  { value: 'SOIL',     label: 'Sol' },
];

// ── Page principale ───────────────────────────────────────────────────────────

export function RefDataPage() {
  const [tab, setTab] = useState<Tab>('parametres');

  const summaryQ     = useReferentielsSummary();
  const parametresQ  = useParametreAnalyses();
  const unitesQ      = useParametreUnites();
  const normesQ      = useNormeReferences();
  const seuilsQ      = useSeuilNormatifs();
  const nonConfigQ   = useSeuilsNonConfigures();

  const summary = summaryQ.data ?? { parametres: 0, unites: 0, normes: 0, seuils: 0 };
  const parametres = parametresQ.data ?? [];
  const unites     = unitesQ.data ?? [];
  const normes     = normesQ.data ?? [];
  const seuils     = seuilsQ.data ?? [];

  const STAT_CARDS = [
    { key: 'parametres' as const, label: 'Paramètres',  icon: <FlaskConical size={18} />, tone: 'primary' },
    { key: 'unites'     as const, label: 'Unités',       icon: <Ruler size={18} />,        tone: 'neutral' },
    { key: 'normes'     as const, label: 'Normes',       icon: <BookOpen size={18} />,     tone: 'info'    },
    { key: 'seuils'     as const, label: 'Seuils config.',icon: <Gauge size={18} />,       tone: seuils.length === 0 ? 'warning' : 'success' },
  ];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            <Database size={0} /> Administration
          </span>
          <h1 className={styles.heroTitle}>Référentiels</h1>
          <p className={styles.heroDescription}>
            Paramètres d'analyse, unités de mesure, normes de référence et seuils normatifs.
          </p>
        </div>
      </header>

      {/* Stat cards */}
      <div className={styles.statsRow}>
        {STAT_CARDS.map((s) => (
          <div key={s.key} className={styles.statCard} data-tone={s.tone}>
            <span className={styles.statIcon}>{s.icon}</span>
            <span className={styles.statValue}>{summary[s.key]}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar} role="tablist">
        <div className={styles.chips}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={t.value === tab}
              className={`${styles.chip} ${t.value === tab ? styles.chipActive : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.icon}
              {t.label}
              <span className={styles.chipCount}>{summary[t.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {tab === 'parametres' && (
        <ParametresTab
          parametres={parametres}
          unites={unites}
          isLoading={parametresQ.isLoading}
        />
      )}
      {tab === 'unites' && (
        <UnitesTab
          unites={unites}
          isLoading={unitesQ.isLoading}
        />
      )}
      {tab === 'normes' && (
        <NormesTab
          normes={normes}
          isLoading={normesQ.isLoading}
        />
      )}
      {tab === 'seuils' && (
        <SeuilsTab
          seuils={seuils}
          parametres={parametres}
          normes={normes}
          nonConfigures={nonConfigQ.data}
          isLoading={seuilsQ.isLoading}
        />
      )}
    </div>
  );
}

// ── Onglet Paramètres ─────────────────────────────────────────────────────────

interface ParametresTabProps {
  parametres: ParametreAnalyse[];
  unites: ParametreUnite[];
  isLoading: boolean;
}

function ParametresTab({ parametres, unites, isLoading }: ParametresTabProps) {
  const [q, setQ]             = useState('');
  const [cat, setCat]         = useState('all');
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState<ParametreAnalyse | null>(null);
  const [form, setForm]       = useState({ nom: '', categorie: 'chimique', description: '', actif: true, unite: '' });

  const createMut = useCreateParametreAnalyse();
  const updateMut = useUpdateParametreAnalyse();
  const deleteMut = useDeleteParametreAnalyse();

  const uniteOptions = [
    { value: '', label: '— Aucune unité —' },
    ...unites.map((u) => ({ value: String(u.id), label: `${u.libelle} (${u.sigle})` })),
  ];

  const filtered = useMemo(() => {
    let items = parametres;
    if (cat !== 'all') items = items.filter((p) => p.categorie === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      items = items.filter((p) => p.nom.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s));
    }
    return items;
  }, [parametres, cat, q]);

  function openCreate() {
    setEditing(null);
    setForm({ nom: '', categorie: 'chimique', description: '', actif: true, unite: '' });
    setModal(true);
  }

  function openEdit(p: ParametreAnalyse) {
    setEditing(p);
    const uniteId = p.unite ? p.unite.split('/').pop() ?? '' : '';
    setForm({ nom: p.nom, categorie: p.categorie, description: p.description ?? '', actif: p.actif, unite: uniteId });
    setModal(true);
  }

  async function handleSave() {
    const payload = {
      nom: form.nom.trim(),
      categorie: form.categorie,
      description: form.description.trim() || undefined,
      actif: form.actif,
      unite: form.unite ? iriOf('parametre_unites', form.unite) : null,
    };
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModal(false);
  }

  function handleDelete(p: ParametreAnalyse) {
    if (!confirm(`Supprimer le paramètre "${p.nom}" ? Cette action est irréversible.`)) return;
    deleteMut.mutate(p.id);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <div className={styles.toolbarRow}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un paramètre…"
            aria-label="Rechercher"
          />
        </div>
        <Select<string>
          value={cat}
          onChange={setCat}
          options={CAT_OPTIONS}
          aria-label="Filtrer par catégorie"
        />
        <div className={styles.toolbarRight}>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            onClick={() =>
              exportRowsToXlsx({
                filename: 'parametres-analyse',
                sheetName: 'Paramètres',
                columns: [
                  { header: 'ID',          accessor: (p: ParametreAnalyse) => p.id },
                  { header: 'Nom',         accessor: (p: ParametreAnalyse) => p.nom },
                  { header: 'Catégorie',   accessor: (p: ParametreAnalyse) => CAT_LABEL[p.categorie] ?? p.categorie },
                  { header: 'Description', accessor: (p: ParametreAnalyse) => p.description ?? '' },
                  { header: 'Actif',       accessor: (p: ParametreAnalyse) => p.actif ? 'Oui' : 'Non' },
                ],
                rows: filtered,
              })
            }
            disabled={isLoading}
          >
            Exporter
          </Button>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Nouveau paramètre
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={24} />}
          title="Aucun paramètre trouvé"
          description="Ajustez les filtres ou créez un nouveau paramètre."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Unité</th>
                <th>Description</th>
                <th className={styles.centerCell}>Actif</th>
                <th className={styles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const uniteObj = p.unite
                  ? unites.find((u) => `/api/parametre_unites/${u.id}` === p.unite)
                  : undefined;
                return (
                  <tr key={p.id}>
                    <td><code className={styles.code}>{p.id}</code></td>
                    <td><span className={styles.label}>{p.nom}</span></td>
                    <td>
                      <span className={styles.catBadge} data-cat={p.categorie}>
                        {CAT_LABEL[p.categorie] ?? p.categorie}
                      </span>
                    </td>
                    <td className={styles.muted}>
                      {uniteObj ? <code className={styles.code}>{uniteObj.sigle}</code> : '—'}
                    </td>
                    <td className={styles.description}>{p.description ?? <span className={styles.muted}>—</span>}</td>
                    <td className={styles.centerCell}>
                      <span className={p.actif ? styles.dotOn : styles.dotOff} />
                    </td>
                    <td className={styles.actionsCell}>
                      <button className={styles.iconBtn} title="Modifier" onClick={() => openEdit(p)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="Supprimer"
                        onClick={() => handleDelete(p)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing ? `Modifier — ${editing.nom}` : 'Nouveau paramètre d\'analyse'}
        width={560}
      >
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <FormField label="Nom" required>
              <Input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex. pH, Température, DBO5…"
                autoFocus
              />
            </FormField>
            <FormField label="Catégorie" required>
              <Select<string>
                value={form.categorie}
                onChange={(v) => setForm((f) => ({ ...f, categorie: v }))}
                options={CAT_OPTIONS.filter((o) => o.value !== 'all')}
              />
            </FormField>
          </div>
          <FormField label="Unité de mesure">
            <Select<string>
              value={form.unite}
              onChange={(v) => setForm((f) => ({ ...f, unite: v }))}
              options={uniteOptions}
            />
          </FormField>
          <FormField label="Description" hint="Optionnelle — apparaît dans les fiches d'analyse.">
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Ex. Potentiel hydrogène, indicateur de l'acidité ou de la basicité…"
            />
          </FormField>
          <Checkbox
            label="Paramètre actif"
            checked={form.actif}
            onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
          />
        </div>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={isPending || !form.nom.trim()}>
            {isPending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Onglet Unités ─────────────────────────────────────────────────────────────

function UnitesTab({ unites, isLoading }: { unites: ParametreUnite[]; isLoading: boolean }) {
  const [q, setQ]             = useState('');
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState<ParametreUnite | null>(null);
  const [form, setForm]       = useState({ libelle: '', sigle: '' });

  const createMut = useCreateParametreUnite();
  const updateMut = useUpdateParametreUnite();

  const filtered = useMemo(() => {
    if (!q.trim()) return unites;
    const s = q.toLowerCase();
    return unites.filter((u) => u.libelle.toLowerCase().includes(s) || u.sigle.toLowerCase().includes(s));
  }, [unites, q]);

  function openCreate() {
    setEditing(null);
    setForm({ libelle: '', sigle: '' });
    setModal(true);
  }

  function openEdit(u: ParametreUnite) {
    setEditing(u);
    setForm({ libelle: u.libelle, sigle: u.sigle });
    setModal(true);
  }

  async function handleSave() {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input: form });
    } else {
      await createMut.mutateAsync(form);
    }
    setModal(false);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <div className={styles.toolbarRow}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une unité…"
          />
        </div>
        <div className={styles.toolbarRight}>
          <Button
            variant="excel"
            iconLeft={<FileSpreadsheet size={14} />}
            onClick={() =>
              exportRowsToXlsx({
                filename: 'unites-mesure',
                sheetName: 'Unités',
                columns: [
                  { header: 'ID',      accessor: (u: ParametreUnite) => u.id },
                  { header: 'Libellé', accessor: (u: ParametreUnite) => u.libelle },
                  { header: 'Sigle',   accessor: (u: ParametreUnite) => u.sigle },
                  { header: 'Paramètres liés', accessor: (u: ParametreUnite) => u.parametreAnalyses.length },
                ],
                rows: filtered,
              })
            }
            disabled={isLoading}
          >
            Exporter
          </Button>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Nouvelle unité
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Ruler size={24} />}
          title="Aucune unité trouvée"
          description="Créez des unités de mesure pour les associer aux paramètres d'analyse."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Libellé</th>
                <th>Sigle</th>
                <th>Paramètres liés</th>
                <th className={styles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><code className={styles.code}>{u.id}</code></td>
                  <td><span className={styles.label}>{u.libelle}</span></td>
                  <td><code className={styles.code}>{u.sigle}</code></td>
                  <td className={styles.muted}>{u.parametreAnalyses.length}</td>
                  <td className={styles.actionsCell}>
                    <button className={styles.iconBtn} title="Modifier" onClick={() => openEdit(u)}>
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing ? `Modifier — ${editing.libelle}` : 'Nouvelle unité de mesure'}
        width={460}
      >
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <FormField label="Libellé" required hint="Ex. milligramme par litre, degré Celsius…">
              <Input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Ex. milligramme par litre"
                autoFocus
              />
            </FormField>
            <FormField label="Sigle" required hint="Symbole court affiché dans les résultats.">
              <Input
                value={form.sigle}
                onChange={(e) => setForm((f) => ({ ...f, sigle: e.target.value }))}
                placeholder="Ex. mg/L"
              />
            </FormField>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !form.libelle.trim() || !form.sigle.trim()}
          >
            {isPending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Onglet Normes ─────────────────────────────────────────────────────────────

function NormesTab({ normes, isLoading }: { normes: NormeReference[]; isLoading: boolean }) {
  const [q, setQ]             = useState('');
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState<NormeReference | null>(null);
  const [form, setForm]       = useState({
    code: '', libelle: '', organisme: '', version: '',
    actif: true, dateDebutValidite: '', dateFinValidite: '',
  });

  const createMut = useCreateNormeReference();
  const updateMut = useUpdateNormeReference();

  const filtered = useMemo(() => {
    if (!q.trim()) return normes;
    const s = q.toLowerCase();
    return normes.filter(
      (n) =>
        n.code.toLowerCase().includes(s) ||
        n.libelle.toLowerCase().includes(s) ||
        (n.organisme ?? '').toLowerCase().includes(s),
    );
  }, [normes, q]);

  function openCreate() {
    setEditing(null);
    setForm({ code: '', libelle: '', organisme: '', version: '', actif: true, dateDebutValidite: '', dateFinValidite: '' });
    setModal(true);
  }

  function openEdit(n: NormeReference) {
    setEditing(n);
    setForm({
      code: n.code,
      libelle: n.libelle,
      organisme: n.organisme ?? '',
      version: n.version ?? '',
      actif: n.actif,
      dateDebutValidite: n.dateDebutValidite?.slice(0, 10) ?? '',
      dateFinValidite: n.dateFinValidite?.slice(0, 10) ?? '',
    });
    setModal(true);
  }

  async function handleSave() {
    const payload = {
      code: form.code.trim(),
      libelle: form.libelle.trim(),
      organisme: form.organisme.trim() || undefined,
      version: form.version.trim() || undefined,
      actif: form.actif,
      dateDebutValidite: form.dateDebutValidite || null,
      dateFinValidite: form.dateFinValidite || null,
    };
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModal(false);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <div className={styles.toolbarRow}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une norme…"
          />
        </div>
        <div className={styles.toolbarRight}>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Nouvelle norme
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Aucune norme de référence"
          description="Créez des normes (OMS, ANPE, ISO…) pour les associer aux seuils normatifs et valider les résultats d'analyse."
          action={
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
              Créer la première norme
            </Button>
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Organisme</th>
                <th>Version</th>
                <th>Validité</th>
                <th className={styles.centerCell}>Actif</th>
                <th className={styles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id}>
                  <td><code className={styles.code}>{n.code}</code></td>
                  <td><span className={styles.label}>{n.libelle}</span></td>
                  <td className={styles.muted}>{n.organisme ?? '—'}</td>
                  <td className={styles.muted}>{n.version ?? '—'}</td>
                  <td className={styles.muted}>
                    {n.dateDebutValidite
                      ? `${n.dateDebutValidite.slice(0, 10)}${n.dateFinValidite ? ` → ${n.dateFinValidite.slice(0, 10)}` : ''}`
                      : '—'}
                  </td>
                  <td className={styles.centerCell}>
                    <span className={n.actif ? styles.dotOn : styles.dotOff} />
                  </td>
                  <td className={styles.actionsCell}>
                    <button className={styles.iconBtn} title="Modifier" onClick={() => openEdit(n)}>
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing ? `Modifier — ${editing.code}` : 'Nouvelle norme de référence'}
        width={600}
      >
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <FormField label="Code" required hint="Identifiant unique, ex. OMS_2024_EAU">
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="OMS_2024_EAU"
                autoFocus
              />
            </FormField>
            <FormField label="Version">
              <Input
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="Ex. 2024, v3.1…"
              />
            </FormField>
          </div>
          <FormField label="Libellé" required>
            <Input
              value={form.libelle}
              onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
              placeholder="Ex. Norme OMS 2024 pour la qualité des eaux usées"
            />
          </FormField>
          <FormField label="Organisme émetteur" hint="Ex. OMS, ANPE Mali, ISO, Gouvernement du Mali…">
            <Input
              value={form.organisme}
              onChange={(e) => setForm((f) => ({ ...f, organisme: e.target.value }))}
              placeholder="Ex. OMS"
            />
          </FormField>
          <div className={styles.formGrid}>
            <FormField label="Début de validité">
              <Input
                type="date"
                value={form.dateDebutValidite}
                onChange={(e) => setForm((f) => ({ ...f, dateDebutValidite: e.target.value }))}
              />
            </FormField>
            <FormField label="Fin de validité">
              <Input
                type="date"
                value={form.dateFinValidite}
                onChange={(e) => setForm((f) => ({ ...f, dateFinValidite: e.target.value }))}
              />
            </FormField>
          </div>
          <Checkbox
            label="Norme active"
            checked={form.actif}
            onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
          />
        </div>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !form.code.trim() || !form.libelle.trim()}
          >
            {isPending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Onglet Seuils ─────────────────────────────────────────────────────────────

const MILIEU_OPTIONS = [
  { value: '',            label: '— Milieu non précisé —' },
  { value: 'EAU_USEE',   label: 'Eaux usées' },
  { value: 'EAU_SURFACE',label: 'Eaux de surface' },
  { value: 'EAU_POTABLE',label: 'Eau potable' },
  { value: 'AIR_AMBIANT',label: 'Air ambiant' },
  { value: 'SOL',        label: 'Sol' },
];

interface SeuilsTabProps {
  seuils: SeuilNormatif[];
  parametres: ParametreAnalyse[];
  normes: NormeReference[];
  nonConfigures?: { total: number; resultats: Array<{ id: number; libelle: string; domaine: string }> };
  isLoading: boolean;
}

function SeuilsTab({ seuils, parametres, normes, nonConfigures, isLoading }: SeuilsTabProps) {
  const [q, setQ]             = useState('');
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState<SeuilNormatif | null>(null);
  const [form, setForm]       = useState({
    parametreId: '',
    valeurMin: '',
    valeurMax: '',
    unite: '',            // plain string ex. "mg/L"
    normeReferenceIri: '', // IRI ex. "/api/norme_references/uuid"
    milieu: '',
    commentaire: '',
    actif: true,
  });

  const createMut = useCreateSeuilNormatif();
  const updateMut = useUpdateSeuilNormatif();
  const deleteMut = useDeleteSeuilNormatif();

  const parametreOptions = [
    { value: '', label: '— Sélectionner un paramètre —' },
    ...parametres.map((p) => ({ value: String(p.id), label: `${p.nom} (${CAT_LABEL[p.categorie] ?? p.categorie})` })),
  ];

  const normeOptions = [
    { value: '', label: '— Aucune norme liée —' },
    ...normes.map((n) => ({ value: `/api/norme_references/${n.id}`, label: `${n.code} — ${n.libelle}` })),
  ];

  const filtered = useMemo(() => {
    if (!q.trim()) return seuils;
    const s = q.toLowerCase();
    return seuils.filter((s_) => {
      const pId = s_.parametreAnalyse.split('/').pop();
      const p = parametres.find((p_) => String(p_.id) === pId);
      return (p?.nom ?? '').toLowerCase().includes(s) || (s_.commentaire ?? '').toLowerCase().includes(s);
    });
  }, [seuils, q, parametres]);

  function openCreate() {
    setEditing(null);
    setForm({ parametreId: '', valeurMin: '', valeurMax: '', unite: '', normeReferenceIri: '', milieu: '', commentaire: '', actif: true });
    setModal(true);
  }

  function openEdit(s: SeuilNormatif) {
    setEditing(s);
    const pId = s.parametreAnalyse.split('/').pop() ?? '';
    setForm({
      parametreId: pId,
      valeurMin: s.valeurMin ?? '',
      valeurMax: s.valeurMax ?? '',
      unite: s.unite ?? '',
      normeReferenceIri: s.normeReference ?? '',
      milieu: s.milieu ?? '',
      commentaire: s.commentaire ?? '',
      actif: s.actif,
    });
    setModal(true);
  }

  async function handleSave() {
    const payload: Parameters<typeof createMut.mutateAsync>[0] = {
      parametreAnalyse: iriOf('parametre_analyses', form.parametreId),
      valeurMin: form.valeurMin || undefined,
      valeurMax: form.valeurMax || undefined,
      unite: form.unite || undefined,
      normeReference: form.normeReferenceIri || null,
      milieu: form.milieu || undefined,
      commentaire: form.commentaire || undefined,
      actif: form.actif,
    };
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModal(false);
  }

  function handleDelete(s: SeuilNormatif) {
    const pId = s.parametreAnalyse.split('/').pop();
    const p = parametres.find((p_) => String(p_.id) === pId);
    if (!confirm(`Supprimer le seuil pour "${p?.nom ?? 'ce paramètre'}" ?`)) return;
    deleteMut.mutate(s.id);
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const nonConfigCount = nonConfigures?.total ?? 0;

  return (
    <>
      {nonConfigCount > 0 && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={16} />
          <span>
            <strong>{nonConfigCount} paramètre{nonConfigCount > 1 ? 's' : ''}</strong> sans seuil configuré.
            Les résultats d'analyse pour ces paramètres ne seront pas comparés à une norme.
          </span>
        </div>
      )}

      <div className={styles.toolbarRow}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un seuil…"
          />
        </div>
        <div className={styles.toolbarRight}>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Nouveau seuil
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Gauge size={24} />}
          title="Aucun seuil configuré"
          description={
            nonConfigCount > 0
              ? `${nonConfigCount} paramètres attendent leur seuil. Cliquez sur « Nouveau seuil » pour commencer.`
              : "Créez des seuils normatifs pour permettre la détection automatique des dépassements."
          }
          action={
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
              Configurer le premier seuil
            </Button>
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Catégorie</th>
                <th>Milieu</th>
                <th>Min</th>
                <th>Max</th>
                <th>Unité</th>
                <th>Norme</th>
                <th className={styles.centerCell}>Actif</th>
                <th className={styles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const pId = s.parametreAnalyse.split('/').pop();
                const p = parametres.find((p_) => String(p_.id) === pId);
                const normeObj = normes.find((n) => `/api/norme_references/${n.id}` === s.normeReference);
                const milieuLabel = MILIEU_OPTIONS.find((m) => m.value === s.milieu)?.label ?? s.milieu ?? '—';
                return (
                  <tr key={s.id}>
                    <td><span className={styles.label}>{p?.nom ?? pId}</span></td>
                    <td>
                      {p && (
                        <span className={styles.catBadge} data-cat={p.categorie}>
                          {CAT_LABEL[p.categorie] ?? p.categorie}
                        </span>
                      )}
                    </td>
                    <td className={styles.muted}>{milieuLabel}</td>
                    <td className={styles.muted}>{s.valeurMin ?? '—'}</td>
                    <td className={styles.muted}>{s.valeurMax ?? '—'}</td>
                    <td className={styles.muted}>
                      {s.unite ? <code className={styles.code}>{s.unite}</code> : '—'}
                    </td>
                    <td className={styles.muted}>
                      {normeObj ? <code className={styles.code}>{normeObj.code}</code> : '—'}
                    </td>
                    <td className={styles.centerCell}>
                      <span className={s.actif ? styles.dotOn : styles.dotOff} />
                    </td>
                    <td className={styles.actionsCell}>
                      <button className={styles.iconBtn} title="Modifier" onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="Supprimer"
                        onClick={() => handleDelete(s)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModal(false)}
        title={editing ? 'Modifier le seuil' : 'Nouveau seuil normatif'}
        width={620}
      >
        <div className={styles.modalBody}>
          <FormField label="Paramètre d'analyse" required>
            <Select<string>
              value={form.parametreId}
              onChange={(v) => setForm((f) => ({ ...f, parametreId: v }))}
              options={parametreOptions}
            />
          </FormField>
          <div className={styles.formGrid}>
            <FormField label="Milieu">
              <Select<string>
                value={form.milieu}
                onChange={(v) => setForm((f) => ({ ...f, milieu: v }))}
                options={MILIEU_OPTIONS}
              />
            </FormField>
            <FormField label="Norme de référence">
              <Select<string>
                value={form.normeReferenceIri}
                onChange={(v) => setForm((f) => ({ ...f, normeReferenceIri: v }))}
                options={normeOptions}
              />
            </FormField>
          </div>
          <div className={styles.formGrid}>
            <FormField label="Valeur minimale" hint="Laisser vide si pas de minimum.">
              <Input
                type="number"
                value={form.valeurMin}
                onChange={(e) => setForm((f) => ({ ...f, valeurMin: e.target.value }))}
                placeholder="Ex. 5"
              />
            </FormField>
            <FormField label="Valeur maximale" hint="Laisser vide si pas de maximum.">
              <Input
                type="number"
                value={form.valeurMax}
                onChange={(e) => setForm((f) => ({ ...f, valeurMax: e.target.value }))}
                placeholder="Ex. 60"
              />
            </FormField>
          </div>
          <FormField label="Unité" hint="Ex. mg/L, NTU, °C… Saisie libre.">
            <Input
              value={form.unite}
              onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}
              placeholder="Ex. mg/L"
            />
          </FormField>
          <FormField label="Commentaire" hint="Optionnel — contexte d'application.">
            <Textarea
              value={form.commentaire}
              onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))}
              rows={2}
              placeholder="Ex. Norme de rejet du Mali pour la DBO5"
            />
          </FormField>
          <Checkbox
            label="Seuil actif"
            checked={form.actif}
            onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
          />
        </div>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !form.parametreId}
          >
            {isPending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Utilitaire ────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} height={44} />
      ))}
    </div>
  );
}
