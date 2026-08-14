import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import {
  Button,
  Select,
  Skeleton,
  FormField,
  Spinner,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { useFormulaire, useSubmitFormulaire } from '../hooks/useFormulaires';
import { DynamicField } from '../components/DynamicField';
import type { DynamicFieldValue } from '../components/DynamicField';
import type { SoumissionReponseInput } from '../api/formulaires';
import styles from './FormulaireCollectePage.module.css';

type FormState = Record<number, DynamicFieldValue>;
type ErrorState = Record<number, string>;

export function FormulaireCollectePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: formulaire, isLoading, isError } = useFormulaire(id);
  const { data: sitesData } = useSites();
  const submit = useSubmitFormulaire();

  /* ── Brouillon local ──
   *  Une collecte se remplit debout, sur le terrain, parfois en plusieurs
   *  fois. Rien ne la sauvegardait : une expiration de session, un onglet
   *  ferme par megarde ou une tablette qui se verrouille suffisaient a tout
   *  perdre. La saisie est desormais conservee sur l'appareil, et proposee au
   *  retour sur le meme formulaire.
   *
   *  Volontairement local : aucun aller-retour serveur, donc cela fonctionne
   *  aussi hors couverture reseau. */
  const cleBrouillon = `paset:brouillon:${id ?? 'inconnu'}`;

  const [siteId, setSiteId] = useState(searchParams.get('siteId') ?? '');
  const [values, setValues] = useState<FormState>(() => {
    try {
      const brut = localStorage.getItem(cleBrouillon);
      return brut ? (JSON.parse(brut) as FormState) : {};
    } catch {
      /* Stockage indisponible ou brouillon illisible : on repart a vide
       * plutot que d'empecher la saisie. */
      return {};
    }
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    try {
      if (Object.keys(values).length > 0) {
        localStorage.setItem(cleBrouillon, JSON.stringify(values));
      }
    } catch {
      /* Quota depasse ou mode prive : la saisie continue sans filet. */
    }
  }, [values, submitted, cleBrouillon]);

  /* ── Acquisition GPS de la visite ── */
  const acquireGps = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  /* ── Champs actifs triés ── */
  const champsActifs = useMemo(
    () =>
      (formulaire?.champs ?? [])
        .filter((c) => c.actif)
        .sort((a, b) => a.ordre - b.ordre),
    [formulaire],
  );

  /* ── Mise à jour valeur champ ── */
  const handleChange = useCallback(
    (champId: number, value: DynamicFieldValue) => {
      setValues((prev) => ({ ...prev, [champId]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[champId];
        return next;
      });
    },
    [],
  );

  /* ── Validation avant soumission ── */
  const validate = useCallback((): boolean => {
    const next: ErrorState = {};
    champsActifs.forEach((champ) => {
      if (!champ.obligatoire) return;
      const val = values[champ.id];
      const hasValue =
        (val?.valeurTexte?.trim() ||
          val?.valeurNombre?.trim() ||
          val?.valeurDate ||
          val?.fichierUrl ||
          (val?.valeurJson && val.valeurJson.length > 0)) ?? false;
      if (!hasValue) {
        next[champ.id] = 'Ce champ est obligatoire.';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [champsActifs, values]);

  /* ── Soumission ── */
  const handleSubmit = useCallback(async () => {
    if (!formulaire) return;
    if (!siteId) {
      setErrors((prev) => ({ ...prev, _site: 'Veuillez sélectionner un site.' as unknown as string }));
      return;
    }
    if (!validate()) return;

    const reponses: SoumissionReponseInput[] = champsActifs.map((champ) => ({
      champId: champ.id,
      ...values[champ.id],
    }));

    await submit.mutateAsync({
      input: {
        formulaireId: formulaire.id,
        siteTeinture: siteId,
        soumisPar: user?.fullName ?? user?.email ?? 'Inconnu',
        source: 'plateforme',
        latitude: gpsPosition?.lat,
        longitude: gpsPosition?.lng,
      },
      reponses,
    });

    /* Envoi accepte : le brouillon n'a plus lieu d'etre. */
    try {
      localStorage.removeItem(cleBrouillon);
    } catch {
      /* Sans consequence : le brouillon sera ecrase a la prochaine saisie. */
    }
    setSubmitted(true);
  }, [formulaire, siteId, validate, champsActifs, values, submit, user, gpsPosition]);

  /* ── Écran de succès ── */
  if (submitted) {
    return (
      <div className={styles.successScreen}>
        <CheckCircle size={48} className={styles.successIcon} />
        <h2 className={styles.successTitle}>Formulaire soumis avec succès</h2>
        <p className={styles.successDesc}>
          Votre saisie a été enregistrée et transmise.
        </p>
        <div className={styles.successActions}>
          <Button variant="primary" onClick={() => navigate('/formulaires')}>
            Retour aux formulaires
          </Button>
          <Button variant="ghost" onClick={() => navigate('/formulaires/soumissions')}>
            Voir mes soumissions
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={40} radius={8} />
        <Skeleton height={200} radius={12} />
        <Skeleton height={200} radius={12} />
      </div>
    );
  }

  if (isError || !formulaire) {
    return (
      <div className={styles.errorScreen}>
        <AlertCircle size={40} />
        <p>Formulaire introuvable.</p>
        <Link to="/formulaires">
          <Button variant="ghost">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  const siteOptions = [
    { value: '', label: '— Sélectionner un site —' },
    ...(sitesData?.items.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];

  const siteError = (errors as Record<string, string>)['_site'];

  return (
    <div className={styles.page}>
      {/* En-tête */}
      <header className={styles.header}>
        <Link to="/formulaires" className={styles.backLink}>
          <ChevronLeft size={16} />
          Formulaires
        </Link>
        <div className={styles.headerMeta}>
          <span className={styles.formulaireType}>{formulaire.typeFormulaire}</span>
          <span className={styles.version}>v{formulaire.version}</span>
        </div>
        <h1 className={styles.titre}>{formulaire.titre}</h1>
        {formulaire.description ? (
          <p className={styles.description}>{formulaire.description}</p>
        ) : null}
      </header>

      {/* Corps du formulaire */}
      <div className={styles.formBody}>
        {/* Bloc contexte : site + GPS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contexte de la visite</h2>

          <FormField
            label="Site de teinture"
            required
            error={siteError}
          >
            <Select<string>
              value={siteId}
              onChange={setSiteId}
              options={siteOptions}
            />
          </FormField>

          <div className={styles.gpsRow}>
            <div className={styles.gpsInfo}>
              <MapPin size={14} />
              {gpsPosition
                ? `GPS : ${gpsPosition.lat.toFixed(5)}, ${gpsPosition.lng.toFixed(5)}`
                : 'Position GPS non acquise'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={acquireGps}
              iconLeft={<MapPin size={14} />}
            >
              {gpsPosition ? 'Actualiser' : 'Localiser'}
            </Button>
          </div>
        </section>

        {/* Champs dynamiques */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Données terrain
            <span className={styles.champsCount}>
              {champsActifs.length} champ{champsActifs.length > 1 ? 's' : ''}
            </span>
          </h2>

          <div className={styles.fields}>
            {champsActifs.map((champ) => (
              <DynamicField
                key={champ.id}
                champ={champ}
                value={values[champ.id] ?? {}}
                onChange={(val) => handleChange(champ.id, val)}
                error={errors[champ.id]}
                disabled={submit.isPending}
              />
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <Link to="/formulaires">
            <Button variant="ghost" disabled={submit.isPending}>
              Annuler
            </Button>
          </Link>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submit.isPending}
            iconLeft={submit.isPending ? <Spinner size={16} /> : undefined}
          >
            {submit.isPending ? 'Envoi en cours…' : 'Soumettre'}
          </Button>
        </div>

        {submit.isError ? (
          <p className={styles.submitError} role="alert">
            <AlertCircle size={14} />
            Une erreur est survenue lors de la soumission. Réessayez.
          </p>
        ) : null}
      </div>
    </div>
  );
}
