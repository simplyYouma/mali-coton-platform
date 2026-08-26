import { useCallback, useId, useRef, useState, type ReactElement } from 'react';
import { AlertTriangle, MapPin, Paperclip, X } from 'lucide-react';
import { FormField, Input, Textarea, Select, Checkbox, Radio, Spinner } from '@/components/common';
import { useOptionsReference } from '../hooks/useFormulairesNatifs';
import { basculerChoixMultiple } from '../lib/logiqueChamp';
import {
  isGeopoint,
  type ChampNatif,
  type Geopoint,
  type OptionChamp,
  type ValeurChamp,
} from '../api/formulairesNatifs.types';
import styles from './ChampNatifField.module.css';

/** Au-delà de ce nombre d'options, la liste déroulante devient plus lisible que les radios. */
const SEUIL_RADIO = 5;

interface ChampNatifFieldProps {
  champ: ChampNatif;
  valeur: ValeurChamp | undefined;
  onChange: (valeur: ValeurChamp) => void;
  erreur?: string;
  /** Message non bloquant (cohérence métier). */
  alerte?: string;
  disabled?: boolean;
  /** Requis pour l'upload des champs FICHIER — absent tant qu'il n'y a pas de brouillon. */
  onUploadFichier?: (fichier: File) => Promise<void>;
}

export function ChampNatifField({
  champ,
  valeur,
  onChange,
  erreur,
  alerte,
  disabled,
  onUploadFichier,
}: ChampNatifFieldProps) {
  const id = useId();

  /* Options dynamiques : la requête est mutualisée par endpoint dans le hook,
   * plusieurs champs visant la même ressource ne déclenchent qu'un appel. */
  const {
    data: optionsDistantes,
    isLoading: optionsChargement,
    isError: optionsErreur,
  } = useOptionsReference(champ.optionsSource);

  const options: OptionChamp[] = champ.optionsSource
    ? (optionsDistantes ?? [])
    : champ.options;

  const rendre = (): ReactElement => {
    switch (champ.type) {
      case 'TEXTE':
        return (
          <Input
            id={id}
            value={typeof valeur === 'string' ? valeur : ''}
            onChange={(e) => onChange(e.target.value)}
            invalid={Boolean(erreur)}
            disabled={disabled}
          />
        );

      case 'TEXTE_LONG':
        return (
          <Textarea
            id={id}
            rows={4}
            value={typeof valeur === 'string' ? valeur : ''}
            onChange={(e) => onChange(e.target.value)}
            invalid={Boolean(erreur)}
            disabled={disabled}
          />
        );

      case 'ENTIER':
      case 'DECIMAL':
        return (
          <Input
            id={id}
            type="number"
            step={champ.type === 'ENTIER' ? 1 : 'any'}
            /* Clavier numérique sur mobile : la saisie se fait sur le terrain. */
            inputMode={champ.type === 'ENTIER' ? 'numeric' : 'decimal'}
            value={valeur === null || valeur === undefined ? '' : String(valeur)}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === '' ? null : Number(v.replace(',', '.')));
            }}
            invalid={Boolean(erreur)}
            disabled={disabled}
          />
        );

      case 'DATE':
        return (
          <Input
            id={id}
            type="date"
            value={typeof valeur === 'string' ? valeur : ''}
            onChange={(e) => onChange(e.target.value)}
            invalid={Boolean(erreur)}
            disabled={disabled}
          />
        );

      case 'GEOPOINT':
        return (
          <GpsChamp
            valeur={isGeopoint(valeur) ? valeur : null}
            onChange={onChange}
            disabled={disabled}
          />
        );

      case 'CHOIX_SIMPLE': {
        if (champ.optionsSource && (optionsChargement || optionsErreur)) {
          return <EtatOptions chargement={optionsChargement} permission={champ.optionsSource.permission} />;
        }
        const val = typeof valeur === 'string' ? valeur : '';
        // Peu d'options : tout montrer évite un tap supplémentaire sur le terrain.
        if (options.length > 0 && options.length <= SEUIL_RADIO) {
          return (
            <div className={styles.choixGroupe} role="radiogroup" aria-labelledby={`${id}-label`}>
              {options.map((o) => (
                <Radio
                  key={o.value}
                  name={champ.code}
                  label={o.label}
                  value={o.value}
                  checked={val === o.value}
                  onChange={() => onChange(o.value)}
                  disabled={disabled}
                />
              ))}
            </div>
          );
        }
        return (
          <Select
            id={id}
            value={val || null}
            onChange={(v) => onChange(v)}
            options={options}
            placeholder={options.length === 0 ? 'Aucune option' : 'Sélectionner…'}
            disabled={disabled || options.length === 0}
            invalid={Boolean(erreur)}
            fullWidth
          />
        );
      }

      case 'CHOIX_MULTIPLE': {
        if (champ.optionsSource && (optionsChargement || optionsErreur)) {
          return <EtatOptions chargement={optionsChargement} permission={champ.optionsSource.permission} />;
        }
        const selection = Array.isArray(valeur) ? valeur : [];
        return (
          <div className={styles.choixGroupe}>
            {options.map((o) => (
              <Checkbox
                key={o.value}
                label={o.label}
                checked={selection.includes(o.value)}
                onChange={(e) =>
                  /* « Aucun » est exclusif : la règle vit dans logiqueChamp
                   * pour rester vraie aussi sur les champs créés plus tard. */
                  onChange(basculerChoixMultiple(selection, o.value, e.target.checked))
                }
                disabled={disabled}
              />
            ))}
          </div>
        );
      }

      case 'FICHIER':
        return (
          <FichierChamp
            valeur={typeof valeur === 'string' ? valeur : null}
            onChange={onChange}
            onUpload={onUploadFichier}
            disabled={disabled}
          />
        );

      default:
        // Type inconnu (schéma plus récent que le client) : on le signale au
        // lieu d'afficher un champ muet que l'agent croirait facultatif.
        return (
          <div className={`${styles.etatOptions} ${styles.etatOptionsErreur}`} role="alert">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>Type de champ non pris en charge ({champ.type}).</span>
          </div>
        );
    }
  };

  return (
    <div className={styles.champ}>
      <FormField
        label={champ.libelle}
        required={champ.obligatoire}
        hint={champ.aide ?? undefined}
        error={erreur}
      >
        {rendre()}
      </FormField>
      {alerte && !erreur ? (
        <p className={styles.alerte}>
          <AlertTriangle size={13} aria-hidden="true" />
          {alerte}
        </p>
      ) : null}
    </div>
  );
}

/* ── Liste dynamique : chargement / indisponible ── */

function EtatOptions({ chargement, permission }: { chargement: boolean; permission: string }) {
  if (chargement) {
    return (
      <div className={styles.etatOptions}>
        <Spinner size={14} decoratif />
        Chargement de la liste…
      </div>
    );
  }
  return (
    <div className={`${styles.etatOptions} ${styles.etatOptionsErreur}`} role="alert">
      <AlertTriangle size={14} aria-hidden="true" />
      <span>
        Liste indisponible — vérifiez votre connexion ou vos droits
        {permission ? ` (permission « ${permission} » requise)` : ''}.
      </span>
    </div>
  );
}

/* ── GEOPOINT ── */

function GpsChamp({
  valeur,
  onChange,
  disabled,
}: {
  valeur: Geopoint | null;
  onChange: (v: ValeurChamp) => void;
  disabled?: boolean;
}) {
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const acquerir = useCallback(() => {
    if (!navigator.geolocation) {
      setEchec("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setEnCours(true);
    setEchec(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Stocké en objet {lat,lng} — le backend attend un point, pas une chaîne.
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEnCours(false);
      },
      (err) => {
        setEchec(
          err.code === err.PERMISSION_DENIED
            ? "Position refusée — autorisez l'accès à la localisation."
            : 'Position introuvable. Réessayez à l’extérieur.',
        );
        setEnCours(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [onChange]);

  return (
    <div className={styles.gpsWrap}>
      <div className={styles.gpsValeur}>
        {valeur ? (
          <code className={styles.gpsCoords}>
            {valeur.lat.toFixed(6)}, {valeur.lng.toFixed(6)}
          </code>
        ) : (
          <span className={styles.gpsVide}>Aucune position relevée</span>
        )}
      </div>
      <button type="button" className={styles.gpsBtn} onClick={acquerir} disabled={disabled || enCours}>
        {enCours ? (
          <Spinner size={15} decoratif />
        ) : (
          <MapPin size={15} aria-hidden="true" />
        )}
        {valeur ? 'Actualiser' : 'Relever'}
      </button>
      {echec ? <p className={styles.gpsErreur}>{echec}</p> : null}
    </div>
  );
}

/* ── FICHIER ── */

function FichierChamp({
  valeur,
  onChange,
  onUpload,
  disabled,
}: {
  valeur: string | null;
  onChange: (v: ValeurChamp) => void;
  onUpload?: (f: File) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const choisir = async (fichier: File | undefined) => {
    if (!fichier) return;
    onChange(fichier.name);
    setEchec(null);
    if (!onUpload) return;
    setEnvoi(true);
    try {
      await onUpload(fichier);
    } catch {
      setEchec("L'envoi a échoué — le fichier sera renvoyé à la reprise du réseau.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className={styles.fichierWrap}>
      <input
        ref={inputRef}
        type="file"
        /* `capture` ouvre directement l'appareil photo sur tablette — comportement
         * attendu par les agents, à conserver. */
        accept="image/*"
        capture="environment"
        className={styles.fichierInput}
        disabled={disabled || envoi}
        onChange={(e) => void choisir(e.target.files?.[0])}
      />
      <button
        type="button"
        className={styles.fichierBtn}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || envoi}
      >
        {envoi ? (
          <Spinner size={15} decoratif />
        ) : (
          <Paperclip size={15} aria-hidden="true" />
        )}
        {valeur ? 'Remplacer' : 'Prendre une photo'}
      </button>
      {valeur ? (
        <span className={styles.fichierNom}>
          {valeur}
          <button
            type="button"
            className={styles.fichierRetirer}
            onClick={() => onChange(null)}
            aria-label="Retirer le fichier"
            disabled={disabled || envoi}
          >
            <X size={13} />
          </button>
        </span>
      ) : null}
      {echec ? <p className={styles.gpsErreur}>{echec}</p> : null}
    </div>
  );
}
