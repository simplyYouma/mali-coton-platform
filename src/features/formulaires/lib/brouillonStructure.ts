/**
 * État d'édition du constructeur de formulaire.
 *
 * Les formulaires sont **publiés et déjà utilisés** : toute modification de
 * structure peut casser des soumissions en cours. On travaille donc sur un
 * brouillon local, explicitement enregistré, plutôt qu'en écriture directe —
 * et on garde trace de ce qui vient du serveur pour pouvoir avertir avant de
 * toucher à un champ déjà en production.
 */

import type {
  ChampNatif,
  FormulairePublie,
  TypeChampNatif,
} from '../api/formulairesNatifs.types';

export type EtatChamp = 'inchange' | 'nouveau' | 'modifie' | 'supprime';

export interface ChampBrouillon extends ChampNatif {
  /** Négatif pour un champ pas encore créé côté serveur. */
  id: number;
  sectionCode: string;
  etat: EtatChamp;
  /** Code d'origine — sert à détecter un renommage, qui est le changement le plus risqué. */
  codeOrigine?: string;
}

export interface StructureBrouillon {
  formulaireId: number;
  formulaireCode: string;
  champs: ChampBrouillon[];
}

let compteurTemporaire = -1;
export function prochainIdTemporaire(): number {
  compteurTemporaire -= 1;
  return compteurTemporaire;
}

export function estNouveau(champ: ChampBrouillon): boolean {
  return champ.id < 0;
}

export function versBrouillon(f: FormulairePublie): StructureBrouillon {
  return {
    formulaireId: f.id,
    formulaireCode: f.code,
    champs: [...f.sections]
      .sort((a, b) => a.ordre - b.ordre)
      .flatMap((s) =>
        [...s.champs]
          .sort((a, b) => a.ordre - b.ordre)
          .map((c): ChampBrouillon => ({
            ...c,
            sectionCode: s.code,
            etat: 'inchange',
            codeOrigine: c.code,
          })),
      ),
  };
}

export function champsDeSection(b: StructureBrouillon, sectionCode: string): ChampBrouillon[] {
  return b.champs
    .filter((c) => c.sectionCode === sectionCode && c.etat !== 'supprime')
    .sort((a, b2) => a.ordre - b2.ordre);
}

export function champVierge(
  sectionCode: string,
  type: TypeChampNatif,
  ordre: number,
): ChampBrouillon {
  return {
    id: prochainIdTemporaire(),
    code: '',
    libelle: '',
    type,
    ordre,
    obligatoire: false,
    aide: null,
    options: [],
    optionsSource: null,
    validation: [],
    valeurParDefaut: null,
    condition: null,
    sectionCode,
    etat: 'nouveau',
  };
}

/** Marque un champ serveur comme modifié ; un champ nouveau le reste. */
export function marquerModifie(champ: ChampBrouillon): ChampBrouillon {
  return { ...champ, etat: estNouveau(champ) ? 'nouveau' : 'modifie' };
}

export interface ResumeChangements {
  ajouts: number;
  modifications: number;
  suppressions: number;
  total: number;
  /** Renommages de code sur des champs déjà publiés — le cas le plus risqué. */
  renommagesPublies: ChampBrouillon[];
}

export function resumerChangements(b: StructureBrouillon): ResumeChangements {
  const ajouts = b.champs.filter((c) => c.etat === 'nouveau').length;
  const modifications = b.champs.filter((c) => c.etat === 'modifie').length;
  const suppressions = b.champs.filter((c) => c.etat === 'supprime' && !estNouveau(c)).length;
  const renommagesPublies = b.champs.filter(
    (c) => !estNouveau(c) && c.codeOrigine !== undefined && c.codeOrigine !== c.code,
  );
  return {
    ajouts,
    modifications,
    suppressions,
    total: ajouts + modifications + suppressions,
    renommagesPublies,
  };
}

/**
 * Champs utilisables comme parent d'une condition : uniquement ceux **situés
 * avant** dans l'ordre du formulaire, pour exclure toute dépendance circulaire.
 */
export function parentsPossibles(
  b: StructureBrouillon,
  champ: ChampBrouillon,
  ordreSections: string[],
): ChampBrouillon[] {
  const rang = (c: ChampBrouillon) => [ordreSections.indexOf(c.sectionCode), c.ordre] as const;
  const [sc, oc] = rang(champ);
  return b.champs
    .filter((c) => c.etat !== 'supprime' && c.id !== champ.id && c.code !== '')
    .filter((c) => {
      const [s, o] = rang(c);
      return s < sc || (s === sc && o < oc);
    })
    .sort((a, b2) => {
      const [sa, oa] = rang(a);
      const [sb, ob] = rang(b2);
      return sa - sb || oa - ob;
    });
}

/** Champs numériques, seuls candidats valides pour une borne `fieldCode`. */
export function champsNumeriques(b: StructureBrouillon): ChampBrouillon[] {
  return b.champs.filter(
    (c) => c.etat !== 'supprime' && (c.type === 'ENTIER' || c.type === 'DECIMAL'),
  );
}
