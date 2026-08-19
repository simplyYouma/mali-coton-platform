import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Loader2,
  Send,
} from 'lucide-react';
import { Button, EmptyState, NoteExplicative, Skeleton } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { ChampNatifField } from '../components/ChampNatifField';
import {
  useBrouillons,
  useFinaliserSoumission,
  useFormulairePublie,
  useUploaderFichier,
} from '../hooks/useFormulairesNatifs';
import { useBrouillonLocal, lireBrouillonLocal } from '../hooks/useBrouillonLocal';
import { extraireErreursValidation } from '../api/formulairesNatifs';
import {
  alertesCoherence,
  avancementSection,
  champsDependants,
  champsVisiblesSection,
  reponsesVisibles,
  validerChamp,
  validerFormulaire,
  type ErreursChamps,
} from '../lib/logiqueChamp';
import {
  isGeopoint,
  type ReponsesFormulaire,
  type ValeurChamp,
} from '../api/formulairesNatifs.types';
import styles from './SaisieFormulairePage.module.css';

/**
 * Saisie d'une fiche de collecte.
 *
 * Navigation par section plutôt qu'en scroll unique : FICHE_ENVIRONNEMENT
 * compte 109 champs, et l'agent saisit debout sur le terrain. Chaque section
 * affiche son avancement en champs obligatoires, et la finalisation n'est
 * ouverte que lorsque toutes sont complètes.
 */
export function SaisieFormulairePage() {
  const { code } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const reprendre = params.get('reprendre') === '1';
  const navigate = useNavigate();
  const toast = useToast();

  const { data: formulaire, isLoading, isError } = useFormulairePublie(code);
  const { data: brouillonsServeur } = useBrouillons();
  const finaliserMut = useFinaliserSoumission();
  const uploadMut = useUploaderFichier();

  const [reponses, setReponses] = useState<ReponsesFormulaire>({});
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  /* Un champ n'affiche son erreur qu'une fois quitté ou après une tentative de
   * finalisation : signaler « obligatoire » sur un champ jamais atteint serait
   * du bruit. */
  const [touches, setTouches] = useState<Set<string>>(new Set());
  const [tentativeFinalisation, setTentativeFinalisation] = useState(false);
  const [indexSection, setIndexSection] = useState(0);
  const [hydrate, setHydrate] = useState(false);

  const brouillonServeur = useMemo(
    () => (reprendre ? (brouillonsServeur ?? []).find((b) => b.formulaireCode === code) : undefined),
    [reprendre, brouillonsServeur, code],
  );

  const brouillon = useBrouillonLocal({
    formulaireCode: code ?? '',
    soumissionInitiale: brouillonServeur
      ? { id: brouillonServeur.id, clientSubmissionId: brouillonServeur.clientSubmissionId }
      : undefined,
  });

  /* Hydratation : le local prime sur le serveur — c'est lui qui porte les
   * frappes les plus récentes quand le réseau a lâché en cours de saisie. */
  useEffect(() => {
    if (hydrate || !code || !formulaire) return;
    const local = lireBrouillonLocal(code);
    if (local?.reponses) setReponses(local.reponses);
    else if (brouillonServeur?.reponses) setReponses(brouillonServeur.reponses);
    setHydrate(true);
  }, [hydrate, code, formulaire, brouillonServeur]);

  const sections = useMemo(
    () => (formulaire ? [...formulaire.sections].sort((a, b) => a.ordre - b.ordre) : []),
    [formulaire],
  );
  const sectionCourante = sections[indexSection];

  const alertes = useMemo(() => {
    const map: Record<string, string> = {};
    alertesCoherence(reponses).forEach((a) => {
      map[a.champCode] = a.message;
    });
    return map;
  }, [reponses]);

  /* La position du relevé accompagne la soumission : on prend le premier
   * GEOPOINT renseigné du formulaire. */
  const coords = useMemo(() => {
    for (const v of Object.values(reponses)) {
      if (isGeopoint(v)) return { lat: v.lat, lng: v.lng };
    }
    return undefined;
  }, [reponses]);

  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const majValeur = useCallback(
    (champCode: string, valeur: ValeurChamp) => {
      setReponses((prev) => {
        const suivant = { ...prev, [champCode]: valeur };
        brouillon.enregistrer(suivant, coordsRef.current);

        if (formulaire) {
          setErreurs((prevErr) => {
            const next = { ...prevErr };
            const champ = sections.flatMap((s) => s.champs).find((c) => c.code === champCode);
            if (champ) {
              const e = validerChamp(champ, suivant);
              if (e) next[champCode] = e;
              else delete next[champCode];
            }
            /* Les règles croisées (`nb_femmes ≤ nb_employes_total`) doivent être
             * revues quand la borne change, pas seulement le champ borné. */
            for (const dep of champsDependants(formulaire, champCode)) {
              const e = validerChamp(dep, suivant);
              if (e) next[dep.code] = e;
              else delete next[dep.code];
            }
            return next;
          });
        }
        return suivant;
      });
    },
    [brouillon, formulaire, sections],
  );

  const marquerTouche = useCallback((champCode: string) => {
    setTouches((prev) => (prev.has(champCode) ? prev : new Set(prev).add(champCode)));
  }, []);

  const avancements = useMemo(
    () => sections.map((s) => avancementSection(s, reponses, erreurs)),
    [sections, reponses, erreurs],
  );
  const toutComplet = avancements.every((a) => a.complete);

  const finaliser = async () => {
    if (!formulaire || !code) return;
    setTentativeFinalisation(true);

    const locales = validerFormulaire(formulaire, reponses);
    if (Object.keys(locales).length > 0) {
      setErreurs(locales);
      const premier = sections.findIndex((s) =>
        champsVisiblesSection(s, reponses).some((c) => locales[c.code]),
      );
      if (premier >= 0) setIndexSection(premier);
      toast.error('Certains champs doivent être corrigés avant l’envoi.');
      return;
    }

    try {
      // On vide le débounce : la finalisation doit porter la dernière frappe.
      const soumissionId = await brouillon.forcerSync(
        reponsesVisibles(formulaire, reponses),
        coords,
      );
      if (soumissionId === undefined) {
        toast.error('Le brouillon n’a pas pu être envoyé. Vérifiez votre connexion.');
        return;
      }
      await finaliserMut.mutateAsync(soumissionId);
      brouillon.terminer();
      toast.success('Fiche envoyée.');
      navigate('/formulaires');
    } catch (err) {
      /* Une 422 porte le détail par champ : on la remet sur les champs
       * concernés et on amène l'agent à la première section fautive, plutôt
       * que d'afficher un échec opaque. */
      const violations = extraireErreursValidation(err);
      if (violations.length > 0) {
        const map: ErreursChamps = {};
        violations.forEach((v) => {
          map[v.champCode] = v.message;
        });
        setErreurs(map);
        const premier = sections.findIndex((s) => s.champs.some((c) => map[c.code]));
        if (premier >= 0) setIndexSection(premier);
        toast.error(
          `${violations.length} champ${violations.length > 1 ? 's' : ''} refusé${violations.length > 1 ? 's' : ''} par le serveur.`,
        );
        return;
      }
      toast.error(err instanceof Error ? err.message : 'L’envoi a échoué.');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={80} radius={14} />
        <Skeleton height={480} radius={14} />
      </div>
    );
  }

  if (isError || !formulaire || !sectionCourante) {
    return (
      <EmptyState
        title="Formulaire indisponible"
        description="Ce modèle n'a pas pu être chargé."
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

  const champsAffiches = champsVisiblesSection(sectionCourante, reponses);

  return (
    <div className={styles.page}>
      <header className={styles.entete}>
        <div className={styles.enteteTexte}>
          <Link to="/formulaires" className={styles.retour}>
            <ArrowLeft size={14} aria-hidden="true" />
            Modèles
          </Link>
          <h1 className={styles.titre}>{formulaire.titre}</h1>
        </div>
        <IndicateurSauvegarde
          etat={brouillon.etat}
          derniere={brouillon.derniereSauvegarde}
          isOnline={brouillon.isOnline}
        />
      </header>

      <NoteExplicative
        id="formulaires-saisie"
        titre="Comment remplir cette fiche"
        resume={
          <>
            La fiche est découpée en sections : vous n’en voyez qu’une à la fois, et vous avancez
            avec <strong>Suivant</strong>. <strong>Votre saisie est enregistrée toute seule</strong>,
            au fur et à mesure — vous pouvez fermer la page, perdre le réseau ou éteindre l’appareil
            sans rien perdre.
          </>
        }
        etapes={[
          {
            titre: 'Le sommaire à gauche',
            detail: (
              <>
                Chaque section affiche son avancement (<code>3/5 requis</code>). Un ✓ signale une
                section terminée ; vous pouvez cliquer pour y revenir à tout moment.
              </>
            ),
          },
          {
            titre: 'Les champs marqués *',
            detail: 'Obligatoires. Certaines questions n’apparaissent qu’en fonction de vos réponses précédentes.',
          },
          {
            titre: 'L’état en haut à droite',
            detail: (
              <>
                « Brouillon enregistré » = envoyé au serveur. « Enregistré sur l’appareil » = pas de
                réseau, la saisie est gardée en local et partira au retour de la connexion.
              </>
            ),
          },
          {
            titre: 'Finaliser',
            detail: 'Disponible en dernière section, une fois toutes les sections obligatoires complètes. C’est l’envoi définitif.',
          },
        ]}
      />

      <div className={styles.corps}>
        {/* Stepper : colonne sur desktop, barre défilante sur mobile. */}
        <nav className={styles.stepper} aria-label="Sections du formulaire">
          {sections.map((s, i) => {
            const a = avancements[i]!;
            const etat = a.enErreur ? 'erreur' : a.complete ? 'complete' : 'encours';
            return (
              <button
                key={s.id}
                type="button"
                className={styles.etape}
                data-actif={i === indexSection ? 'true' : undefined}
                data-etat={etat}
                onClick={() => setIndexSection(i)}
                aria-current={i === indexSection ? 'step' : undefined}
              >
                <span className={styles.etapeCode}>{s.code}</span>
                <span className={styles.etapeCorps}>
                  <span className={styles.etapeLibelle}>{s.libelle}</span>
                  <span className={styles.etapeCompteur}>
                    {a.obligatoires > 0 ? `${a.remplis}/${a.obligatoires} requis` : 'Facultative'}
                  </span>
                </span>
                <span className={styles.etapePuce} aria-hidden="true">
                  {a.enErreur ? (
                    <AlertTriangle size={13} />
                  ) : a.complete ? (
                    <Check size={13} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </nav>

        <main className={styles.panneau}>
          <header className={styles.panneauHead}>
            <span className={styles.panneauEyebrow}>
              Section {indexSection + 1} sur {sections.length}
            </span>
            <h2 className={styles.panneauTitre}>{sectionCourante.libelle}</h2>
          </header>

          <div className={styles.champs}>
            {champsAffiches.map((champ) => (
              <div key={champ.id} onBlur={() => marquerTouche(champ.code)}>
                <ChampNatifField
                  champ={champ}
                  valeur={reponses[champ.code]}
                  onChange={(v) => majValeur(champ.code, v)}
                  erreur={
                    touches.has(champ.code) || tentativeFinalisation
                      ? erreurs[champ.code]
                      : undefined
                  }
                  alerte={alertes[champ.code]}
                  onUploadFichier={
                    brouillon.soumissionId !== undefined
                      ? async (fichier) => {
                          await uploadMut.mutateAsync({
                            soumissionId: brouillon.soumissionId!,
                            champCode: champ.code,
                            fichier,
                          });
                        }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>

          <footer className={styles.navigation}>
            <Button
              variant="secondary"
              iconLeft={<ChevronLeft size={15} />}
              disabled={indexSection === 0}
              onClick={() => setIndexSection((i) => Math.max(0, i - 1))}
            >
              Précédent
            </Button>

            {indexSection < sections.length - 1 ? (
              <Button
                variant="primary"
                iconRight={<ChevronRight size={15} />}
                onClick={() => setIndexSection((i) => Math.min(sections.length - 1, i + 1))}
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="success"
                iconLeft={<Send size={15} />}
                onClick={() => void finaliser()}
                loading={finaliserMut.isPending}
                disabled={!toutComplet}
                title={toutComplet ? undefined : 'Complétez les champs obligatoires de chaque section.'}
              >
                Finaliser
              </Button>
            )}
          </footer>

          {!toutComplet && indexSection === sections.length - 1 ? (
            <p className={styles.blocage}>
              <AlertTriangle size={13} aria-hidden="true" />
              Des champs obligatoires restent à renseigner — voyez les sections marquées dans le
              sommaire.
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/* ── Indicateur d'enregistrement ── */

function IndicateurSauvegarde({
  etat,
  derniere,
  isOnline,
}: {
  etat: string;
  derniere: Date | null;
  isOnline: boolean;
}) {
  const [, forcerRendu] = useState(0);

  // Le « il y a N s » doit vieillir tout seul, sans nouvelle frappe.
  useEffect(() => {
    const t = setInterval(() => forcerRendu((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (etat === 'idle' && !derniere) return null;

  const depuis = derniere ? formaterDepuis(derniere) : null;

  if (!isOnline || etat === 'local') {
    return (
      <span className={`${styles.sauvegarde} ${styles.sauvegardeLocal}`}>
        <CloudOff size={13} aria-hidden="true" />
        Enregistré sur l’appareil
      </span>
    );
  }
  if (etat === 'enregistrement') {
    return (
      <span className={styles.sauvegarde}>
        <Loader2 size={13} className={styles.spin} aria-hidden="true" />
        Enregistrement…
      </span>
    );
  }
  return (
    <span className={styles.sauvegarde}>
      <Check size={13} aria-hidden="true" />
      Brouillon enregistré{depuis ? ` · ${depuis}` : ''}
    </span>
  );
}

function formaterDepuis(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return 'à l’instant';
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)} h`;
}
