import Dexie, { type Table } from 'dexie';
import { useEffect, useState } from 'react';
import { uuid } from '@/lib/uuid';
import type { ReportTemplateId } from '../lib/reportSpec';

/**
 * Historique des rapports générés — persisté en IndexedDB côté navigateur.
 * Fonctionne offline, survit au refresh. En prod, à remplacer par un endpoint
 * back-office (CDC §5.3 « stockage 90 jours »).
 */
export interface ReportHistoryEntry {
  id: string;
  templateId: ReportTemplateId;
  templateTitle: string;
  periodLabel: string;
  scopeLabel: string;
  generatedAt: string;
  generatedBy?: string;
  /** Format(s) téléchargés effectivement par l'utilisateur. */
  exportedFormats: Array<'PDF' | 'XLSX'>;
}

class ReportingDb extends Dexie {
  history!: Table<ReportHistoryEntry, string>;
  constructor() {
    super('mali-coton-reporting');
    this.version(1).stores({
      history: 'id, generatedAt, templateId',
    });
  }
}

const db = new ReportingDb();

export function useReportHistory() {
  const [items, setItems] = useState<ReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const all = await db.history.orderBy('generatedAt').reverse().limit(20).toArray();
    setItems(all);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const recordGeneration = async (
    entry: Omit<ReportHistoryEntry, 'id' | 'generatedAt'>,
  ): Promise<ReportHistoryEntry> => {
    const full: ReportHistoryEntry = {
      ...entry,
      id: uuid(),
      generatedAt: new Date().toISOString(),
    };
    await db.history.put(full);
    await refresh();
    return full;
  };

  const removeEntry = async (id: string) => {
    await db.history.delete(id);
    await refresh();
  };

  return { items, loading, recordGeneration, removeEntry };
}
