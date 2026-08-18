import { useMemo } from 'react';
import clsx from 'clsx';
import { parseStructuredText } from './parseStructuredText';
import styles from './StructuredText.module.css';

export interface StructuredTextProps {
  /** Texte brut, potentiellement multi-lignes (\n). */
  text: string;
  className?: string;
}

/**
 * Rend un texte brut (recommandation, observation…) en paragraphes et listes
 * structurées plutôt qu'en bloc plat à retours à la ligne. Voir
 * `parseStructuredText` pour la règle de détection.
 *
 * Construit des éléments React directement (pas de `dangerouslySetInnerHTML`) :
 * le texte source n'est jamais interprété comme du HTML.
 */
export function StructuredText({ text, className }: StructuredTextProps) {
  const blocks = useMemo(() => parseStructuredText(text), [text]);

  return (
    <div className={clsx(styles.root, className)}>
      {blocks.map((block, i) =>
        block.type === 'p' ? (
          <p key={i}>{block.text}</p>
        ) : (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                {item.text}
                {item.children && item.children.length > 0 ? (
                  <ul>
                    {item.children.map((child, k) => (
                      <li key={k}>{child}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
