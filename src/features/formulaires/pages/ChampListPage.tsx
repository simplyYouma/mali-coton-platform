import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import {
  Button,
  Badge,
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  Modal,
  Skeleton,
} from '@/components/common';
import {
  useFormulaire,
  useChamps,
  useCreateChamp,
  useUpdateChamp,
  useDeleteChamp,
} from '../hooks/useFormulaires';
import {
  TYPE_CHAMP_LABEL,
  TYPE_CHAMP_OPTIONS,
  HAS_OPTIONS,
  type ChampFormulaire,
  type ChampInput,
  type ChampUpdateInput,
  type TypeChamp,
} from '../api/formulaires.types';
import { iriOf } from '@/lib/jsonld';
import styles from './ChampListPage.module.css';

/* ── Couleurs par type ── */
const TYPE_COLOR: Partial<Record<TypeChamp, 'info' | 'warning' | 'success' | 'neutral'>> = {
  texte: 'info',
  textarea: 'info',
  nombre: 'warning',
  date: 'warning',
  select: 'success',
  radio: 'success',
  checkbox: 'success',
  fichier: 'neutral',
  geo: 'neutral',
};

/* ── Valeur vide pour le formulaire champ ── */
function emptyChamp(ordre: number, formulaireIri: string): ChampInput {
  return {
    formulaire: formulaireIri,
    libelle: '',
    code: '',
    typeChamp: 'texte',
    obligatoire: false,
    ordre,
    aide: '',
    optionsJson: [],
    valeurParDefaut: '',
    actif: true,
  };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function ChampListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: formulaire } = useFormulaire(id);
  const { data: champsPage, isLoading } = useChamps(id);
  const createMut = useCreateChamp();
  const updateMut = useUpdateChamp();
  const deleteMut = useDeleteChamp();

  const formulaireIri = id ? iriOf('formulaire_collectes', id) : '';
  const champs = [...(champsPage?.items ?? [])].sort((a, b) => a.ordre - b.ordre);

  /* ── Modal état ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChampInput>(emptyChamp(champs.length + 1, formulaireIri));
  const [optionsText, setOptionsText] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ChampInput, string>>>({});
  const [codeManual, setCodeManual] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyChamp(champs.length + 1, formulaireIri));
    setOptionsText('');
    setCodeManual(false);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: ChampFormulaire) => {
    setEditingId(String(c.id));
    setDraft({
      formulaire: formulaireIri,
      libelle: c.libelle,
      code: c.code,
      typeChamp: c.typeChamp,
      obligatoire: c.obligatoire,
      ordre: c.ordre,
      aide: c.aide ?? '',
      optionsJson: c.optionsJson ?? [],
      valeurParDefaut: c.valeurParDefaut ?? '',
      actif: c.actif,
    });
    setOptionsText((c.optionsJson ?? []).join('\n'));
    setCodeManual(true);
    setErrors({});
    setModalOpen(true);
  };

  const setDraftField = <K extends keyof ChampInput>(key: K, value: ChampInput[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'libelle' && !codeManual) {
        next.code = slugify(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!draft.libelle.trim()) e.libelle = 'Le libellé est requis.';
    if (!draft.code.trim()) e.code = 'Le code est requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const options = optionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = { ...draft, optionsJson: HAS_OPTIONS.includes(draft.typeChamp) ? options : [] };

    if (editingId) {
      const { formulaire: _f, ...updatePayload } = payload;
      await updateMut.mutateAsync({ id: editingId, input: updatePayload as ChampUpdateInput });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = (c: ChampFormulaire) => {
    if (!confirm(`Supprimer le champ "${c.libelle}" ?`)) return;
    deleteMut.mutate(String(c.id));
  };

  const moveUp = async (c: ChampFormulaire, idx: number) => {
    if (idx === 0) return;
    const prev = champs[idx - 1]!;
    await Promise.all([
      updateMut.mutateAsync({ id: String(c.id), input: { ordre: prev.ordre } }),
      updateMut.mutateAsync({ id: String(prev.id), input: { ordre: c.ordre } }),
    ]);
  };

  const moveDown = async (c: ChampFormulaire, idx: number) => {
    if (idx === champs.length - 1) return;
    const next = champs[idx + 1]!;
    await Promise.all([
      updateMut.mutateAsync({ id: String(c.id), input: { ordre: next.ordre } }),
      updateMut.mutateAsync({ id: String(next.id), input: { ordre: c.ordre } }),
    ]);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/admin/formulaires')}>
          <ArrowLeft size={16} /> Retour aux formulaires
        </button>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>
            {formulaire?.titre ?? 'Champs du formulaire'}
          </h1>
          {formulaire && (
            <div className={styles.meta}>
              <span className={styles.metaItem}>Code&nbsp;: <code>{formulaire.code}</code></span>
              <span className={styles.metaItem}>v{formulaire.version}</span>
              <Link to={`/admin/formulaires/${id}/editer`} className={styles.editLink}>
                <Pencil size={12} /> Modifier les infos
              </Link>
            </div>
          )}
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Ajouter un champ
        </Button>
      </div>

      {/* Liste des champs */}
      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} />)}
        </div>
      ) : champs.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucun champ. Commencez par en ajouter un.</p>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Ajouter un champ
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {champs.map((c, idx) => (
            <div key={c.id} className={styles.champRow}>
              <div className={styles.orderCol}>
                <GripVertical size={14} className={styles.grip} />
                <span className={styles.ordre}>{c.ordre}</span>
              </div>
              <div className={styles.typeCol}>
                <Badge
                  variant={TYPE_COLOR[c.typeChamp] ?? 'neutral'}
                  size="sm"
                >
                  {TYPE_CHAMP_LABEL[c.typeChamp] ?? c.typeChamp}
                </Badge>
              </div>
              <div className={styles.infoCol}>
                <span className={styles.libelle}>{c.libelle}</span>
                <span className={styles.code}>{c.code}</span>
                {c.aide ? <span className={styles.aide}>{c.aide}</span> : null}
              </div>
              <div className={styles.flagsCol}>
                {c.obligatoire && (
                  <span className={styles.flagRequired}>Requis</span>
                )}
                {!c.actif && (
                  <span className={styles.flagInactive}>Inactif</span>
                )}
                {HAS_OPTIONS.includes(c.typeChamp) && (c.optionsJson?.length ?? 0) > 0 && (
                  <span className={styles.flagOptions}>
                    {c.optionsJson!.length} option{c.optionsJson!.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className={styles.actionsCol}>
                <button
                  className={styles.btn}
                  onClick={() => moveUp(c, idx)}
                  disabled={idx === 0 || updateMut.isPending}
                  title="Monter"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  className={styles.btn}
                  onClick={() => moveDown(c, idx)}
                  disabled={idx === champs.length - 1 || updateMut.isPending}
                  title="Descendre"
                >
                  <ChevronDown size={14} />
                </button>
                <button className={styles.btn} onClick={() => openEdit(c)} title="Éditer">
                  <Pencil size={14} />
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => handleDelete(c)}
                  disabled={deleteMut.isPending}
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal créer / éditer champ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier le champ' : 'Nouveau champ'}
        size="lg"
      >
        <div className={styles.modalBody}>
          <div className={styles.modalGrid2}>
            <FormField label="Libellé" required error={errors.libelle}>
              <Input
                value={draft.libelle}
                onChange={(e) => setDraftField('libelle', e.target.value)}
                placeholder="Ex. Nom du responsable"
                autoFocus
              />
            </FormField>
            <FormField label="Code technique" required error={errors.code} hint="Identifiant unique dans ce formulaire.">
              <Input
                value={draft.code}
                onChange={(e) => { setCodeManual(true); setDraftField('code', e.target.value); }}
                placeholder="Ex. nom_responsable"
              />
            </FormField>
          </div>

          <div className={styles.modalGrid2}>
            <FormField label="Type de champ" required>
              <Select<TypeChamp>
                value={draft.typeChamp}
                onChange={(v) => setDraftField('typeChamp', v)}
                options={TYPE_CHAMP_OPTIONS}
              />
            </FormField>
            <FormField label="Ordre">
              <Input
                type="number"
                value={String(draft.ordre)}
                onChange={(e) => setDraftField('ordre', Number(e.target.value))}
                min={1}
              />
            </FormField>
          </div>

          <FormField label="Texte d'aide" hint="Affiché sous le champ pour guider l'agent.">
            <Input
              value={draft.aide ?? ''}
              onChange={(e) => setDraftField('aide', e.target.value)}
              placeholder="Ex. Saisir la valeur en mg/L"
            />
          </FormField>

          {HAS_OPTIONS.includes(draft.typeChamp) && (
            <FormField
              label="Options"
              required
              hint="Une option par ligne."
            >
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={5}
                placeholder={'Option 1\nOption 2\nOption 3'}
              />
            </FormField>
          )}

          <FormField label="Valeur par défaut">
            <Input
              value={draft.valeurParDefaut ?? ''}
              onChange={(e) => setDraftField('valeurParDefaut', e.target.value)}
              placeholder="Optionnel"
            />
          </FormField>

          <div className={styles.modalFlags}>
            <Checkbox
              label="Champ obligatoire"
              checked={draft.obligatoire}
              onChange={(e) => setDraftField('obligatoire', e.target.checked)}
            />
            <Checkbox
              label="Champ actif"
              checked={draft.actif ?? true}
              onChange={(e) => setDraftField('actif', e.target.checked)}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter le champ'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
