/**
 * Helper generique d'export XLSX pour les listes administratives.
 *
 * Usage :
 *   exportRowsToXlsx({
 *     filename: 'collectes',
 *     sheetName: 'Collectes',
 *     columns: [
 *       { header: 'ID', accessor: (c) => c.id },
 *       { header: 'Site', accessor: (c) => c.siteName },
 *       ...
 *     ],
 *     rows: collections,
 *   });
 */
import * as XLSX from 'xlsx';

export interface XlsxColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
  /** Largeur en caracteres ; defaut auto. */
  width?: number;
}

export interface XlsxExportOptions<T> {
  filename: string;
  sheetName?: string;
  columns: Array<XlsxColumn<T>>;
  rows: T[];
  /**
   * Ligne de contexte insérée au-dessus de l'en-tête — typiquement le
   * périmètre couvert (ex. « Sites actifs au 26/08/2026 »). Sans elle, deux
   * exports du même mois peuvent différer sans explication visible : un site
   * désactivé entre-temps change le total sans que rien ne le dise dans le
   * fichier lui-même.
   */
  note?: string;
}

/**
 * Note de périmètre standard pour un export dont les chiffres dépendent des
 * sites actifs (compteurs, listes filtrées par site). Un site désactivé
 * entre deux exports du même mois change silencieusement le total sans
 * cette ligne.
 */
export function noteScopeSitesActifs(): string {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Périmètre : sites actifs au ${date}. Un site désactivé depuis reste visible dans les données déjà rattachées mais ne compte plus dans les totaux.`;
}

export function exportRowsToXlsx<T>(opts: XlsxExportOptions<T>): void {
  const { filename, sheetName = 'Données', columns, rows, note } = opts;

  const aoa: Array<Array<string | number | boolean | null | undefined>> = [];
  if (note) {
    aoa.push([note]);
    aoa.push([]);
  }
  aoa.push(columns.map((c) => c.header));
  for (const row of rows) {
    aoa.push(columns.map((c) => c.accessor(row) ?? ''));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  /* Largeur des colonnes (auto si pas defini : taille du header + petit padding). */
  ws['!cols'] = columns.map((c, idx) => {
    if (c.width) return { wch: c.width };
    const maxBody = rows.reduce((acc, row) => {
      const v = c.accessor(row);
      const s = v === null || v === undefined ? '' : String(v);
      return Math.max(acc, s.length);
    }, 0);
    return { wch: Math.min(60, Math.max(c.header.length + 2, maxBody + 1, 10)) };
    void idx;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  /* Horodatage suffix */
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
