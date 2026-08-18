export interface StructuredListItem {
  text: string;
  /** Sous-paramètres imbriqués (ex. physico-chimiques, métaux lourds…). */
  children?: string[];
}

export type StructuredBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: StructuredListItem[] };

const TRAILING_COLON = /[:：]\s*$/;
const TRAILING_SEMICOLON = /[;；]\s*$/;

/**
 * Parseur heuristique texte brut → blocs structurés, pour les recommandations
 * saisies en texte libre (un \n par ligne, pas d'éditeur riche).
 *
 * Règle : une ligne terminée par ':' ouvre une recommandation principale ;
 * les lignes suivantes terminées par ';' deviennent ses sous-paramètres
 * (imbriqués), jusqu'à la prochaine ligne ':' ou la fin du bloc. Une ligne
 * terminée par ';' sans recommandation ouverte reste un item de tête (liste
 * à plat). Toute ligne sans cette ponctuation referme la liste en cours et
 * redevient un paragraphe simple.
 */
export function parseStructuredText(raw: string): StructuredBlock[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: StructuredBlock[] = [];
  let items: StructuredListItem[] = [];
  let currentItem: StructuredListItem | null = null;

  const flushList = () => {
    if (currentItem) {
      items.push(currentItem);
      currentItem = null;
    }
    if (items.length) {
      blocks.push({ type: 'list', items });
      items = [];
    }
  };

  for (const line of lines) {
    if (TRAILING_COLON.test(line)) {
      if (currentItem) items.push(currentItem);
      currentItem = { text: line.replace(TRAILING_COLON, '').trim() };
    } else if (TRAILING_SEMICOLON.test(line)) {
      const text = line.replace(TRAILING_SEMICOLON, '').trim();
      if (currentItem) {
        currentItem.children = currentItem.children ?? [];
        currentItem.children.push(text);
      } else {
        items.push({ text });
      }
    } else {
      flushList();
      blocks.push({ type: 'p', text: line });
    }
  }
  flushList();

  return blocks;
}
