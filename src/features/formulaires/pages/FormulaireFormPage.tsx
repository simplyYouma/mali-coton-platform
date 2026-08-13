import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { Button, FormField, Input, Textarea, Select } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import {
  useFormulaire,
  useCreateFormulaire,
  useUpdateFormulaire,
  useFormulaires,
} from '../hooks/useFormulaires';
import type { FormulaireInput, StatutFormulaire } from '../api/formulaires.types';
import styles from './FormulaireFormPage.module.css';

const STATUT_OPTIONS: Array<{ value: StatutFormulaire; label: string }> = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'archive', label: 'Archivé' },
];

const TYPE_FORMULAIRE_OPTIONS = [
  { value: '', label: '— Choisir un type —' },
  { value: 'visite_initiale', label: 'Visite initiale' },
  { value: 'controle_mensuel', label: 'Contrôle mensuel' },
  { value: 'signalement_incident', label: 'Signalement incident' },
  { value: 'audit_annuel', label: 'Audit annuel' },
  { value: 'prelevement', label: 'Prélèvement' },
  { value: 'autre', label: 'Autre' },
];

const empty: FormulaireInput = {
  titre: '',
  code: '',
  description: '',
  typeFormulaire: '',
  statut: 'brouillon',
  version: 1,
  actif: false,
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function FormulaireFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: existing, isLoading } = useFormulaire(id);
  const createMut = useCreateFormulaire();
  const updateMut = useUpdateFormulaire();

  const [form, setForm] = useState<FormulaireInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormulaireInput, string>>>({});
  const toast = useToast();
  /* Liste chargee pour verifier l'unicite du code sans aller-retour serveur. */
  const { data: listeFormulaires } = useFormulaires();
  const formulaires = listeFormulaires?.items ?? [];
  const [codeManual, setCodeManual] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        titre: existing.titre,
        code: existing.code,
        description: existing.description ?? '',
        typeFormulaire: existing.typeFormulaire,
        statut: existing.statut,
        version: existing.version,
        actif: existing.actif,
      });
      setCodeManual(true);
    }
  }, [existing]);

  const set = <K extends keyof FormulaireInput>(key: K, value: FormulaireInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'titre' && !codeManual) {
        next.code = slugify(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /* Le code sert d'identifiant technique : il se retrouve dans les URLs, les
   * exports et les jointures. L'aide annoncait « sans accents ni espaces »
   * sans que rien ne le verifie, et « unique » sans qu'aucune unicite ne soit
   * controlee. Un doublon partait donc au backend, dont le refus etait
   * silencieux. */
  const CODE_ATTENDU = /^[A-Za-z0-9_]+$/;

  const validate = (): boolean => {
    const e: typeof errors = {};
    const titre = form.titre.trim();
    const code = form.code.trim();

    if (!titre) e.titre = 'Le titre est requis.';
    if (!code) {
      e.code = 'Le code est requis.';
    } else if (!CODE_ATTENDU.test(code)) {
      e.code = 'Lettres non accentuées, chiffres et tirets bas uniquement — ni espace ni accent.';
    } else if (
      formulaires.some(
        (f) => String(f.id) !== String(id) && f.code.toLowerCase() === code.toLowerCase(),
      )
    ) {
      e.code = 'Ce code est déjà utilisé par un autre formulaire.';
    }

    if (!form.typeFormulaire) e.typeFormulaire = 'Le type est requis.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    /* Sans ce filet, un refus du backend — code deja pris, champ invalide,
     * coupure reseau — rejetait la promesse sans que rien ne s'affiche :
     * le bouton cessait de tourner, aucun message, aucune navigation, et
     * l'utilisateur croyait sa saisie perdue. */
    try {
      if (isEdit && id) {
        await updateMut.mutateAsync({ id, input: form });
        toast.success('Formulaire enregistré.');
        navigate(`/admin/formulaires/${id}/champs`);
      } else {
        const created = await createMut.mutateAsync(form);
        toast.success('Formulaire créé.');
        navigate(`/admin/formulaires/${created.id}/champs`);
      }
    } catch (erreur) {
      const message =
        erreur instanceof Error && erreur.message
          ? erreur.message
          : "L'enregistrement a échoué. Vérifiez votre connexion et réessayez.";
      toast.error(message);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/admin/formulaires')}>
          <ArrowLeft size={16} /> Retour
        </button>
        <div className={styles.headerMain}>
          <span className={styles.eyebrow}>
            <ClipboardList size={14} /> Formulaires
          </span>
          <h1 className={styles.title}>
            {isEdit ? `Éditer — ${existing?.titre ?? ''}` : 'Nouveau formulaire'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Informations générales</h2>
          <div className={styles.grid2}>
            <FormField label="Titre" required error={errors.titre}>
              <Input
                value={form.titre}
                onChange={(e) => set('titre', e.target.value)}
                placeholder="Ex. Fiche visite initiale site"
              />
            </FormField>
            <FormField label="Code technique" required error={errors.code} hint="Identifiant unique, sans accents ni espaces.">
              <Input
                value={form.code}
                onChange={(e) => { setCodeManual(true); set('code', e.target.value); }}
                placeholder="Ex. visite_initiale_site"
              />
            </FormField>
          </div>
          <FormField label="Description" hint="Optionnelle — visible des agents.">
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Décrivez l'usage de ce formulaire…"
            />
          </FormField>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuration</h2>
          <div className={styles.grid3}>
            <FormField label="Type de formulaire" required error={errors.typeFormulaire}>
              <Select<string>
                value={form.typeFormulaire}
                onChange={(v) => set('typeFormulaire', v)}
                options={TYPE_FORMULAIRE_OPTIONS}
              />
            </FormField>
            <FormField label="Statut">
              <Select<StatutFormulaire>
                value={form.statut}
                onChange={(v) => set('statut', v)}
                options={STATUT_OPTIONS}
              />
            </FormField>
            <FormField label="Version" hint="Incrémenter à chaque révision majeure.">
              <Input
                type="number"
                value={String(form.version ?? 1)}
                onChange={(e) => set('version', Number(e.target.value))}
                min={1}
              />
            </FormField>
          </div>
          <div className={styles.toggle}>
            <input
              type="checkbox"
              id="actif"
              checked={form.actif ?? false}
              onChange={(e) => set('actif', e.target.checked)}
            />
            <label htmlFor="actif">
              <span className={styles.toggleLabel}>Actif</span>
              <span className={styles.toggleHint}>
                Un formulaire actif et publié est visible des agents.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/formulaires')}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" iconLeft={<Save size={16} />} disabled={isPending}>
            {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le formulaire'}
          </Button>
        </div>
      </form>
    </div>
  );
}
