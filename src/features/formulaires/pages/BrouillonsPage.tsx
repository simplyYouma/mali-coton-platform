import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CloudOff,
  FileText,
  Inbox,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  NoteExplicative,
  Select,
  SkeletonListe,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { formatRelativeTime } from '@/lib/format';
import { useBrouillonsListe, type BrouillonFusionne } from '../hooks/useBrouillonsFusionnes';
import { useFinaliserSoumission, useFormulairesPublies, useOptionsReference } from '../hooks/useFormulairesNatifs';
import { effacerBrouillonLocal } from '../hooks/useBrouillonLocal';
import { avancementSection } from '../lib/logiqueChamp';
import { extraireErreursValidation } from '../api/formulairesNatifs';
import { SOURCE_AGENTS_COLLECTE, type FormulairePublie } from '../api/formulairesNatifs.types';
import styles from './BrouillonsPage.module.css';

const LIMITE_PAGE = 20;

/** Champs obligatoires remplis sur l'ensemble du formulaire. */
function progression(f: FormulairePublie | undefined, b: BrouillonFusionne) {
  if (!f) return { remplis: 0, total: 0, pct: 0 };
  let remplis = 0;
  let total = 0;
  for (const section of f.sections) {
    const a = avancementSection(section, b.reponses);
    remplis += a.remplis;
    total += a.obligatoires;
  }
  return { remplis, total, pct: total > 0 ? Math.round((remplis / total) * 100) : 0 };
}

/** Index de la première section dont les champs obligatoires ne sont pas tous remplis. */
function premiereSectionIncomplete(f: FormulairePublie | undefined, b: BrouillonFusionne): number {
  if (!f) return 0;
  const ordonnees = [...f.sections].sort((x, y) => x.ordre - y.ordre);
  const i = ordonnees.findIndex((s) => !avancementSection(s, b.reponses).complete);
  return i < 0 ? 0 : i;
}

export function BrouillonsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [page, setPage] = useState(1);
  const [filtreModele, setFiltreModele] = useState('');

  const { items, total, isLoading, peutVoirTout } = useBrouillonsListe({
    page,
    limite: LIMITE_PAGE,
    formulaireCode: filtreModele || undefined,
  });
  const { formulaires } = useFormulairesPublies();
  const finaliserMut = useFinaliserSoumission();

  /* Résolution auteur → nom : la même liste de référence que le champ
   * `grp_a/agent` du formulaire, pas un second appel dédié. N'est chargée
   * qu'en vue « tous », où la colonne auteur existe. */
  const { data: agents } = useOptionsReference(peutVoirTout ? SOURCE_AGENTS_COLLECTE : null);
  const nomParAuteur = useMemo(() => {
    const map = new Map<string, string>();
    (agents ?? []).forEach((a) => map.set(a.value, a.label));
    return map;
  }, [agents]);

  // Un changement de filtre repart en première page — la pagination du filtre précédent n'a plus de sens.
  useEffect(() => {
    setPage(1);
  }, [filtreModele]);

  const parCode = useMemo(
    () => new Map(formulaires.map((f) => [f.code, f])),
    [formulaires],
  );

  const supprimer = async (b: BrouillonFusionne) => {
    const titre = parCode.get(b.formulaireCode)?.titre ?? 'cette fiche';
    const ok = await confirm({
      title: `Supprimer le brouillon de « ${titre} » ?`,
      message:
        b.origine === 'local'
          ? 'La saisie enregistrée sur cet appareil sera définitivement perdue.'
          : 'La saisie en cours sera définitivement perdue.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    /* Seule la copie locale est effaçable : l'API ne documente pas de
     * suppression de brouillon serveur. On le dit plutôt que de laisser croire
     * à un effacement complet. Ciblé par clientSubmissionId — jamais par
     * formulaireCode, qui identifie un modèle et non un brouillon précis. */
    effacerBrouillonLocal(userId, b.clientSubmissionId);
    toast.success(
      b.origine === 'local'
        ? 'Brouillon supprimé de cet appareil.'
        : 'Brouillon retiré de cet appareil — la copie serveur subsiste.',
    );
  };

  /**
   * Finalisation directe depuis la liste — réservée à `soumission.validate`.
   *
   * Le brouillon peut appartenir à un autre agent : que l'API accepte une
   * finalisation sur un brouillon dont on n'est pas l'auteur est un point de
   * contrat backend non vérifiable ici (jeton réel requis). S'il la refuse,
   * l'échec remonte tel quel plutôt que d'être masqué.
   */
  const finaliserLigne = async (b: BrouillonFusionne) => {
    if (b.soumissionId === undefined) return;
    try {
      await finaliserMut.mutateAsync(b.soumissionId);
      toast.success('Fiche finalisée.');
    } catch (err) {
      const violations = extraireErreursValidation(err);
      toast.error(
        violations.length > 0
          ? `${violations.length} champ${violations.length > 1 ? 's' : ''} refusé${violations.length > 1 ? 's' : ''} par le serveur — ouvrez la fiche pour corriger.`
          : err instanceof Error
            ? err.message
            : 'La finalisation a échoué.',
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMITE_PAGE));

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Collecte terrain</span>
          <h1 className={styles.heroTitle}>{peutVoirTout ? 'Tous les brouillons' : 'Mes brouillons'}</h1>
        </div>
      </header>

      <NoteExplicative
        id="formulaires-brouillons"
        titre="Vos fiches commencées et non envoyées"
        resume={
          peutVoirTout ? (
            <>
              Cette liste couvre <strong>tous les agents</strong> : votre permission de valider
              les soumissions vous donne aussi une vue d’ensemble des fiches en cours. Chaque
              ligne indique son auteur.
            </>
          ) : (
            <>
              Une fiche reste ici tant qu’elle n’a pas été finalisée. Vous pouvez la reprendre à
              tout moment : la saisie repart sur la première section encore incomplète.
            </>
          )
        }
        etapes={[
          {
            titre: 'La progression',
            detail: 'Compte les champs obligatoires déjà renseignés sur l’ensemble de la fiche.',
          },
          {
            titre: 'Sur l’appareil',
            detail: 'Signale une saisie pas encore transmise au serveur — elle partira au retour du réseau.',
          },
          {
            titre: 'Reprendre',
            detail: 'Rouvre la fiche là où elle s’est arrêtée.',
          },
        ]}
      />

      {peutVoirTout ? (
        <div className={styles.filtres}>
          <Select
            value={filtreModele || null}
            onChange={(v) => setFiltreModele(v)}
            options={[
              { value: '', label: 'Tous les modèles' },
              ...formulaires.map((f) => ({ value: f.code, label: f.titre })),
            ]}
            aria-label="Filtrer par modèle"
          />
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonListe lignes={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} />}
          title="Aucun brouillon en cours"
          description="Les fiches que vous commencez sans les envoyer apparaîtront ici."
          action={
            <Link to="/formulaires">
              <Button variant="primary" iconLeft={<FileText size={15} />}>
                Voir les modèles
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className={styles.liste}>
          {items.map((b) => {
            const f = parCode.get(b.formulaireCode);
            const p = progression(f, b);
            const incomplet = p.total > 0 && p.remplis < p.total;
            return (
              <li key={b.clientSubmissionId} className={styles.ligne}>
                <div className={styles.ligneCorps}>
                  <div className={styles.ligneHaut}>
                    <span className={styles.ligneTitre}>
                      {f?.titre ?? b.formulaireCode ?? 'Fiche'}
                    </span>
                    {b.origine === 'local' ? (
                      <Badge size="sm" variant="warning">
                        <CloudOff size={11} /> Sur l’appareil
                      </Badge>
                    ) : (
                      <Badge size="sm" variant="neutral">Enregistré</Badge>
                    )}
                    {peutVoirTout ? (
                      <span className={styles.ligneAuteur}>
                        {b.createdById != null
                          ? String(b.createdById) === userId
                            ? 'Vous'
                            : (nomParAuteur.get(String(b.createdById)) ?? `Agent n°${b.createdById}`)
                          : 'Auteur inconnu'}
                      </span>
                    ) : null}
                  </div>
                  <span className={styles.ligneMeta}>
                    Modifié {b.majLe ? formatRelativeTime(b.majLe) : '—'}
                  </span>
                  <div className={styles.progression}>
                    <div className={styles.jauge}>
                      <div className={styles.jaugeRempli} style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className={styles.progressionTexte}>
                      {p.total > 0 ? `${p.remplis}/${p.total} requis` : 'Aucun champ requis'}
                    </span>
                  </div>
                </div>

                <div className={styles.ligneActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<RotateCcw size={14} />}
                    onClick={() =>
                      navigate(
                        `/formulaires/${b.formulaireCode}/saisir?reprendre=1&id=${encodeURIComponent(b.clientSubmissionId)}&section=${premiereSectionIncomplete(f, b)}`,
                      )
                    }
                  >
                    Reprendre
                  </Button>
                  {peutVoirTout ? (
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={<Send size={14} />}
                      onClick={() => void finaliserLigne(b)}
                      disabled={b.soumissionId === undefined || incomplet}
                      loading={finaliserMut.isPending && finaliserMut.variables === b.soumissionId}
                      title={
                        b.soumissionId === undefined
                          ? 'Ce brouillon n’a pas encore été synchronisé.'
                          : incomplet
                            ? 'Champs obligatoires manquants — ouvrez la fiche pour les compléter.'
                            : undefined
                      }
                    >
                      Finaliser
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    iconLeft={<Trash2 size={14} />}
                    onClick={() => void supprimer(b)}
                    aria-label="Supprimer le brouillon"
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {peutVoirTout && !isLoading && total > LIMITE_PAGE ? (
        <nav className={styles.pagination} aria-label="Pagination des brouillons">
          <span className={styles.paginationInfo}>
            Page {page} sur {totalPages} · {total} brouillon{total > 1 ? 's' : ''}
          </span>
          <div className={styles.paginationControles}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<ChevronLeft size={14} />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconRight={<ChevronRight size={14} />}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
