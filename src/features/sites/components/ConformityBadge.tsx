import { Badge } from '@/components/common';
import type { ConformityLevel } from '@/types/common';

const LABEL: Record<ConformityLevel, string> = {
  conforming: 'Conforme',
  warning: 'À surveiller',
  critical: 'Non conforme',
};

const VARIANT: Record<ConformityLevel, 'success' | 'warning' | 'danger'> = {
  conforming: 'success',
  warning: 'warning',
  critical: 'danger',
};

export interface ConformityBadgeProps {
  level: ConformityLevel;
  size?: 'sm' | 'md';
  withDot?: boolean;
}

export function ConformityBadge({ level, size = 'sm', withDot = true }: ConformityBadgeProps) {
  return (
    <Badge variant={VARIANT[level]} size={size} dot={withDot}>
      {LABEL[level]}
    </Badge>
  );
}
