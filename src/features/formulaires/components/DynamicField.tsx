import { useCallback } from 'react';
import { MapPin, Loader } from 'lucide-react';
import clsx from 'clsx';
import { FormField, Input, Textarea, Select, Checkbox, Radio } from '@/components/common';
import type { ChampFormulaire } from '../api/formulaires.types';
import styles from './DynamicField.module.css';

export interface DynamicFieldValue {
  valeurTexte?: string;
  valeurNombre?: string;
  valeurDate?: string;
  valeurJson?: string[];
  fichierUrl?: string;
}

interface DynamicFieldProps {
  champ: ChampFormulaire;
  value: DynamicFieldValue;
  onChange: (value: DynamicFieldValue) => void;
  error?: string;
  disabled?: boolean;
}

export function DynamicField({ champ, value, onChange, error, disabled }: DynamicFieldProps) {
  const handleText = useCallback(
    (v: string) => onChange({ valeurTexte: v }),
    [onChange],
  );
  const handleNumber = useCallback(
    (v: string) => onChange({ valeurNombre: v }),
    [onChange],
  );
  const handleDate = useCallback(
    (v: string) => onChange({ valeurDate: v }),
    [onChange],
  );

  const handleCheckbox = useCallback(
    (option: string, checked: boolean) => {
      const current = value.valeurJson ?? [];
      const next = checked ? [...current, option] : current.filter((v) => v !== option);
      onChange({ valeurJson: next });
    },
    [onChange, value.valeurJson],
  );

  const renderControl = () => {
    switch (champ.typeChamp) {
      case 'texte':
      case 'email':
      case 'telephone':
        return (
          <Input
            type={champ.typeChamp === 'telephone' ? 'tel' : champ.typeChamp === 'email' ? 'email' : 'text'}
            /* Clavier adapte au contenu attendu : pave telephonique, ou
             * clavier comportant l'arobase pour une adresse. */
            inputMode={
              champ.typeChamp === 'telephone'
                ? 'tel'
                : champ.typeChamp === 'email'
                  ? 'email'
                  : undefined
            }
            value={value.valeurTexte ?? ''}
            onChange={(e) => handleText(e.target.value)}
            placeholder={champ.aide ?? ''}
            disabled={disabled}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value.valeurTexte ?? ''}
            onChange={(e) => handleText(e.target.value)}
            placeholder={champ.aide ?? ''}
            rows={4}
            disabled={disabled}
          />
        );

      case 'nombre':
        return (
          <Input
            type="number"
            /* Ouvre le pave chiffre plutot que le clavier alphabetique. */
            inputMode="decimal"
            value={value.valeurNombre ?? ''}
            onChange={(e) => handleNumber(e.target.value)}
            placeholder={champ.aide ?? ''}
            disabled={disabled}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value.valeurDate ?? ''}
            onChange={(e) => handleDate(e.target.value)}
            disabled={disabled}
          />
        );

      case 'select':
        return (
          <Select<string>
            value={value.valeurTexte ?? ''}
            onChange={(v) => handleText(v)}
            options={[
              { value: '', label: '— Sélectionner —' },
              ...(champ.optionsJson ?? []).map((opt) => ({ value: opt, label: opt })),
            ]}
            disabled={disabled}
          />
        );

      case 'radio':
        return (
          <div className={styles.radioGroup}>
            {(champ.optionsJson ?? []).map((opt) => (
              <Radio
                key={opt}
                label={opt}
                value={opt}
                checked={value.valeurTexte === opt}
                onChange={() => handleText(opt)}
                disabled={disabled}
              />
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className={styles.checkboxGroup}>
            {(champ.optionsJson ?? []).map((opt) => (
              <Checkbox
                key={opt}
                label={opt}
                checked={(value.valeurJson ?? []).includes(opt)}
                onChange={(e) => handleCheckbox(opt, e.target.checked)}
                disabled={disabled}
              />
            ))}
          </div>
        );

      case 'fichier':
        return (
          <div className={styles.fileWrap}>
            <input
              type="file"
              /* Sur tablette, sans ces deux attributs, l'agente tombe sur un
               * explorateur de fichiers : elle doit quitter l'application,
               * photographier, puis revenir chercher le fichier. Ici, le
               * champ ouvre directement l'appareil photo dorsal. */
              accept="image/*"
              capture="environment"
              className={styles.fileInput}
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange({ valeurTexte: file.name, fichierUrl: file.name });
              }}
            />
            {value.fichierUrl ? (
              <span className={styles.fileName}>{value.fichierUrl}</span>
            ) : null}
          </div>
        );

      case 'geo':
        return (
          <GpsField
            value={value.valeurTexte ?? ''}
            onChange={handleText}
            disabled={disabled}
          />
        );

      default:
        return (
          <Input
            value={value.valeurTexte ?? ''}
            onChange={(e) => handleText(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <FormField
      label={champ.libelle}
      required={champ.obligatoire}
      hint={champ.aide && champ.typeChamp !== 'texte' ? champ.aide : undefined}
      error={error}
      className={clsx(styles.field, !champ.actif && styles.fieldInactive)}
    >
      {renderControl()}
    </FormField>
  );
}

/* ── Sous-composant GPS ── */
function GpsField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const acquire = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        onChange(v);
      },
      () => {
        onChange('Erreur GPS');
      },
    );
  };

  return (
    <div className={styles.gpsWrap}>
      <Input
        value={value}
        readOnly
        placeholder="Latitude, Longitude"
        disabled={disabled}
      />
      <button
        type="button"
        className={styles.gpsBtn}
        onClick={acquire}
        disabled={disabled}
        aria-label="Obtenir ma position GPS"
      >
        {value && value !== 'Erreur GPS' ? (
          <MapPin size={16} />
        ) : (
          <Loader size={16} />
        )}
        {value && value !== 'Erreur GPS' ? 'Mettre à jour' : 'Localiser'}
      </button>
    </div>
  );
}
