import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import {
  Button,
  Input,
  PageHeader,
  Skeleton,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useThresholds, useUpdateThreshold } from '../hooks/useAdmin';
import type { ThresholdConfig } from '../api/admin.types';
import styles from './ThresholdsPage.module.css';

const DOMAIN_LABEL: Record<ThresholdConfig['domain'], string> = {
  water: 'Eaux usées',
  soil: 'Sol',
  air: 'Air ambiant',
  waste: 'Déchets solides',
  health: 'Santé / SST',
  socio: 'Socio-économique',
};

interface RowDraft {
  minOk: string;
  maxOk: string;
  source: string;
}

function toRowDraft(t: ThresholdConfig): RowDraft {
  return {
    minOk: t.minOk === null ? '' : String(t.minOk),
    maxOk: t.maxOk === null ? '' : String(t.maxOk),
    source: t.source,
  };
}

function parseBound(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function ThresholdsPage() {
  const toast = useToast();
  const { data, isLoading } = useThresholds();
  const updateMut = useUpdateThreshold();

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map: Partial<Record<ThresholdConfig['domain'], ThresholdConfig[]>> = {};
    for (const t of items) {
      (map[t.domain] ??= []).push(t);
    }
    return map;
  }, [data]);

  const ensureDraft = (t: ThresholdConfig): RowDraft => drafts[t.indicatorId] ?? toRowDraft(t);

  const patchDraft = (id: string, base: ThresholdConfig, patch: Partial<RowDraft>) => {
    setDrafts((d) => ({
      ...d,
      [id]: { ...toRowDraft(base), ...d[id], ...patch },
    }));
  };

  const isDirty = (t: ThresholdConfig): boolean => {
    const d = drafts[t.indicatorId];
    if (!d) return false;
    const base = toRowDraft(t);
    return d.minOk !== base.minOk || d.maxOk !== base.maxOk || d.source !== base.source;
  };

  const handleSave = async (t: ThresholdConfig) => {
    const d = drafts[t.indicatorId];
    if (!d) return;
    try {
      await updateMut.mutateAsync({
        indicatorId: t.indicatorId,
        patch: {
          minOk: parseBound(d.minOk),
          maxOk: parseBound(d.maxOk),
          source: d.source.trim() || t.source,
        },
      });
      toast.success(`Seuil mis à jour pour ${t.indicatorLabel}.`);
      setDrafts((s) => {
        const next = { ...s };
        delete next[t.indicatorId];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la mise à jour.');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Seuils &amp; normes"
        description="Configuration des seuils de conformité par indicateur. Toute modification est tracée dans le journal d'audit."
      />

      <div className={styles.intro}>
        <strong>Référence normative</strong> — les seuils par défaut sont alignés sur les normes
        OMS et la réglementation malienne (Loi n°2021-032, Norme MN-03-02/002:2006, Décrets
        n°01-394/P-RM et n°96-178/P-RM, conventions OIT). Modifiez avec précaution.
      </div>

      {isLoading ? (
        <Skeleton height={320} />
      ) : (
        (Object.keys(grouped) as ThresholdConfig['domain'][]).map((domain) => {
          const list = grouped[domain] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={domain} className={styles.domainBlock} aria-label={DOMAIN_LABEL[domain]}>
              <header className={styles.domainHead}>
                <h2 className={styles.domainTitle}>{DOMAIN_LABEL[domain]}</h2>
                <span className={styles.domainCount}>{list.length} indicateurs</span>
              </header>
              {list.map((t) => {
                const d = ensureDraft(t);
                const dirty = isDirty(t);
                return (
                  <div key={t.indicatorId} className={styles.row}>
                    <div className={styles.indicatorCell}>
                      <span className={styles.indicatorLabel}>{t.indicatorLabel}</span>
                      <span className={styles.indicatorMeta}>
                        {t.unit ? `Unité ${t.unit} · ` : ''}
                        ID {t.indicatorId}
                      </span>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Min"
                      value={d.minOk}
                      onChange={(e) => patchDraft(t.indicatorId, t, { minOk: e.target.value })}
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Max"
                      value={d.maxOk}
                      onChange={(e) => patchDraft(t.indicatorId, t, { maxOk: e.target.value })}
                    />
                    <Input
                      placeholder="Source normative"
                      value={d.source}
                      onChange={(e) => patchDraft(t.indicatorId, t, { source: e.target.value })}
                    />
                    <Button
                      variant={dirty ? 'primary' : 'ghost'}
                      size="sm"
                      iconLeft={<Save size={14} />}
                      disabled={!dirty}
                      onClick={() => handleSave(t)}
                      loading={updateMut.isPending && updateMut.variables?.indicatorId === t.indicatorId}
                    >
                      {dirty ? 'Enregistrer' : 'À jour'}
                    </Button>
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
