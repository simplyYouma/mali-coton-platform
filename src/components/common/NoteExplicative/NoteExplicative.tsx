import { useCallback, useState, type ReactNode } from 'react';
import { ChevronDown, HelpCircle, X } from 'lucide-react';
import styles from './NoteExplicative.module.css';

const PREFIXE = 'paset.note.';

export interface EtapeNote {
  /** Intitulé de l'action, en tête de ligne. */
  titre: string;
  /** Ce que ça fait concrètement. */
  detail: ReactNode;
}

export interface NoteExplicativeProps {
  /** Identifiant stable — sert à mémoriser le repli propre à cette page. */
  id: string;
  titre: string;
  /** À quoi sert la page, en une ou deux phrases. */
  resume: ReactNode;
  /** Marche à suivre, dans l'ordre. */
  etapes?: EtapeNote[];
  /** Point d'attention affiché en bas, si la page comporte un risque. */
  avertissement?: ReactNode;
}

function lireReplie(id: string): boolean {
  try {
    return localStorage.getItem(`${PREFIXE}${id}`) === 'replie';
  } catch {
    return false;
  }
}

/**
 * Note d'explication en tête de page : ce que la page fait, et quoi y faire.
 *
 * Repliée une fois lue et mémorisée par page — un encart d'aide qui revient à
 * chaque visite finit par être ignoré, puis par gêner. L'état est local à
 * l'appareil : rien à stocker côté serveur pour une préférence d'affichage.
 */
export function NoteExplicative({
  id,
  titre,
  resume,
  etapes,
  avertissement,
}: NoteExplicativeProps) {
  const [replie, setReplie] = useState(() => lireReplie(id));

  const basculer = useCallback(
    (valeur: boolean) => {
      setReplie(valeur);
      try {
        localStorage.setItem(`${PREFIXE}${id}`, valeur ? 'replie' : 'ouvert');
      } catch {
        /* mode privé ou quota : la note reste simplement ouverte à la prochaine visite */
      }
    },
    [id],
  );

  if (replie) {
    return (
      <button
        type="button"
        className={styles.rappel}
        onClick={() => basculer(false)}
        aria-expanded={false}
      >
        <HelpCircle size={13} aria-hidden="true" />
        À quoi sert cette page ?
        <ChevronDown size={13} aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside className={styles.note} aria-label={`Aide : ${titre}`}>
      <header className={styles.head}>
        <span className={styles.icone} aria-hidden="true">
          <HelpCircle size={15} />
        </span>
        <h2 className={styles.titre}>{titre}</h2>
        <button
          type="button"
          className={styles.fermer}
          onClick={() => basculer(true)}
          aria-label="Masquer cette aide"
          title="Masquer — réaffichable à tout moment"
        >
          <X size={15} />
        </button>
      </header>

      <p className={styles.resume}>{resume}</p>

      {etapes && etapes.length > 0 ? (
        <ol className={styles.etapes}>
          {etapes.map((e, i) => (
            <li key={i} className={styles.etape}>
              <span className={styles.etapeNum} aria-hidden="true">{i + 1}</span>
              <span className={styles.etapeTexte}>
                <strong className={styles.etapeTitre}>{e.titre}</strong>
                <span className={styles.etapeDetail}>{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {avertissement ? <p className={styles.avertissement}>{avertissement}</p> : null}
    </aside>
  );
}
