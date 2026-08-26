import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Asterisk,
  CalendarDays,
  CheckSquare,
  CircleDot,
  Database,
  FileUp,
  GitBranch,
  Hash,
  MapPin,
  PencilRuler,
  PlayCircle,
  Ruler,
  Type as TypeIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, EmptyState, NoteExplicative, Skeleton } from '@/components/common';
import { useFormulairePublie } from '../hooks/useFormulairesNatifs';
import {
  compterChamps,
  hasCondition,
  hasValidation,
  type ChampNatif,
  type TypeChampNatif,
} from '../api/formulairesNatifs.types';
import { StatsBande } from '../components/StatsBande';
import styles from './StructureFormulairePage.module.css';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { PERM } from '@/features/auth/lib/permissions';

export const LIBELLE_TYPE: Record<TypeChampNatif, string> = {
  TEXTE: 'Texte court',
  TEXTE_LONG: 'Paragraphe',
  ENTIER: 'Nombre entier',
  DECIMAL: 'Nombre décimal',
  DATE: 'Date',
  CHOIX_SIMPLE: 'Choix unique',
  CHOIX_MULTIPLE: 'Choix multiple',
  GEOPOINT: 'Coordonnées GPS',
  FICHIER: 'Photo / document',
};

export const ICONE_TYPE: Record<TypeChampNatif, LucideIcon> = {
  TEXTE: TypeIcon,
  TEXTE_LONG: TypeIcon,
  ENTIER: Hash,
  DECIMAL: Ruler,
  DATE: CalendarDays,
  CHOIX_SIMPLE: CircleDot,
  CHOIX_MULTIPLE: CheckSquare,
  GEOPOINT: MapPin,
  FICHIER: FileUp,
};

/**
 * Vue de référence, en lecture seule, de ce qu'un formulaire attend.
 *
 * Sert à comprendre la structure sans ouvrir la saisie : arborescence
 * sections → champs, avec le code exact qui sert de clé aux réponses.
 */
export function StructureFormulairePage() {
  const { code } = useParams<{ code: string }>();
  const { peutUneDe } = useAutorisations();
  /* Le constructeur modifie la structure : ce sont ces droits qui l'ouvrent. */
  const peutConstruire = peutUneDe([PERM.formulaireCreate, PERM.formulaireUpdate]);
  const { data: formulaire, isLoading, isError } = useFormulairePublie(code);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={90} radius={14} />
        <Skeleton height={420} radius={14} />
      </div>
    );
  }

  if (isError || !formulaire) {
    return (
      <EmptyState
        title="Formulaire introuvable"
        description="Ce modèle n'existe pas ou n'est pas publié."
        action={
          <Link to="/formulaires">
            <Button variant="secondary" iconLeft={<ArrowLeft size={15} />}>
              Retour aux modèles
            </Button>
          </Link>
        }
      />
    );
  }

  const sections = [...formulaire.sections].sort((a, b) => a.ordre - b.ordre);
  /* Les conditions référencent un champ par son code : on garde de quoi le
   * retraduire en libellé, le code n'étant jamais montré. */
  const parLibelle = new Map(
    sections.flatMap((s) => s.champs.map((c) => [c.code, c.libelle] as const)),
  );

  return (
    <div className={styles.page}>
      <Link to="/formulaires" className={styles.retour}>
        <ArrowLeft size={14} aria-hidden="true" />
        Tous les modèles
      </Link>

      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Version {formulaire.version}</span>
          <h1 className={styles.heroTitle}>{formulaire.titre}</h1>
          <p className={styles.heroDescription}>{formulaire.description}</p>
        </div>
        <div className={styles.heroActions}>
          <Link to={`/formulaires/${formulaire.code}/saisir`}>
            <Button variant="primary" iconLeft={<PlayCircle size={15} />}>
              Remplir
            </Button>
          </Link>
          {peutConstruire ? (
            <Link to={`/admin/formulaires/${formulaire.id}/constructeur`}>
              <Button variant="secondary" iconLeft={<PencilRuler size={15} />}>
                Ouvrir le constructeur
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      <NoteExplicative
        id="formulaires-structure"
        titre="La fiche d’identité du formulaire, en lecture seule"
        resume={
          <>
            Cette page liste <strong>toutes les questions</strong> du formulaire, section par
            section, sans rien demander de remplir. Elle sert de référence : savoir à l’avance ce
            qui sera demandé sur le terrain, et vérifier ce que le formulaire attend exactement.
            Rien ne se modifie ici.
          </>
        }
        etapes={[
          {
            titre: 'Le libellé',
            detail: 'La question telle que l’agent la verra pendant la saisie.',
          },
          {
            titre: 'Le type',
            detail: 'Indique la forme attendue : texte, nombre, date, choix, photo ou position GPS.',
          },
          {
            titre: 'L’astérisque rouge',
            detail: 'Marque une réponse obligatoire : sans elle, la fiche ne peut pas être envoyée.',
          },
          {
            titre: 'Les pastilles',
            detail: (
              <>
                <strong>Conditionnel</strong> : la question n’apparaît que selon une réponse
                précédente. <strong>Validé</strong> : la valeur doit respecter une règle.{' '}
                <strong>Liste</strong> : les choix viennent du serveur.
              </>
            ),
          },
        ]}
      />

      <StatsBande
        aria-label="Résumé"
        stats={[
          { label: 'Sections', valeur: sections.length },
          { label: 'Champs', valeur: compterChamps(formulaire) },
          {
            label: 'Obligatoires',
            valeur: sections.reduce(
              (n, sec) => n + sec.champs.filter((c) => c.obligatoire).length,
              0,
            ),
          },
        ]}
      />

      <div className={styles.arbre}>
        {sections.map((section) => (
          <section key={section.id} className={styles.section}>
            <header className={styles.sectionHead}>
              <h2 className={styles.sectionTitre}>{section.libelle}</h2>
              <span className={styles.sectionCompte}>
                {section.champs.length} champ{section.champs.length > 1 ? 's' : ''}
              </span>
            </header>
            <ul className={styles.champs}>
              {[...section.champs]
                .sort((a, b) => a.ordre - b.ordre)
                .map((champ) => (
                  <LigneChamp key={champ.id} champ={champ} parLibelle={parLibelle} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Résumé lisible d'une condition — jamais le code brut du champ parent. */
function libelleCondition(champ: ChampNatif, parLibelle: Map<string, string>): string {
  if (!hasCondition(champ)) return '';
  const parent = parLibelle.get(champ.condition.champParentCode) ?? 'un champ précédent';
  const verbe = champ.condition.operateur === 'CONTAINS' ? 'contient' : 'est égal à';
  return `Affiché si « ${parent} » ${verbe} « ${champ.condition.valeur} »`;
}

function LigneChamp({ champ, parLibelle }: { champ: ChampNatif; parLibelle: Map<string, string> }) {
  const Icone = ICONE_TYPE[champ.type] ?? TypeIcon;
  return (
    <li className={styles.champ}>
      <span className={styles.champIcone} aria-hidden="true">
        <Icone size={15} />
      </span>
      <div className={styles.champCorps}>
        <span className={styles.champLibelle}>
          {champ.libelle}
          {champ.obligatoire ? (
            <Asterisk size={11} className={styles.champRequis} aria-label="obligatoire" />
          ) : null}
        </span>
      </div>
      <div className={styles.champMeta}>
        {/* Pastilles discrètes : elles signalent qu'un champ porte une règle,
         * le détail se lit dans le constructeur. */}
        {hasCondition(champ) ? (
          <span className={styles.pastille} title={libelleCondition(champ, parLibelle)}>
            <GitBranch size={11} aria-hidden="true" />
            Conditionnel
          </span>
        ) : null}
        {hasValidation(champ) ? (
          <span className={styles.pastille} title={champ.validation.message}>
            <Asterisk size={11} aria-hidden="true" />
            Validé
          </span>
        ) : null}
        {champ.optionsSource ? (
          <span className={styles.pastille} title={`Liste dynamique — ${champ.optionsSource.resource}`}>
            <Database size={11} aria-hidden="true" />
            Liste
          </span>
        ) : null}
        <Badge size="sm" variant="neutral">{LIBELLE_TYPE[champ.type] ?? champ.type}</Badge>
      </div>
    </li>
  );
}
