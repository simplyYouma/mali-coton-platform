import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Copy,
  Eye,
  GitBranch,
  Database,
  Asterisk,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';
import { Badge, Button, EmptyState, NoteExplicative, Skeleton } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ChampNatifField } from '../components/ChampNatifField';
import { ReglagesChamp } from '../components/ReglagesChamp';
import { SelecteurType } from '../components/SelecteurType';
import { ICONE_TYPE, LIBELLE_TYPE } from './StructureFormulairePage';
import {
  useAjouterChamp,
  useFormulairesPublies,
  useModifierChamp,
  useSupprimerChamp,
} from '../hooks/useFormulairesNatifs';
import { CAPACITES_BUILDER } from '../api/formulairesNatifs';
import { champsVisiblesSection, genererCodeChamp } from '../lib/logiqueChamp';
import {
  champVierge,
  champsDeSection,
  estNouveau,
  marquerModifie,
  resumerChangements,
  versBrouillon,
  type ChampBrouillon,
  type StructureBrouillon,
} from '../lib/brouillonStructure';
import {
  hasValidation,
  type ReponsesFormulaire,
  type SectionNatif,
  type TypeChampNatif,
  type ValeurChamp,
} from '../api/formulairesNatifs.types';
import styles from './ConstructeurFormulairePage.module.css';

/**
 * Constructeur de formulaire, dans l'esprit ODK/XLSForm.
 *
 * Les formulaires sont publiés et déjà utilisés : l'édition se fait sur un
 * brouillon local et n'est poussée qu'à l'enregistrement explicite. Aucune
 * action n'est simulée — ce qui n'est pas supporté par l'API est désactivé
 * avec son motif (voir `CAPACITES_BUILDER`).
 */
export function ConstructeurFormulairePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();

  /* La route porte l'id numérique alors que le schéma est servi par code : on
   * le retrouve via le catalogue, déjà en cache après la page Modèles. */
  const { formulaires, isLoading, isError } = useFormulairesPublies();
  const formulaire = useMemo(
    () => formulaires.find((f) => String(f.id) === id),
    [formulaires, id],
  );

  const [brouillon, setBrouillon] = useState<StructureBrouillon | null>(null);
  const [sectionActive, setSectionActive] = useState<string>('');
  const [champSelectionne, setChampSelectionne] = useState<number | null>(null);
  const [sectionsRepliees, setSectionsRepliees] = useState<Set<string>>(new Set());
  const [selecteurOuvert, setSelecteurOuvert] = useState<{ ordre: number } | null>(null);
  const [onglet, setOnglet] = useState<'edition' | 'apercu'>('edition');
  const [apercuReponses, setApercuReponses] = useState<ReponsesFormulaire>({});
  const [enregistrement, setEnregistrement] = useState(false);
  const focusLibelleRef = useRef(false);

  const ajouterMut = useAjouterChamp(formulaire?.code);
  const modifierMut = useModifierChamp(formulaire?.code);
  const supprimerMut = useSupprimerChamp(formulaire?.code);

  // (Ré)initialise le brouillon dès que le schéma serveur arrive ou change.
  useEffect(() => {
    if (!formulaire) return;
    setBrouillon(versBrouillon(formulaire));
    setSectionActive((s) => s || (formulaire.sections[0]?.code ?? ''));
  }, [formulaire]);

  const sections = useMemo(
    () => (formulaire ? [...formulaire.sections].sort((a, b) => a.ordre - b.ordre) : []),
    [formulaire],
  );
  const ordreSections = useMemo(() => sections.map((s) => s.code), [sections]);

  const changements = brouillon ? resumerChangements(brouillon) : null;
  const aDesChangements = (changements?.total ?? 0) > 0;

  /* Garde-fou navigateur : une fermeture d'onglet ne doit pas emporter
   * silencieusement des changements de structure non enregistrés. */
  useEffect(() => {
    if (!aDesChangements) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [aDesChangements]);

  // Focus sur le libellé juste après création — permet d'enchaîner au clavier.
  useEffect(() => {
    if (!focusLibelleRef.current || champSelectionne === null) return;
    focusLibelleRef.current = false;
    const el = document.querySelector<HTMLInputElement>('[data-champ-libelle]');
    el?.focus();
  }, [champSelectionne]);

  const majChamp = useCallback((champId: number, patch: Partial<ChampBrouillon>) => {
    setBrouillon((b) =>
      b
        ? {
            ...b,
            champs: b.champs.map((c) => (c.id === champId ? marquerModifie({ ...c, ...patch }) : c)),
          }
        : b,
    );
  }, []);

  const champCourant = brouillon?.champs.find((c) => c.id === champSelectionne) ?? null;

  const creerChamp = (type: TypeChampNatif) => {
    if (!brouillon || !sectionActive) return;
    const ordre = selecteurOuvert?.ordre ?? 0;
    const nouveau = champVierge(sectionActive, type, ordre);
    nouveau.libelle = `Nouvelle question (${LIBELLE_TYPE[type]})`;
    nouveau.code = genererCodeChamp(sectionActive, nouveau.libelle);
    setBrouillon({
      ...brouillon,
      // Décale les champs suivants pour insérer à l'endroit précis demandé.
      champs: [
        ...brouillon.champs.map((c) =>
          c.sectionCode === sectionActive && c.ordre >= ordre ? { ...c, ordre: c.ordre + 10 } : c,
        ),
        nouveau,
      ],
    });
    setChampSelectionne(nouveau.id);
    focusLibelleRef.current = true;
    setSelecteurOuvert(null);
  };

  const dupliquerChamp = (champ: ChampBrouillon) => {
    if (!brouillon) return;
    const copie: ChampBrouillon = {
      ...champ,
      id: champVierge(champ.sectionCode, champ.type, champ.ordre + 5).id,
      code: `${champ.code}_copie`,
      libelle: `${champ.libelle} (copie)`,
      etat: 'nouveau',
      codeOrigine: undefined,
      ordre: champ.ordre + 5,
    };
    setBrouillon({ ...brouillon, champs: [...brouillon.champs, copie] });
    setChampSelectionne(copie.id);
  };

  const supprimerLigne = async (champ: ChampBrouillon) => {
    if (!brouillon) return;
    if (!estNouveau(champ)) {
      const ok = await confirm({
        title: `Supprimer « ${champ.libelle} » ?`,
        message:
          'Ce champ est publié et peut déjà porter des réponses. Sa suppression retire la question des prochaines collectes ; les soumissions existantes conservent leur valeur mais le champ ne sera plus lisible dans le formulaire.',
        confirmLabel: 'Supprimer le champ',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBrouillon({
      ...brouillon,
      champs: estNouveau(champ)
        ? brouillon.champs.filter((c) => c.id !== champ.id)
        : brouillon.champs.map((c) => (c.id === champ.id ? { ...c, etat: 'supprime' } : c)),
    });
    if (champSelectionne === champ.id) setChampSelectionne(null);
  };

  const enregistrer = async () => {
    if (!brouillon || !formulaire || !changements) return;

    if (changements.renommagesPublies.length > 0) {
      const ok = await confirm({
        title: 'Renommer le code d’un champ publié ?',
        message: `${changements.renommagesPublies
          .map((c) => `« ${c.codeOrigine} » → « ${c.code} »`)
          .join(', ')}. Le code sert de clé aux réponses : les valeurs déjà collectées sous l’ancien code ne seront plus rattachées à ce champ.`,
        confirmLabel: 'Renommer quand même',
        tone: 'danger',
      });
      if (!ok) return;
    }

    setEnregistrement(true);
    try {
      for (const champ of brouillon.champs) {
        if (champ.etat === 'nouveau') {
          await ajouterMut.mutateAsync({
            formulaireId: formulaire.id,
            input: {
              sectionCode: champ.sectionCode,
              code: champ.code,
              label: champ.libelle,
              type: champ.type,
            },
          });
        } else if (champ.etat === 'modifie') {
          await modifierMut.mutateAsync({
            champId: champ.id,
            patch: {
              code: champ.code,
              libelle: champ.libelle,
              type: champ.type,
              ordre: champ.ordre,
              obligatoire: champ.obligatoire,
              aide: champ.aide,
              options: champ.options,
              optionsSource: champ.optionsSource,
              validation: champ.validation,
              valeurParDefaut: champ.valeurParDefaut,
              condition: champ.condition,
            },
          });
        } else if (champ.etat === 'supprime' && !estNouveau(champ)) {
          await supprimerMut.mutateAsync(champ.id);
        }
      }
      toast.success('Modifications enregistrées.');
    } catch (err) {
      /* On ne réinitialise pas le brouillon : les changements restants sont
       * conservés pour que rien ne soit perdu après un échec partiel. */
      toast.error(
        err instanceof Error
          ? `Enregistrement interrompu : ${err.message}`
          : 'Enregistrement interrompu.',
      );
    } finally {
      setEnregistrement(false);
    }
  };

  const annuler = async () => {
    if (!formulaire) return;
    const ok = await confirm({
      title: 'Annuler les modifications ?',
      message: 'Le formulaire sera rechargé depuis le serveur et vos changements non enregistrés seront perdus.',
      confirmLabel: 'Annuler les modifications',
      tone: 'danger',
    });
    if (!ok) return;
    setBrouillon(versBrouillon(formulaire));
    setChampSelectionne(null);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={70} radius={14} />
        <Skeleton height={520} radius={14} />
      </div>
    );
  }

  if (isError || !formulaire || !brouillon) {
    return (
      <EmptyState
        title="Formulaire introuvable"
        description="Ce modèle n'a pas pu être chargé."
        action={
          <Link to="/formulaires">
            <Button variant="secondary" iconLeft={<ArrowLeft size={15} />}>Retour aux modèles</Button>
          </Link>
        }
      />
    );
  }

  const sectionCourante = sections.find((s) => s.code === sectionActive);
  const champsCanvas = champsDeSection(brouillon, sectionActive);

  return (
    <div className={styles.page}>
      <Link to={`/formulaires/${formulaire.code}`} className={styles.retour}>
        <ArrowLeft size={14} aria-hidden="true" />
        {formulaire.titre}
      </Link>

      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Structure du questionnaire</span>
          <h1 className={styles.heroTitle}>Constructeur</h1>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.onglets} role="tablist">
            <button
              type="button" role="tab" aria-selected={onglet === 'edition'}
              className={styles.ongletBtn} data-actif={onglet === 'edition' ? 'true' : undefined}
              onClick={() => setOnglet('edition')}
            >
              Édition
            </button>
            <button
              type="button" role="tab" aria-selected={onglet === 'apercu'}
              className={styles.ongletBtn} data-actif={onglet === 'apercu' ? 'true' : undefined}
              onClick={() => setOnglet('apercu')}
            >
              <Eye size={13} aria-hidden="true" /> Aperçu
            </button>
          </div>
          <Button
            variant="ghost"
            iconLeft={<RotateCcw size={15} />}
            onClick={() => void annuler()}
            disabled={!aDesChangements || enregistrement}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            iconLeft={<Save size={15} />}
            onClick={() => void enregistrer()}
            loading={enregistrement}
            disabled={!aDesChangements}
          >
            Enregistrer{aDesChangements ? ` (${changements!.total})` : ''}
          </Button>
        </div>
      </header>

      <NoteExplicative
        id="formulaires-constructeur"
        titre="Modifier les questions du formulaire"
        resume={
          <>
            C’est ici qu’on ajoute, renomme ou supprime les questions que les agents verront sur le
            terrain. L’écran se lit de gauche à droite : <strong>le plan</strong> (toutes les
            sections), <strong>les questions</strong> de la section choisie, puis{' '}
            <strong>les réglages</strong> de la question sélectionnée.
          </>
        }
        etapes={[
          {
            titre: 'Ajouter une question',
            detail: 'Survolez l’espace entre deux questions : un + apparaît. Choisissez un type, le libellé se saisit dans la foulée.',
          },
          {
            titre: 'Modifier',
            detail: 'Cliquez sur une question pour ouvrir ses réglages à droite (obligatoire, options, conditions, règles de calcul). Double-cliquez sur le libellé pour le renommer sur place.',
          },
          {
            titre: 'Vérifier avec Aperçu',
            detail: 'Affiche la section telle que l’agent la verra. Les conditions y fonctionnent réellement : cochez pour vérifier qu’une question conditionnelle apparaît bien.',
          },
          {
            titre: 'Enregistrer',
            detail: 'Rien n’est envoyé tant que vous ne cliquez pas sur Enregistrer — le compteur indique le nombre de changements en attente. Annuler recharge la version du serveur.',
          },
        ]}
        avertissement={
          <>
            Ce formulaire est <strong>déjà utilisé par les agents</strong>. Supprimer une question
            ou renommer son code casse le lien avec les réponses déjà collectées : une confirmation
            vous sera demandée dans ces deux cas.
          </>
        }
      />

      {onglet === 'apercu' ? (
        <div className={styles.apercu}>
          <p className={styles.apercuBandeau}>
            <AlertTriangle size={13} aria-hidden="true" />
            Aperçu — les données saisies ici ne sont pas enregistrées.
          </p>
          <div className={styles.apercuCorps}>
            {sectionCourante ? (
              <ApercuSection
                section={sectionApercu(sectionCourante, champsCanvas)}
                reponses={apercuReponses}
                onChange={(champCode, v) =>
                  setApercuReponses((r) => ({ ...r, [champCode]: v }))
                }
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.colonnes}>
          {/* ── Plan du formulaire ── */}
          <aside className={styles.plan} aria-label="Plan du formulaire">
            {sections.map((s) => {
              const champs = champsDeSection(brouillon, s.code);
              const replie = sectionsRepliees.has(s.code);
              return (
                <div key={s.id} className={styles.planSection}>
                  <button
                    type="button"
                    className={styles.planSectionHead}
                    data-actif={s.code === sectionActive ? 'true' : undefined}
                    onClick={() => {
                      setSectionActive(s.code);
                      setSectionsRepliees((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.code)) next.delete(s.code);
                        else next.add(s.code);
                        return next;
                      });
                    }}
                  >
                    <ChevronDown
                      size={13}
                      className={styles.planChevron}
                      data-replie={replie ? 'true' : undefined}
                      aria-hidden="true"
                    />
                    <span className={styles.planLibelle}>{s.libelle}</span>
                    <span className={styles.planCompte}>{champs.length}</span>
                  </button>
                  {!replie ? (
                    <ul className={styles.planChamps}>
                      {champs.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={styles.planChamp}
                            data-actif={c.id === champSelectionne ? 'true' : undefined}
                            onClick={() => {
                              setSectionActive(s.code);
                              setChampSelectionne(c.id);
                            }}
                          >
                            {c.libelle || <em>Sans libellé</em>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </aside>

          {/* ── Canvas ── */}
          <main className={styles.canvas}>
            <header className={styles.canvasHead}>
              <h2 className={styles.canvasTitre}>{sectionCourante?.libelle ?? 'Section'}</h2>
              <span className={styles.canvasMeta}>
                {champsCanvas.length} question{champsCanvas.length > 1 ? 's' : ''}
              </span>
            </header>

            <ul className={styles.lignes}>
              <ZoneInsertion ordre={0} onAjouter={(o) => setSelecteurOuvert({ ordre: o })} />
              {champsCanvas.map((champ, i) => {
                const Icone = ICONE_TYPE[champ.type] ?? TypeIcon;
                return (
                  <li key={champ.id}>
                    <div
                      className={styles.ligne}
                      data-actif={champ.id === champSelectionne ? 'true' : undefined}
                      data-nouveau={estNouveau(champ) ? 'true' : undefined}
                      onClick={() => setChampSelectionne(champ.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setChampSelectionne(champ.id);
                        }
                      }}
                    >
                      <span
                        className={styles.poignee}
                        title={
                          CAPACITES_BUILDER.champReordonner
                            ? 'Utilisez les flèches pour déplacer'
                            : 'Réordonnancement non disponible'
                        }
                        aria-hidden="true"
                      >
                        ⋮⋮
                      </span>
                      <span className={styles.ligneIcone} aria-hidden="true">
                        <Icone size={15} />
                      </span>
                      <span className={styles.ligneCorps}>
                        <LibelleEditable
                          valeur={champ.libelle}
                          onChange={(libelle) => majChamp(champ.id, { libelle })}
                        />
                      </span>
                      <span className={styles.lignePastilles}>
                        {estNouveau(champ) ? <Badge size="sm" variant="info">Nouveau</Badge> : null}
                        {champ.obligatoire ? (
                          <span className={styles.pastille} title="Obligatoire">
                            <Asterisk size={11} aria-hidden="true" />
                          </span>
                        ) : null}
                        {champ.condition?.active ? (
                          <span className={styles.pastille} title="Condition d’affichage">
                            <GitBranch size={11} aria-hidden="true" />
                          </span>
                        ) : null}
                        {hasValidation(champ) ? (
                          <span className={styles.pastille} title={champ.validation.message}>
                            <Asterisk size={11} aria-hidden="true" />
                          </span>
                        ) : null}
                        {champ.optionsSource ? (
                          <span className={styles.pastille} title="Liste dynamique">
                            <Database size={11} aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.ligneActions}>
                        <button
                          type="button"
                          className={styles.iconeBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            dupliquerChamp(champ);
                          }}
                          aria-label={`Dupliquer ${champ.libelle}`}
                          title="Dupliquer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconeBtn} ${styles.iconeBtnDanger}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void supprimerLigne(champ);
                          }}
                          aria-label={`Supprimer ${champ.libelle}`}
                          title={
                            CAPACITES_BUILDER.champSupprimer
                              ? 'Supprimer'
                              : 'Suppression non disponible'
                          }
                          disabled={!CAPACITES_BUILDER.champSupprimer}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </div>
                    <ZoneInsertion
                      ordre={champ.ordre + (i === champsCanvas.length - 1 ? 10 : 5)}
                      onAjouter={(o) => setSelecteurOuvert({ ordre: o })}
                    />
                  </li>
                );
              })}
            </ul>
          </main>

          {/* ── Réglages ── */}
          <aside className={styles.reglages} aria-label="Réglages de la question">
            {champCourant ? (
              <ReglagesChamp
                champ={champCourant}
                brouillon={brouillon}
                ordreSections={ordreSections}
                onChange={(patch) => majChamp(champCourant.id, patch)}
              />
            ) : (
              <p className={styles.reglagesVide}>
                Sélectionnez une question pour en modifier les réglages.
              </p>
            )}
          </aside>
        </div>
      )}

      <SelecteurType
        open={selecteurOuvert !== null}
        onClose={() => setSelecteurOuvert(null)}
        onChoisir={creerChamp}
      />
    </div>
  );
}

/* ── Zone d'insertion entre deux lignes ── */

function ZoneInsertion({ ordre, onAjouter }: { ordre: number; onAjouter: (ordre: number) => void }) {
  return (
    <div className={styles.insertion}>
      <button
        type="button"
        className={styles.insertionBtn}
        onClick={() => onAjouter(ordre)}
        aria-label="Ajouter une question ici"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

/* ── Libellé éditable en place (double-clic) ── */

function LibelleEditable({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (v: string) => void;
}) {
  const [edition, setEdition] = useState(false);
  const [tampon, setTampon] = useState(valeur);

  if (!edition) {
    return (
      <span
        className={styles.ligneLibelle}
        onDoubleClick={() => {
          setTampon(valeur);
          setEdition(true);
        }}
        title="Double-cliquez pour renommer"
      >
        {valeur || <em>Sans libellé</em>}
      </span>
    );
  }
  return (
    <input
      className={styles.ligneLibelleInput}
      value={tampon}
      onChange={(e) => setTampon(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        onChange(tampon);
        setEdition(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onChange(tampon);
          setEdition(false);
        }
        if (e.key === 'Escape') setEdition(false);
      }}
      /* eslint-disable-next-line jsx-a11y/no-autofocus -- édition en place : le
         champ n'apparaît qu'à la demande explicite de l'utilisateur. */
      autoFocus
      aria-label="Libellé de la question"
    />
  );
}

/* ── Aperçu : réutilise le composant de saisie, conditions actives ── */

function sectionApercu(section: SectionNatif, champs: ChampBrouillon[]): SectionNatif {
  return { ...section, champs };
}

function ApercuSection({
  section,
  reponses,
  onChange,
}: {
  section: SectionNatif;
  reponses: ReponsesFormulaire;
  onChange: (champCode: string, v: ValeurChamp) => void;
}) {
  // Même filtrage conditionnel qu'en saisie : l'aperçu doit dire la vérité.
  const visibles = champsVisiblesSection(section, reponses);
  return (
    <div className={styles.apercuChamps}>
      {visibles.map((champ) => (
        <ChampNatifField
          key={champ.id}
          champ={champ}
          valeur={reponses[champ.code]}
          onChange={(v) => onChange(champ.code, v)}
        />
      ))}
    </div>
  );
}

