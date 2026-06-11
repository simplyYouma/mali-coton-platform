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
}

export function exportRowsToXlsx<T>(opts: XlsxExportOptions<T>): void {
  const { filename, sheetName = 'Données', columns, rows } = opts;

  const aoa: Array<Array<string | number | boolean | null | undefined>> = [];
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
