/**
 * Règles d'affichage et de validation des formulaires natifs.
 *
 * Logique pure, sans React : c'est le cœur métier du module (un champ masqué
 * ne doit ni bloquer la soumission ni partir au serveur), et il doit pouvoir
 * être relu et testé indépendamment du rendu.
 */

import {
  estRempli,
  hasCondition,
  hasValidation,
  isGeopoint,
  type ChampNatif,
  type FormulairePublie,
  type ReponsesFormulaire,
  type SectionNatif,
  type ValeurChamp,
} from '../api/formulairesNatifs.types';

/* ═══════════════════════════════════════════════════════════
   Logique conditionnelle
═══════════════════════════════════════════════════════════ */

/**
 * Un champ conditionnel est visible si la condition portée par son parent est
 * satisfaite. `EQUALS` compare à la valeur du parent, `CONTAINS` teste
 * l'appartenance (cas d'un CHOIX_MULTIPLE).
 */
export function champVisible(champ: ChampNatif, reponses: ReponsesFormulaire): boolean {
  if (!hasCondition(champ)) return true;
  const { champParentCode, operateur, valeur } = champ.condition;
  const valeurParent = reponses[champParentCode];

  if (operateur === 'CONTAINS') {
    if (Array.isArray(valeurParent)) return valeurParent.includes(valeur);
    // Tolère un parent scalaire : « contient » dégénère alors en égalité.
    return valeurParent != null && String(valeurParent) === valeur;
  }
  return valeurParent != null && String(valeurParent) === valeur;
}

/** Champs effectivement affichés d'une section, dans l'ordre. */
export function champsVisiblesSection(
  section: SectionNatif,
  reponses: ReponsesFormulaire,
): ChampNatif[] {
  return [...section.champs]
    .sort((a, b) => a.ordre - b.ordre)
    .filter((c) => champVisible(c, reponses));
}

/**
 * Retire du payload les réponses des champs masqués.
 *
 * Sans ce filtrage, une valeur saisie puis masquée (l'agent coche « Autre »,
 * remplit le champ, puis décoche) partirait quand même au serveur.
 */
export function reponsesVisibles(
  formulaire: FormulairePublie,
  reponses: ReponsesFormulaire,
): ReponsesFormulaire {
  const sortie: ReponsesFormulaire = {};
  for (const section of formulaire.sections) {
    for (const champ of section.champs) {
      if (!champVisible(champ, reponses)) continue;
      const v = reponses[champ.code];
      if (v !== undefined) sortie[champ.code] = v;
    }
  }
  return sortie;
}

/* ═══════════════════════════════════════════════════════════
   Validation
═══════════════════════════════════════════════════════════ */

export type ErreursChamps = Record<string, string>;

function versNombre(v: ValeurChamp | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    // Le clavier décimal des terminaux francophones produit une virgule.
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Borne effective d'une règle : littérale, portée par un autre champ, ou calculée. */
function borneDeRegle(
  regle: { value?: number; fieldCode?: string; dynamicValue?: 'CURRENT_YEAR' },
  reponses: ReponsesFormulaire,
): number | null {
  if (regle.dynamicValue === 'CURRENT_YEAR') return new Date().getFullYear();
  if (regle.fieldCode !== undefined) return versNombre(reponses[regle.fieldCode]);
  if (regle.value !== undefined) return regle.value;
  return null;
}

/**
 * Valide un champ visible et renvoie le message d'erreur, ou `null`.
 *
 * Le message affiché est toujours celui fourni par l'API (`validation.message`) :
 * il est rédigé côté métier et traduit la règle mieux qu'un texte générique.
 */
export function validerChamp(
  champ: ChampNatif,
  reponses: ReponsesFormulaire,
): string | null {
  const valeur = reponses[champ.code];

  if (champ.obligatoire && !estRempli(valeur)) return 'Ce champ est obligatoire.';
  if (!estRempli(valeur)) return null;

  if (champ.type === 'GEOPOINT' && !isGeopoint(valeur)) {
    return 'Coordonnées GPS incomplètes.';
  }

  if (!hasValidation(champ)) return null;

  const n = versNombre(valeur);
  if (n === null) return null;

  for (const regle of champ.validation.rules) {
    const borne = borneDeRegle(regle, reponses);
    // Une borne portée par un champ encore vide n'est pas une infraction.
    if (borne === null) continue;
    if (regle.operator === 'GTE' && n < borne) return champ.validation.message;
    if (regle.operator === 'LTE' && n > borne) return champ.validation.message;
  }
  return null;
}

/**
 * Champs dont la validité dépend de celle de `code`.
 *
 * `nb_femmes ≤ nb_employes_total` doit être revalidé quand l'un **ou l'autre**
 * change : corriger le total doit lever l'erreur portée par nb_femmes.
 */
export function champsDependants(formulaire: FormulairePublie, code: string): ChampNatif[] {
  const out: ChampNatif[] = [];
  for (const section of formulaire.sections) {
    for (const champ of section.champs) {
      if (!hasValidation(champ)) continue;
      if (champ.validation.rules.some((r) => r.fieldCode === code)) out.push(champ);
    }
  }
  return out;
}

/** Valide tout le formulaire, en ignorant les champs masqués. */
export function validerFormulaire(
  formulaire: FormulairePublie,
  reponses: ReponsesFormulaire,
): ErreursChamps {
  const erreurs: ErreursChamps = {};
  for (const section of formulaire.sections) {
    for (const champ of section.champs) {
      if (!champVisible(champ, reponses)) continue;
      const e = validerChamp(champ, reponses);
      if (e) erreurs[champ.code] = e;
    }
  }
  return erreurs;
}

/* ═══════════════════════════════════════════════════════════
   Avancement par section
═══════════════════════════════════════════════════════════ */

export interface AvancementSection {
  obligatoires: number;
  remplis: number;
  complete: boolean;
  enErreur: boolean;
}

/**
 * Avancement d'une section — ne compte que les champs **visibles**, sinon le
 * compteur réclamerait des champs que l'agent ne peut pas voir.
 */
export function avancementSection(
  section: SectionNatif,
  reponses: ReponsesFormulaire,
  erreurs: ErreursChamps = {},
): AvancementSection {
  const visibles = champsVisiblesSection(section, reponses);
  const obligatoires = visibles.filter((c) => c.obligatoire);
  const remplis = obligatoires.filter((c) => estRempli(reponses[c.code])).length;
  const enErreur = visibles.some((c) => Boolean(erreurs[c.code]));
  return {
    obligatoires: obligatoires.length,
    remplis,
    complete: remplis === obligatoires.length,
    enErreur,
  };
}

export function formulaireComplet(
  formulaire: FormulairePublie,
  reponses: ReponsesFormulaire,
): boolean {
  return formulaire.sections.every((s) => avancementSection(s, reponses).complete);
}

/* ═══════════════════════════════════════════════════════════
   Cohérence métier (non bloquante)
═══════════════════════════════════════════════════════════ */

export interface AlerteCoherence {
  champCode: string;
  message: string;
}

/**
 * Signale une répartition femmes/hommes qui ne retombe pas sur l'effectif
 * total. L'API ne l'impose pas — c'est un garde-fou utile à l'agent, jamais
 * un blocage.
 */
export function alertesCoherence(reponses: ReponsesFormulaire): AlerteCoherence[] {
  const total = versNombre(reponses['grp_a/nb_employes_total']);
  const femmes = versNombre(reponses['grp_a/nb_femmes']);
  const hommes = versNombre(reponses['grp_a/nb_hommes']);
  if (total === null || femmes === null || hommes === null) return [];
  if (femmes + hommes === total) return [];
  return [
    {
      champCode: 'grp_a/nb_employes_total',
      message: `Femmes (${femmes}) + hommes (${hommes}) = ${femmes + hommes}, alors que le total saisi est ${total}.`,
    },
  ];
}

/* ═══════════════════════════════════════════════════════════
   Options exclusives (« Aucun »)
═══════════════════════════════════════════════════════════ */

/**
 * Une option « aucun / aucune » exclut les autres réponses d'un CHOIX_MULTIPLE.
 * Détecté sur la valeur plutôt que codé en dur par champ, pour couvrir aussi
 * les champs ajoutés plus tard via le constructeur.
 */
export function estOptionExclusive(value: string): boolean {
  return /^aucun(e)?$/i.test(value.trim());
}

/**
 * Applique la règle d'exclusivité à un CHOIX_MULTIPLE : cocher « Aucun » vide
 * la sélection, cocher autre chose retire « Aucun ».
 */
export function basculerChoixMultiple(
  selection: string[],
  option: string,
  coche: boolean,
): string[] {
  if (!coche) return selection.filter((v) => v !== option);
  if (estOptionExclusive(option)) return [option];
  return [...selection.filter((v) => !estOptionExclusive(v)), option];
}

/* ═══════════════════════════════════════════════════════════
   Génération de code (constructeur)
═══════════════════════════════════════════════════════════ */

/** `A` → `grp_a`, en conservant les codes déjà préfixés ou hors groupe. */
export function prefixeSection(codeSection: string): string {
  const base = codeSection.trim().toLowerCase();
  return base.startsWith('grp_') ? base : `grp_${base}`;
}

export function slugifier(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/['\u2019]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/** Code complet suivant la convention backend : `grp_a/nom_du_champ`. */
export function genererCodeChamp(codeSection: string, libelle: string): string {
  const slug = slugifier(libelle) || 'champ';
  return `${prefixeSection(codeSection)}/${slug}`;
}

/** Un code doit être unique dans tout le formulaire — c'est la clé des réponses. */
export function codeDisponible(
  formulaire: FormulairePublie,
  code: string,
  champIdIgnore?: number,
): boolean {
  return !formulaire.sections.some((s) =>
    s.champs.some((c) => c.code === code && c.id !== champIdIgnore),
  );
}
