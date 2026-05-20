import { useMemo, useState } from 'react';
import { Eye, Pencil, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/common';
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
  type LoginableRole,
  type ModuleGroup,
  type PermissionLevel,
} from '../lib/rbacMatrix';
import styles from './RolesPage.module.css';

const NEXT: Record<PermissionLevel, PermissionLevel> = {
  none: 'read',
  read: 'write',
  write: 'none',
};

type GroupFilter = 'all' | ModuleGroup;

const GROUP_CHIPS: Array<{ value: GroupFilter; label: string }> = [
  { value: 'all', label: 'Tous les modules' },
  { value: 'operationnel', label: GROUP_LABEL.operationnel },
  { value: 'analyse', label: GROUP_LABEL.analyse },
  { value: 'admin', label: GROUP_LABEL.admin },
];

export function RolesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [matrix, setMatrix] = useState(() => loadMatrix());
  const [dirty, setDirty] = useState(false);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const visibleGroups = useMemo(() => {
    const groups = groupFilter === 'all'
      ? (['operationnel', 'analyse', 'admin'] as ModuleGroup[])
      : [groupFilter];
    return groups.map((g) => ({
      group: g,
      modules: MODULES.filter((m) => m.group === g),
    }));
  }, [groupFilter]);

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const r of ROLES) {
      for (const m of MODULES) {
        if (DEFAULT_MATRIX[r.id][m.id] !== matrix[r.id][m.id]) count += 1;
      }
    }
    return count;
  }, [matrix]);

  const cycleCell = (roleId: LoginableRole, moduleId: string) => {
    if (roleId === 'admin') return; // admin verrouillé sur écriture totale
    setMatrix((prev) => {
      const next = { ...prev };
      const roleRow = { ...next[roleId] };
      roleRow[moduleId] = NEXT[roleRow[moduleId] ?? 'none'];
      next[roleId] = roleRow;
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

  const isDefault = (roleId: LoginableRole, moduleId: string): boolean =>
    DEFAULT_MATRIX[roleId][moduleId] === matrix[roleId][moduleId];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Rôles &amp; permissions</h1>
          <span className={styles.heroCount}>
            {ROLES.length} rôles · {MODULES.length} modules
            {modifiedCount > 0 ? ` · ${modifiedCount} ajustement${modifiedCount > 1 ? 's' : ''}` : ''}
          </span>
          <p className={styles.heroDescription}>
            Matrice des permissions par rôle, ajustable par module.
          </p>
        </div>
        <div className={styles.heroRight}>
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
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.chips} role="tablist" aria-label="Filtrer par groupe de modules">
          {GROUP_CHIPS.map((g) => (
            <button
              key={g.value}
              type="button"
              role="tab"
              aria-selected={groupFilter === g.value}
              className={`${styles.chip} ${groupFilter === g.value ? styles.chipActive : ''}`}
              onClick={() => setGroupFilter(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <Cell level="write" />
            Écriture
          </span>
          <span className={styles.legendItem}>
            <Cell level="read" />
            Lecture
          </span>
          <span className={styles.legendItem}>
            <Cell level="none" />
            Aucun
          </span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>Module</th>
              {ROLES.map((r) => (
                <th key={r.id} className={styles.roleCell}>
                  <span className={styles.roleHead}>
                    {r.id === 'admin' ? (
                      <ShieldCheck size={12} className={styles.lockIcon} aria-hidden="true" />
                    ) : null}
                    {r.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map(({ group, modules }) => (
              <GroupBlock
                key={group}
                title={GROUP_LABEL[group]}
                modules={modules}
                matrix={matrix}
                isDefault={isDefault}
                onCycle={cycleCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.footnote}>
        Cliquez sur une cellule pour basculer le niveau (aucun → lecture → écriture). Le rôle administrateur reste verrouillé en écriture totale.
      </p>
    </div>
  );
}

interface GroupBlockProps {
  title: string;
  modules: typeof MODULES;
  matrix: ReturnType<typeof loadMatrix>;
  isDefault: (roleId: LoginableRole, moduleId: string) => boolean;
  onCycle: (roleId: LoginableRole, moduleId: string) => void;
}

function GroupBlock({ title, modules, matrix, isDefault, onCycle }: GroupBlockProps) {
  return (
    <>
      <tr className={styles.groupRow}>
        <td colSpan={ROLES.length + 1}>{title}</td>
      </tr>
      {modules.map((mod) => (
        <tr key={mod.id} className={styles.moduleRow}>
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
                  onClick={() => onCycle(r.id, mod.id)}
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
