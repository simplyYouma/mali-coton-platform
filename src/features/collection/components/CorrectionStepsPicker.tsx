import { Check } from 'lucide-react';
import { CORRECTION_STEP_OPTIONS } from '../lib/correctionSteps';
import styles from './CorrectionStepsPicker.module.css';

interface CorrectionStepsPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Sélecteur multi-chips des étapes du wizard à corriger. Le superviseur
 * coche les étapes ; l'agent les retrouve dans le bandeau de la collecte
 * et peut rouvrir directement la bonne étape du wizard.
 */
export function CorrectionStepsPicker({ value, onChange }: CorrectionStepsPickerProps) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((s) => s !== id));
    else onChange([...value, id]);
  };

  return (
    <div className={styles.wrapper} role="group" aria-label="Étapes du wizard à corriger">
      <div className={styles.header}>
        <span className={styles.label}>Étapes à corriger</span>
        <span className={styles.hint}>Sélection facultative — l'agent rouvrira ces étapes</span>
      </div>
      <div className={styles.chips}>
        {CORRECTION_STEP_OPTIONS.map((opt) => {
          const checked = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.chip} ${checked ? styles.chipChecked : ''}`}
              onClick={() => toggle(opt.id)}
              aria-pressed={checked}
              title={opt.hint}
            >
              <span className={styles.chipMark} aria-hidden="true">
                {checked ? <Check size={12} /> : null}
              </span>
              <span className={styles.chipLabel}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
