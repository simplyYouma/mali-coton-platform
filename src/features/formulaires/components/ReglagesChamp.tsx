import { useState } from 'react';
import { Check, ClipboardPaste, FlaskConical, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, FormField, Input, Select, Textarea } from '@/components/common';
import { fetchOptionsReference } from '../api/formulairesNatifs';
import {
  genererCodeChamp,
  slugifier,
  codeDisponible,
} from '../lib/logiqueChamp';
import {
  champsNumeriques,
  parentsPossibles,
  type ChampBrouillon,
  type StructureBrouillon,
} from '../lib/brouillonStructure';
import {
  hasValidation,
  type ConditionChamp,
  type FormulairePublie,
  type OptionChamp,
  type OptionsSource,
  type RegleValidation,
  type ValidationChamp,
} from '../api/formulairesNatifs.types';
import styles from './ReglagesChamp.module.css';

/** Raccourcis pour les deux listes de référence connues du backend. */
const SOURCES_CONNUES: Array<{ nom: string; source: OptionsSource }> = [
  {
    nom: 'Sites de collecte',
    source: {
      mode: 'reference', resource: 'sites_collecte', endpoint: '/api/references/sites-collecte',
      valueField: 'value', labelField: 'label', idField: 'resourceId', permission: 'site.read',
    },
  },
  {
    nom: 'Agents de collecte',
    source: {
      mode: 'reference', resource: 'agents_collecte', endpoint: '/api/references/agents-collecte',
      valueField: 'value', labelField: 'label', idField: 'resourceId', permission: 'collecte.create',
    },
  },
];

interface ReglagesChampProps {
  champ: ChampBrouillon;
  brouillon: StructureBrouillon;
  formulaire: FormulairePublie;
  ordreSections: string[];
  onChange: (patch: Partial<ChampBrouillon>) => void;
}

export function ReglagesChamp({
  champ,
  brouillon,
  formulaire,
  ordreSections,
  onChange,
}: ReglagesChampProps) {
  const [codeManuel, setCodeManuel] = useState(false);
  const estChoix = champ.type === 'CHOIX_SIMPLE' || champ.type === 'CHOIX_MULTIPLE';
  const estNumerique = champ.type === 'ENTIER' || champ.type === 'DECIMAL';

  const codeDejaPris =
    champ.code !== '' && !codeDisponible(formulaire, champ.code, champ.id > 0 ? champ.id : undefined)
    && brouillon.champs.filter((c) => c.code === champ.code && c.etat !== 'supprime').length > 1;

  /* Le code suit le libellé tant que l'utilisateur ne l'a pas repris à la main :
   * il reste lisible sans imposer une saisie technique. */
  const majLibelle = (libelle: string) => {
    const patch: Partial<ChampBrouillon> = { libelle };
    if (!codeManuel && champ.etat === 'nouveau') {
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

        <FormField
          label="Code"
          error={codeDejaPris ? 'Ce code est déjà utilisé dans le formulaire.' : undefined}
          hint={!codeManuel ? 'Dérivé du libellé.' : undefined}
        >
          <Input
            value={champ.code}
            onChange={(e) => {
              setCodeManuel(true);
              onChange({ code: e.target.value });
            }}
            className={styles.mono}
            invalid={codeDejaPris}
          />
        </FormField>
        {!codeManuel ? (
          <button type="button" className={styles.lienDiscret} onClick={() => setCodeManuel(true)}>
            modifier le code
          </button>
        ) : null}

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
  const [test, setTest] = useState<{ etat: 'idle' | 'charge' | 'ok' | 'ko'; apercu: OptionChamp[] }>({
    etat: 'idle',
    apercu: [],
  });

  const dynamique = champ.optionsSource !== null;

  const majOption = (i: number, patch: Partial<OptionChamp>) => {
    const options = champ.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onChange({ options });
  };

  const testerSource = async () => {
    if (!champ.optionsSource) return;
    setTest({ etat: 'charge', apercu: [] });
    try {
      const options = await fetchOptionsReference(champ.optionsSource);
      setTest({ etat: 'ok', apercu: options.slice(0, 3) });
    } catch {
      setTest({ etat: 'ko', apercu: [] });
    }
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
            onChange({ optionsSource: champ.optionsSource ?? SOURCES_CONNUES[0]!.source, options: [] })
          }
        >
          Liste dynamique
        </button>
      </div>

      {dynamique && champ.optionsSource ? (
        <div className={styles.champsEmpiles}>
          <div className={styles.raccourcis}>
            {SOURCES_CONNUES.map((s) => (
              <button
                key={s.source.resource}
                type="button"
                className={styles.raccourci}
                onClick={() => onChange({ optionsSource: s.source })}
              >
                {s.nom}
              </button>
            ))}
          </div>
          {(['resource', 'endpoint', 'valueField', 'labelField', 'idField', 'permission'] as const).map(
            (cle) => (
              <FormField key={cle} label={cle}>
                <Input
                  value={champ.optionsSource![cle]}
                  onChange={(e) =>
                    onChange({ optionsSource: { ...champ.optionsSource!, [cle]: e.target.value } })
                  }
                  className={styles.mono}
                />
              </FormField>
            ),
          )}
          <Button
            variant="secondary"
            size="sm"
            iconLeft={
              test.etat === 'charge' ? <Loader2 size={14} className={styles.spin} /> : <FlaskConical size={14} />
            }
            onClick={() => void testerSource()}
          >
            Tester l’endpoint
          </Button>
          {test.etat === 'ok' ? (
            <div className={styles.testOk}>
              <Check size={13} aria-hidden="true" />
              <div>
                <strong>{test.apercu.length} option(s) lues :</strong>
                <ul className={styles.testListe}>
                  {test.apercu.map((o) => (
                    <li key={o.value}>
                      <code>{o.value}</code> — {o.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {test.etat === 'ko' ? (
            <p className={styles.testKo}>
              Appel impossible — vérifiez l’endpoint et vos droits.
            </p>
          ) : null}
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
