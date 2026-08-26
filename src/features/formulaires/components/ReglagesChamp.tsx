import { useState } from 'react';
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, FormField, Input, Select, Textarea } from '@/components/common';
import { genererCodeChamp, slugifier } from '../lib/logiqueChamp';
import {
  champsNumeriques,
  parentsPossibles,
  type ChampBrouillon,
  type StructureBrouillon,
} from '../lib/brouillonStructure';
import {
  hasValidation,
  SOURCE_AGENTS_COLLECTE,
  type ConditionChamp,
  type OptionChamp,
  type OptionsSource,
  type RegleValidation,
  type ValidationChamp,
} from '../api/formulairesNatifs.types';
import styles from './ReglagesChamp.module.css';

/**
 * Listes de référence servies par le backend, présentées par leur nom métier.
 *
 * `sites_collecte` : un site désactivé (`SiteTeinture.actif = false`, voir
 * `features/sites`) ne doit plus être une cible de collecte possible sur
 * `grp_a/site_code`. `fetchOptionsReference()` filtre désormais côté client
 * (`actif !== false`) — que `/api/references/sites-collecte` le fasse déjà
 * côté serveur reste non vérifiable ici (jeton réel requis) ; si l'API les
 * exclut déjà, ce filtre est sans effet, donc sûr dans les deux cas.
 */
const SOURCES_REFERENCE: Array<{ nom: string; source: OptionsSource }> = [
  {
    nom: 'Sites de collecte',
    source: {
      mode: 'reference', resource: 'sites_collecte', endpoint: '/api/references/sites-collecte',
      valueField: 'value', labelField: 'label', idField: 'resourceId', permission: 'site.read',
    },
  },
  {
    nom: 'Agents de collecte',
    source: SOURCE_AGENTS_COLLECTE,
  },
];

interface ReglagesChampProps {
  champ: ChampBrouillon;
  brouillon: StructureBrouillon;
  ordreSections: string[];
  onChange: (patch: Partial<ChampBrouillon>) => void;
}

export function ReglagesChamp({
  champ,
  brouillon,
  ordreSections,
  onChange,
}: ReglagesChampProps) {
  const estChoix = champ.type === 'CHOIX_SIMPLE' || champ.type === 'CHOIX_MULTIPLE';
  const estNumerique = champ.type === 'ENTIER' || champ.type === 'DECIMAL';

  /* Le code technique est dérivé du libellé et jamais montré : c'est une clé
   * interne, pas une information utile à qui édite le questionnaire. Il n'est
   * régénéré que sur un champ neuf — le renommer sur un champ publié casserait
   * le lien avec les réponses déjà collectées. */
  const majLibelle = (libelle: string) => {
    const patch: Partial<ChampBrouillon> = { libelle };
    if (champ.etat === 'nouveau') {
      patch.code = genererCodeChamp(champ.sectionCode, libelle);
    }
    onChange(patch);
  };

  return (
    <div className={styles.panneau}>
      <Bloc titre="Général">
        <FormField label="Libellé" required>
          <Input
            value={champ.libelle}
            onChange={(e) => majLibelle(e.target.value)}
            placeholder="Intitulé vu par l’agent"
            data-champ-libelle
          />
        </FormField>

        <FormField label="Texte d’aide">
          <Input
            value={champ.aide ?? ''}
            onChange={(e) => onChange({ aide: e.target.value || null })}
            placeholder="Précision affichée sous le champ"
          />
        </FormField>

        <Checkbox
          label="Réponse obligatoire"
          checked={champ.obligatoire}
          onChange={(e) => onChange({ obligatoire: e.target.checked })}
        />

        <FormField label="Valeur par défaut">
          <Input
            value={champ.valeurParDefaut ?? ''}
            onChange={(e) => onChange({ valeurParDefaut: e.target.value || null })}
          />
        </FormField>
      </Bloc>

      {estChoix ? (
        <Bloc titre="Options">
          <EditeurOptions champ={champ} onChange={onChange} />
        </Bloc>
      ) : null}

      <Bloc titre="Logique d’affichage">
        <EditeurCondition
          champ={champ}
          brouillon={brouillon}
          ordreSections={ordreSections}
          onChange={onChange}
        />
      </Bloc>

      {estNumerique ? (
        <Bloc titre="Validation">
          <EditeurValidation champ={champ} brouillon={brouillon} onChange={onChange} />
        </Bloc>
      ) : null}
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className={styles.bloc}>
      <h3 className={styles.blocTitre}>{titre}</h3>
      <div className={styles.blocCorps}>{children}</div>
    </section>
  );
}

/* ═══ Options ═══ */

function EditeurOptions({
  champ,
  onChange,
}: {
  champ: ChampBrouillon;
  onChange: (patch: Partial<ChampBrouillon>) => void;
}) {
  const [collageOuvert, setCollageOuvert] = useState(false);
  const [collage, setCollage] = useState('');
  const dynamique = champ.optionsSource !== null;

  const majOption = (i: number, patch: Partial<OptionChamp>) => {
    const options = champ.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onChange({ options });
  };

  return (
    <>
      <div className={styles.bascule} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!dynamique}
          className={styles.basculeBtn}
          data-actif={!dynamique ? 'true' : undefined}
          onClick={() => onChange({ optionsSource: null })}
        >
          Liste fixe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={dynamique}
          className={styles.basculeBtn}
          data-actif={dynamique ? 'true' : undefined}
          onClick={() =>
            onChange({ optionsSource: champ.optionsSource ?? SOURCES_REFERENCE[0]!.source, options: [] })
          }
        >
          Liste dynamique
        </button>
      </div>

      {dynamique && champ.optionsSource ? (
        <div className={styles.champsEmpiles}>
          {/* Le mapping technique (endpoint, champs, permission) est porté par
            * SOURCES_REFERENCE : le choisir revient à choisir une liste métier,
            * pas à configurer un appel HTTP. */}
          <FormField label="Liste de référence">
            <Select
              value={champ.optionsSource.resource}
              onChange={(resource) => {
                const src = SOURCES_REFERENCE.find((o) => o.source.resource === resource);
                if (src) onChange({ optionsSource: src.source });
              }}
              options={SOURCES_REFERENCE.map((o) => ({ value: o.source.resource, label: o.nom }))}
              fullWidth
            />
          </FormField>
          <p className={styles.note}>
            Les choix proposés à l’agent sont tenus à jour automatiquement à partir de cette liste.
          </p>
        </div>
      ) : (
        <div className={styles.champsEmpiles}>
          <ul className={styles.options}>
            {champ.options.map((o, i) => (
              <li key={i} className={styles.optionLigne}>
                <Input
                  value={o.label}
                  placeholder="Libellé"
                  onChange={(e) =>
                    /* La valeur suit le libellé tant qu'elle n'a pas divergé —
                     * saisir 13 options ne doit pas demander 26 champs. */
                    majOption(i, {
                      label: e.target.value,
                      ...(o.value === slugifier(o.label) || o.value === ''
                        ? { value: slugifier(e.target.value) }
                        : {}),
                    })
                  }
                />
                <Input
                  value={o.value}
                  placeholder="valeur"
                  className={styles.mono}
                  onChange={(e) => majOption(i, { value: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.iconeBtn}
                  onClick={() => onChange({ options: champ.options.filter((_, idx) => idx !== i) })}
                  aria-label={`Supprimer l’option ${o.label || i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.optionsActions}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => onChange({ options: [...champ.options, { value: '', label: '' }] })}
            >
              Ajouter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<ClipboardPaste size={14} />}
              onClick={() => setCollageOuvert((v) => !v)}
            >
              Coller une liste
            </Button>
          </div>
          {collageOuvert ? (
            <div className={styles.champsEmpiles}>
              <Textarea
                rows={5}
                value={collage}
                onChange={(e) => setCollage(e.target.value)}
                placeholder={'Un libellé par ligne\nForage sur site\nPuits traditionnel'}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const nouvelles = collage
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((label) => ({ label, value: slugifier(label) }));
                  onChange({ options: [...champ.options, ...nouvelles] });
                  setCollage('');
                  setCollageOuvert(false);
                }}
                disabled={collage.trim() === ''}
              >
                Créer {collage.split('\n').filter((l) => l.trim()).length} option(s)
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

/* ═══ Condition ═══ */

function EditeurCondition({
  champ,
  brouillon,
  ordreSections,
  onChange,
}: {
  champ: ChampBrouillon;
  brouillon: StructureBrouillon;
  ordreSections: string[];
  onChange: (patch: Partial<ChampBrouillon>) => void;
}) {
  const actif = champ.condition?.active === true;
  const parents = parentsPossibles(brouillon, champ, ordreSections);
  const parent = parents.find((p) => p.code === champ.condition?.champParentCode);

  const majCondition = (patch: Partial<ConditionChamp>) => {
    const base: ConditionChamp = champ.condition ?? {
      active: true,
      champParentCode: '',
      operateur: 'EQUALS',
      valeur: '',
      logique: 'AND',
    };
    onChange({ condition: { ...base, ...patch } });
  };

  return (
    <>
      <Checkbox
        label="N’afficher que si…"
        checked={actif}
        onChange={(e) =>
          onChange({
            condition: e.target.checked
              ? {
                  active: true,
                  champParentCode: parents[0]?.code ?? '',
                  operateur: 'EQUALS',
                  valeur: '',
                  logique: 'AND',
                }
              : null,
          })
        }
      />

      {actif && champ.condition ? (
        <div className={styles.champsEmpiles}>
          {parents.length === 0 ? (
            <p className={styles.note}>
              Aucun champ ne précède celui-ci — une condition ne peut porter que sur un champ
              antérieur.
            </p>
          ) : (
            <>
              <FormField label="Champ de référence">
                <Select
                  value={champ.condition.champParentCode || null}
                  onChange={(v) => majCondition({ champParentCode: v, valeur: '' })}
                  options={parents.map((p) => ({ value: p.code, label: p.libelle || p.code }))}
                  fullWidth
                />
              </FormField>
              <FormField label="Opérateur">
                <Select
                  value={champ.condition.operateur}
                  onChange={(v) => majCondition({ operateur: v as 'EQUALS' | 'CONTAINS' })}
                  options={[
                    { value: 'EQUALS', label: 'est égal à' },
                    { value: 'CONTAINS', label: 'contient' },
                  ]}
                  fullWidth
                />
              </FormField>
              <FormField label="Valeur">
                {/* Si le parent a des options, on les propose : saisir la valeur
                 * à la main est la première source d'erreur silencieuse. */}
                {parent && parent.options.length > 0 ? (
                  <Select
                    value={champ.condition.valeur || null}
                    onChange={(v) => majCondition({ valeur: v })}
                    options={parent.options.map((o) => ({ value: o.value, label: o.label }))}
                    fullWidth
                  />
                ) : (
                  <Input
                    value={champ.condition.valeur}
                    onChange={(e) => majCondition({ valeur: e.target.value })}
                    className={styles.mono}
                  />
                )}
              </FormField>
              <p className={styles.recap}>
                Ce champ s’affiche si <strong>{parent?.libelle ?? champ.condition.champParentCode}</strong>{' '}
                {champ.condition.operateur === 'CONTAINS' ? 'contient' : 'est égal à'}{' '}
                <strong>
                  {parent?.options.find((o) => o.value === champ.condition!.valeur)?.label ??
                    champ.condition.valeur ??
                    '…'}
                </strong>
                .
              </p>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

/* ═══ Validation ═══ */

type TypeBorne = 'value' | 'fieldCode' | 'dynamicValue';

function typeBorne(r: RegleValidation): TypeBorne {
  if (r.fieldCode !== undefined) return 'fieldCode';
  if (r.dynamicValue !== undefined) return 'dynamicValue';
  return 'value';
}

function EditeurValidation({
  champ,
  brouillon,
  onChange,
}: {
  champ: ChampBrouillon;
  brouillon: StructureBrouillon;
  onChange: (patch: Partial<ChampBrouillon>) => void;
}) {
  const validation: ValidationChamp = hasValidation(champ)
    ? champ.validation
    : { rules: [], message: '' };
  const numeriques = champsNumeriques(brouillon).filter((c) => c.id !== champ.id);

  const majRegles = (rules: RegleValidation[], message = validation.message) => {
    // Plus aucune règle : on repasse au tableau vide, forme attendue par l'API.
    onChange({ validation: rules.length === 0 ? [] : { rules, message } });
  };

  const majRegle = (i: number, patch: RegleValidation) => {
    majRegles(validation.rules.map((r, idx) => (idx === i ? patch : r)));
  };

  return (
    <div className={styles.champsEmpiles}>
      <ul className={styles.regles}>
        {validation.rules.map((regle, i) => {
          const borne = typeBorne(regle);
          return (
            <li key={i} className={styles.regleLigne}>
              <Select
                value={regle.operator}
                onChange={(v) => majRegle(i, { ...regle, operator: v as 'GTE' | 'LTE' })}
                options={[
                  { value: 'GTE', label: 'au moins' },
                  { value: 'LTE', label: 'au plus' },
                ]}
                size="sm"
              />
              <Select
                value={borne}
                onChange={(v) => {
                  const t = v as TypeBorne;
                  majRegle(i, {
                    operator: regle.operator,
                    ...(t === 'value' ? { value: 0 } : {}),
                    ...(t === 'fieldCode' ? { fieldCode: numeriques[0]?.code ?? '' } : {}),
                    ...(t === 'dynamicValue' ? { dynamicValue: 'CURRENT_YEAR' as const } : {}),
                  });
                }}
                options={[
                  { value: 'value', label: 'valeur fixe' },
                  { value: 'fieldCode', label: 'autre champ' },
                  { value: 'dynamicValue', label: 'valeur dynamique' },
                ]}
                size="sm"
              />
              <span className={styles.regleBorne}>
              {borne === 'value' ? (
                <Input
                  type="number"
                  value={regle.value ?? 0}
                  onChange={(e) => majRegle(i, { operator: regle.operator, value: Number(e.target.value) })}
                  inputSize="sm"
                />
              ) : borne === 'fieldCode' ? (
                <Select
                  value={regle.fieldCode ?? null}
                  onChange={(v) => majRegle(i, { operator: regle.operator, fieldCode: v })}
                  options={numeriques.map((c) => ({ value: c.code, label: c.libelle || c.code }))}
                  size="sm"
                />
              ) : (
                <Select
                  value="CURRENT_YEAR"
                  onChange={() => undefined}
                  options={[{ value: 'CURRENT_YEAR', label: 'année en cours' }]}
                  size="sm"
                />
              )}
              </span>
              <button
                type="button"
                className={styles.iconeBtn}
                onClick={() => majRegles(validation.rules.filter((_, idx) => idx !== i))}
                aria-label="Supprimer la règle"
              >
                <Trash2 size={14} />
              </button>
              <p className={styles.recapRegle}>
                Doit être {regle.operator === 'GTE' ? 'au moins' : 'au plus'} égal à{' '}
                <strong>
                  {borne === 'value'
                    ? regle.value
                    : borne === 'dynamicValue'
                      ? 'l’année en cours'
                      : (numeriques.find((c) => c.code === regle.fieldCode)?.libelle ?? regle.fieldCode)}
                </strong>
                .
              </p>
            </li>
          );
        })}
      </ul>

      <Button
        variant="secondary"
        size="sm"
        iconLeft={<Plus size={14} />}
        onClick={() => majRegles([...validation.rules, { operator: 'GTE', value: 0 }])}
      >
        Ajouter une règle
      </Button>

      {validation.rules.length > 0 ? (
        <FormField label="Message d’erreur" hint="Affiché tel quel à l’agent.">
          <Input
            value={validation.message}
            onChange={(e) => majRegles(validation.rules, e.target.value)}
            placeholder="Ne peut dépasser le total."
          />
        </FormField>
      ) : null}
    </div>
  );
}
