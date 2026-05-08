import { Construction } from 'lucide-react';
import { EmptyState } from '../EmptyState/EmptyState';
import { PageHeader } from '../PageHeader/PageHeader';

export interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <>
      <PageHeader eyebrow="En construction" title={title} description={subtitle} />
      <EmptyState
        icon={<Construction size={24} />}
        title="Écran en cours de construction"
        description="Cette section sera implémentée dans les prochaines phases du plan d'implémentation L2."
      />
    </>
  );
}
