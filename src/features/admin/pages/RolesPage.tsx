import { useMemo, useState } from 'react';
import { Eye, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { Button, PageHeader } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
  DEFAULT_MATRIX,
  GROUP_LABEL,
  MODULES,
  ROLES,
  loadMatrix,
  resetMatrix,
  saveMatrix,
  type PermissionLevel,
} from '../lib/rbacMatrix';
import styles from './RolesPage.module.css';

const NEXT: Record<PermissionLevel, PermissionLevel> = {
  none: 'read',
  read: 'write',
  write: 'none',
};

export function RolesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [matrix, setMatrix] = useState(() => loadMatrix());
  const [dirty, setDirty] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof MODULES>();
    for (const m of MODULES) {
      const arr = map.get(m.group) ?? [];
      arr.push(m);
      map.set(m.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const cycleCell = (roleId: string, moduleId: string) => {
    if (roleId === 'admin') return; // admin reste plein
    setMatrix((prev) => {
      const next = { ...prev };
      const roleRow = { ...next[roleId as keyof typeof prev] };
      roleRow[moduleId] = NEXT[roleRow[moduleId] ?? 'none'];
      next[roleId as keyof typeof prev] = roleRow;
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    saveMatrix(matrix);
    setDirty(false);
    toast.success('Matrice de permissions enregistrée.');
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Réinitialiser la matrice ?',
      message: 'Toutes les modifications de permissions seront perdues. Seul le socle CDC sera conservé.',
      confirmLabel: 'Réinitialiser',
      tone: 'danger',
    });
    if (!ok) return;
    setMatrix(resetMatrix());
    setDirty(false);
    toast.info('Matrice réinitialisée au socle CDC.');
  };

  const isDefault = (roleId: string, moduleId: string): boolean => {
    return (
      DEFAULT_MATRIX[roleId as keyof typeof DEFAULT_MATRIX][moduleId] ===
      matrix[roleId as keyof typeof matrix][moduleId]
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administration"
        title="Rôles &amp; permissions"
        actions={
          <>
            <Button
              variant="ghost"
              iconLeft={<RotateCcw size={14} />}
              onClick={handleReset}
            >
              Réinitialiser
            </Button>
            <Button
              variant="primary"
              iconLeft={<Save size={14} />}
              onClick={handleSave}
              disabled={!dirty}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <Cell level="write" />
          Écriture
        </span>
        <span className={styles.legendItem}>
          <Cell level="read" />
          Lecture seule
        </span>
        <span className={styles.legendItem}>
          <Cell level="none" />
          Aucun accès
        </span>
        <span className={styles.legendHint}>
          Cliquez sur une cellule pour basculer le niveau · Admin verrouillé en écriture totale
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>Module</th>
              {ROLES.map((r) => (
                <th key={r.id} className={styles.roleCell}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, modules]) => (
              <>
                <tr key={`${group}-head`} className={styles.groupRow}>
                  <td colSpan={ROLES.length + 1}>{GROUP_LABEL[group as keyof typeof GROUP_LABEL]}</td>
                </tr>
                {modules.map((mod) => (
                  <tr key={mod.id}>
                    <td className={styles.moduleCell}>{mod.label}</td>
                    {ROLES.map((r) => {
                      const level = matrix[r.id][mod.id] ?? 'none';
                      const locked = r.id === 'admin';
                      const modified = !isDefault(r.id, mod.id);
                      return (
                        <td
                          key={r.id}
                          className={styles.permCell}
                          data-modified={modified ? 'true' : undefined}
                        >
                          <button
                            type="button"
                            className={`${styles.cellBtn} ${locked ? styles.cellLocked : ''}`}
                            onClick={() => cycleCell(r.id, mod.id)}
                            aria-label={`${r.label} · ${mod.label} · ${labelLevel(level)}`}
                            disabled={locked}
                          >
                            <Cell level={level} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ level }: { level: PermissionLevel }) {
  if (level === 'write') {
    return (
      <span className={`${styles.pill} ${styles.pillWrite}`} aria-hidden="true">
        <Pencil size={11} />
      </span>
    );
  }
  if (level === 'read') {
    return (
      <span className={`${styles.pill} ${styles.pillRead}`} aria-hidden="true">
        <Eye size={11} />
      </span>
    );
  }
  return (
    <span className={`${styles.pill} ${styles.pillNone}`} aria-hidden="true">
      <X size={11} />
    </span>
  );
}

function labelLevel(l: PermissionLevel): string {
  if (l === 'write') return 'écriture';
  if (l === 'read') return 'lecture';
  return 'aucun accès';
}
