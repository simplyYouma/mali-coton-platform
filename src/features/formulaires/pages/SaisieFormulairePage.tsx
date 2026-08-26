import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Lock,
  Send,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  NoteExplicative,
  Skeleton,
  Spinner,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { PERM } from '@/features/auth/lib/permissions';
import { ChampNatifField } from '../components/ChampNatifField';
import {
  useBrouillon,
  useFinaliserSoumission,
  useFormulairePublie,
  useUploaderFichier,
} from '../hooks/useFormulairesNatifs';
import { lireBrouillonLocal, useBrouillonLocal } from '../hooks/useBrouillonLocal';
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
  type FormulairePublie,
  type ReponsesFormulaire,
  type TypeChampNatif,
  type ValeurChamp,
} from '../api/formulairesNatifs.types';
import styles from './SaisieFormulairePage.module.css';

/** Types dont le contrôle a besoin de toute la largeur pour rester lisible. */
const CHAMPS_PLEINE_LARGEUR = new Set<TypeChampNatif>([
  'TEXTE_LONG',
  'CHOIX_MULTIPLE',
  'GEOPOINT',
  'FICHIER',
]);

/** Première section, dans l'ordre, dont les champs obligatoires visibles ne sont pas tous remplis. */
function premiereSectionIncomplete(formulaire: FormulairePublie, reponses: ReponsesFormulaire): number {
  const ordonnees = [...formulaire.sections].sort((a, b) => a.ordre - b.ordre);
  const i = ordonnees.findIndex((s) => !avancementSection(s, reponses).complete);
  return i < 0 ? Math.max(0, ordonnees.length - 1) : i;
}

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
  /* Identifiant du brouillon ciblé — sans lui, reprendre une fiche revenait à
   * ouvrir « le premier brouillon trouvé pour ce modèle », qui n'est pas
   * nécessairement le bon dès qu'il en existe plusieurs. */
  const idDepuisUrl = params.get('id') || undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { peut } = useAutorisations();
  const userId = user?.id ?? '';
  /* Un agent de collecte (soumission.create sans soumission.validate) doit
   * compléter une section avant d'avancer, et ne finalise jamais — il
   * enregistre et envoie pour validation ; qui valide les soumissions navigue
   * librement et finalise, sur ses propres brouillons comme sur ceux des
   * autres agents. Une seule permission gouverne les deux, jamais un nom de
   * rôle (`ROLE_ADMIN`, `superviseur`… incohérents en base). */
  const peutValider = peut(PERM.soumissionValidate);

  const { data: formulaire, isLoading, isError } = useFormulairePublie(code);
  const {
    data: brouillonServeur,
    isLoading: chargementBrouillonServeur,
  } = useBrouillon(reprendre ? idDepuisUrl : undefined);
  const finaliserMut = useFinaliserSoumission();
  const uploadMut = useUploaderFichier();

  const [reponses, setReponses] = useState<ReponsesFormulaire>({});
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  /* Un champ n'affiche son erreur qu'une fois quitté, après une tentative de
   * finalisation, ou après un clic sur Suivant qui l'a mis en cause : signaler
   * « obligatoire » sur un champ jamais atteint serait du bruit. */
  const [touches, setTouches] = useState<Set<string>>(new Set());
  const [tentativeFinalisation, setTentativeFinalisation] = useState(false);
  /* Bouton de fin de parcours pour un agent (« Enregistrer et soumettre pour
   * validation ») — distinct de `finaliserMut.isPending`, qui ne couvre que
   * l'appel réservé aux détenteurs de `soumission.validate`. */
  const [enSoumission, setEnSoumission] = useState(false);
  const [indexSection, setIndexSection] = useState(() => {
    const n = Number(params.get('section'));
    return Number.isInteger(n) && n >= 0 ? n : 0;
  });
  /* Dernière section réellement atteignable pour un agent : verrouille les
   * sections jamais complétées, sans quoi le blocage sur « Suivant » se
   * contourne en cliquant directement l'étape suivante dans le sommaire. */
  const [maxSectionAtteinte, setMaxSectionAtteinte] = useState(indexSection);
  /* `true` dès le premier montage pour un nouveau brouillon (rien à charger) ;
   * `false` tant qu'une reprise n'a pas résolu serveur ET local. */
  const [hydrate, setHydrate] = useState(() => !reprendre);

  const brouillon = useBrouillonLocal({
    formulaireCode: code ?? '',
    userId,
    clientSubmissionId: reprendre ? idDepuisUrl : undefined,
  });
  const { hydrater } = brouillon;

  useEffect(() => {
    if (reprendre && !idDepuisUrl) {
      toast.error('Ce lien de reprise est incomplet : une nouvelle fiche a été démarrée.');
    }
    // Ne doit s'afficher qu'une fois, à l'arrivée sur la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Hydratation : n'a lieu qu'une fois, et seulement après résolution complète
   * des deux sources.
   *
   * Hydrater dès que le *formulaire* est chargé — sans attendre la requête de
   * reprise — écrivait `reponses = {}` un court instant, que l'auto-save
   * poussait ensuite au serveur : les réponses déjà enregistrées étaient
   * silencieusement écrasées. La garde ci-dessous attend que la requête
   * brouillon soit tranchée (succès ou échec — un brouillon jamais synchronisé
   * n'existe pas côté serveur et doit pouvoir se reprendre avec la seule copie
   * locale), compare les deux dates si les deux existent, et ne marque
   * `hydrate` qu'une fois la source retenue effectivement appliquée.
   */
  useEffect(() => {
    if (hydrate || !formulaire || !userId) return;
    if (!reprendre || !idDepuisUrl) {
      setHydrate(true);
      return;
    }
    if (chargementBrouillonServeur) return;

    const local = lireBrouillonLocal(userId, idDepuisUrl);
    const tServeur = brouillonServeur ? Date.parse(brouillonServeur.updatedAt || brouillonServeur.createdAt || '') || 0 : -1;
    const tLocal = local ? Date.parse(local.majLe) || 0 : -1;

    const source =
      tLocal > tServeur
        ? local
          ? {
              reponses: local.reponses,
              majLe: local.majLe,
              soumissionId: local.soumissionId,
              revision: local.revision ?? null,
              latitude: local.latitude ?? null,
              longitude: local.longitude ?? null,
            }
          : null
        : brouillonServeur
          ? {
              reponses: brouillonServeur.reponses,
              majLe: brouillonServeur.updatedAt || brouillonServeur.createdAt,
              soumissionId: brouillonServeur.id,
              revision: brouillonServeur.revision,
              latitude: brouillonServeur.latitude,
              longitude: brouillonServeur.longitude,
            }
          : null;

    if (source) {
      setReponses(source.reponses);
      hydrater(source);
      const idx = premiereSectionIncomplete(formulaire, source.reponses);
      setIndexSection(idx);
      setMaxSectionAtteinte(idx);
    } else {
      toast.error('Aucune donnée n’a été retrouvée pour ce brouillon — vous repartez d’une fiche vierge.');
    }
    setHydrate(true);
  }, [hydrate, formulaire, userId, reprendre, idDepuisUrl, chargementBrouillonServeur, brouillonServeur, hydrater, toast]);

  const sections = useMemo(
    () => (formulaire ? [...formulaire.sections].sort((a, b) => a.ordre - b.ordre) : []),
    [formulaire],
  );

  // Un `section=N` hors bornes (lien obsolète, saisie manuelle) ne doit pas geler la page.
  useEffect(() => {
    if (sections.length === 0) return;
    setIndexSection((i) => Math.min(i, sections.length - 1));
  }, [sections.length]);

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

  const focusPremierChampFautif = useCallback((codes: string[]) => {
    requestAnimationFrame(() => {
      for (const code of codes) {
        const conteneur = document.querySelector(`[data-champ-code="${CSS.escape(code)}"]`);
        const champ = conteneur?.querySelector<HTMLElement>('input, select, textarea, button');
        if (champ) {
          champ.focus();
          return;
        }
      }
    });
  }, []);

  /**
   * Clic sur « Suivant ».
   *
   * Le bouton reste toujours actif — c'est le clic qui révèle les erreurs,
   * pas un état désactivé sans explication. Seuls les champs **visibles** de
   * la section comptent : un champ masqué par une condition ne doit jamais
   * bloquer l'avancée.
   */
  const handleSuivant = () => {
    if (!peutValider && sectionCourante) {
      const champsSection = champsVisiblesSection(sectionCourante, reponses);
      const erreursSection: ErreursChamps = {};
      for (const c of champsSection) {
        const e = validerChamp(c, reponses);
        if (e) erreursSection[c.code] = e;
      }
      if (Object.keys(erreursSection).length > 0) {
        setErreurs((prev) => ({ ...prev, ...erreursSection }));
        setTouches((prev) => {
          const next = new Set(prev);
          Object.keys(erreursSection).forEach((code) => next.add(code));
          return next;
        });
        focusPremierChampFautif(champsSection.filter((c) => erreursSection[c.code]).map((c) => c.code));
        return;
      }
    }
    const suivant = Math.min(sections.length - 1, indexSection + 1);
    setIndexSection(suivant);
    setMaxSectionAtteinte((m) => Math.max(m, suivant));
  };

  const allerASection = (i: number) => {
    // En arrière : toujours libre. En avant : verrouillé au-delà de ce qui a été atteint.
    if (!peutValider && i > maxSectionAtteinte) return;
    setIndexSection(i);
  };

  /**
   * Valide le formulaire entier (pas seulement la section courante) avant un
   * envoi définitif — commun à la finalisation et à l'envoi pour validation.
   * Révèle les erreurs, ramène à la première section fautive, et renvoie si
   * l'envoi peut continuer.
   */
  const validerAvantEnvoi = (): boolean => {
    if (!formulaire) return false;
    const locales = validerFormulaire(formulaire, reponses);
    if (Object.keys(locales).length === 0) return true;
    setErreurs(locales);
    const premier = sections.findIndex((s) =>
      champsVisiblesSection(s, reponses).some((c) => locales[c.code]),
    );
    if (premier >= 0) {
      setIndexSection(premier);
      setMaxSectionAtteinte((m) => Math.max(m, premier));
    }
    toast.error('Certains champs doivent être corrigés avant l’envoi.');
    return false;
  };

  const finaliser = async () => {
    if (!formulaire || !code) return;
    setTentativeFinalisation(true);
    if (!validerAvantEnvoi()) return;

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
        if (premier >= 0) {
          setIndexSection(premier);
          setMaxSectionAtteinte((m) => Math.max(m, premier));
        }
        toast.error(
          `${violations.length} champ${violations.length > 1 ? 's' : ''} refusé${violations.length > 1 ? 's' : ''} par le serveur.`,
        );
        return;
      }
      toast.error(err instanceof Error ? err.message : 'L’envoi a échoué.');
    }
  };

  /**
   * Action de fin de parcours pour un agent de collecte — il n'a pas le
   * droit de finaliser. Force la synchronisation et ramène à la liste avec un
   * accusé clair : la fiche part en validation, l'agent ne doit jamais croire
   * qu'un bouton grisé le bloque sans explication.
   */
  const soumettrePourValidation = async () => {
    if (!formulaire) return;
    setTentativeFinalisation(true);
    if (!validerAvantEnvoi()) return;

    setEnSoumission(true);
    try {
      const soumissionId = await brouillon.forcerSync(
        reponsesVisibles(formulaire, reponses),
        coords,
      );
      if (soumissionId === undefined) {
        toast.error('La fiche n’a pas pu être envoyée. Vérifiez votre connexion.');
        return;
      }
      toast.success('Fiche enregistrée et envoyée pour validation.');
      navigate('/formulaires/brouillons');
    } finally {
      setEnSoumission(false);
    }
  };

  if (isLoading || !hydrate) {
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
  /* Compteur pied-de-section : dérivé des champs déjà révélés (`touches`),
   * donc mis à jour en direct au fil des corrections — pas un instantané figé
   * au moment du clic. */
  const erreursSectionCourante = champsAffiches.filter(
    (c) => touches.has(c.code) && erreurs[c.code],
  );

  return (
    <div className={styles.page}>
      <Link to="/formulaires" className={styles.retour}>
        <ArrowLeft size={14} aria-hidden="true" />
        Modèles
      </Link>

      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Saisie terrain</span>
          <h1 className={styles.heroTitle}>{formulaire.titre}</h1>
        </div>
        <div className={styles.heroActions}>
          <IndicateurSauvegarde
            etat={brouillon.etat}
            derniere={brouillon.derniereSauvegarde}
            isOnline={brouillon.isOnline}
          />
        </div>
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
                section terminée ; un cadenas signale une section pas encore atteinte.
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
            titre: peutValider ? 'Finaliser' : 'Enregistrer et soumettre pour validation',
            detail: peutValider
              ? 'Disponible en dernière section, une fois toutes les sections obligatoires complètes. C’est l’envoi définitif.'
              : 'Disponible en dernière section, une fois toutes les sections obligatoires complètes. Envoie la fiche à un superviseur pour validation.',
          },
        ]}
      />

      <div className={styles.corps}>
        {/* Stepper : colonne sur desktop, barre défilante sur mobile. */}
        <nav className={styles.stepper} aria-label="Sections du formulaire">
          {sections.map((s, i) => {
            const a = avancements[i]!;
            const etat = a.enErreur ? 'erreur' : a.complete ? 'complete' : 'encours';
            const verrouillee = !peutValider && i > maxSectionAtteinte;
            return (
              <button
                key={s.id}
                type="button"
                className={styles.etape}
                data-actif={i === indexSection ? 'true' : undefined}
                data-etat={etat}
                data-verrouillee={verrouillee ? 'true' : undefined}
                aria-disabled={verrouillee ? 'true' : undefined}
                onClick={() => allerASection(i)}
                aria-current={i === indexSection ? 'step' : undefined}
                title={
                  verrouillee
                    ? 'Complétez d’abord les sections précédentes pour y accéder.'
                    : undefined
                }
              >
                <span className={styles.etapeCorps}>
                  <span className={styles.etapeLibelle}>{s.libelle}</span>
                  <span className={styles.etapeCompteur}>
                    {a.obligatoires > 0 ? `${a.remplis}/${a.obligatoires} requis` : 'Facultative'}
                  </span>
                </span>
                <span className={styles.etapePuce} aria-hidden="true">
                  {verrouillee ? (
                    <Lock size={12} />
                  ) : a.enErreur ? (
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
              <div
                key={champ.id}
                data-champ-code={champ.code}
                onBlur={() => marquerTouche(champ.code)}
                /* Les champs longs (texte libre, choix multiple, GPS, fichier)
                 * occupent toute la largeur ; les champs courts se rangent en
                 * colonnes pour raccourcir les formulaires à 100+ questions. */
                data-large={CHAMPS_PLEINE_LARGEUR.has(champ.type) ? 'true' : undefined}
              >
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
                onClick={handleSuivant}
              >
                Suivant
              </Button>
            ) : peutValider ? (
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
            ) : (
              <Button
                variant="success"
                iconLeft={<Send size={15} />}
                onClick={() => void soumettrePourValidation()}
                loading={enSoumission}
                disabled={!toutComplet}
                title={toutComplet ? undefined : 'Complétez les champs obligatoires de chaque section.'}
              >
                Enregistrer et soumettre pour validation
              </Button>
            )}
          </footer>

          {erreursSectionCourante.length > 0 && indexSection < sections.length - 1 ? (
            <p className={styles.blocage}>
              <AlertTriangle size={13} aria-hidden="true" />
              {erreursSectionCourante.length} champ{erreursSectionCourante.length > 1 ? 's' : ''}{' '}
              {erreursSectionCourante.length > 1 ? 'restent' : 'reste'} à corriger dans cette
              section avant de continuer.
            </p>
          ) : null}

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

  /* Distinct de « local » : un 401/403 est définitif, pas une panne réseau
   * qui se résorbe au retour de connexion — le dire évite de laisser croire
   * qu'un envoi est simplement en attente. */
  if (etat === 'erreur') {
    return (
      <span className={`${styles.sauvegarde} ${styles.sauvegardeErreur}`}>
        <AlertTriangle size={13} aria-hidden="true" />
        Non enregistré — droit refusé par le serveur
      </span>
    );
  }

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
        <Spinner size={13} decoratif />
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
