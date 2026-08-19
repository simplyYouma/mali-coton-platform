import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, LayoutList, PencilRuler, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge, Button, EmptyState, NoteExplicative, Skeleton } from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useBrouillons, useFormulairesPublies } from '../hooks/useFormulairesNatifs';
import { compterChamps } from '../api/formulairesNatifs.types';
import styles from './ModelesFormulairePage.module.css';

/**
 * Catalogue des formulaires de collecte publiés.
 *
 * Point d'entrée de l'agent : il y choisit un modèle à remplir, ou reprend un
 * brouillon en cours. Le décompte de brouillons est calculé par code de
 * formulaire à partir de `GET /soumissions/brouillons`.
 */
export function ModelesFormulairePage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { formulaires, isLoading, isError } = useFormulairesPublies();
  const { data: brouillons } = useBrouillons();

  const brouillonsParCode = useMemo(() => {
    const map = new Map<string, number>();
    (brouillons ?? []).forEach((b) => {
      map.set(b.formulaireCode, (map.get(b.formulaireCode) ?? 0) + 1);
    });
    return map;
  }, [brouillons]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Collecte terrain</span>
          <h1 className={styles.heroTitle}>Modèles de formulaire</h1>
          <p className={styles.heroDescription}>
            Choisissez une fiche à remplir. Votre saisie est enregistrée au fur et à mesure,
            même sans réseau.
          </p>
        </div>
      </header>

      <NoteExplicative
        id="formulaires-catalogue"
        titre="Le point de départ de la collecte"
        resume={
          <>
            Chaque carte ci-dessous est une <strong>fiche de terrain</strong> publiée par
            l’administrateur. Vous en choisissez une, vous la remplissez sur place, puis vous
            l’envoyez. Une fiche commencée mais non envoyée reste un <em>brouillon</em> : vous la
            retrouvez ici et vous la reprenez où vous l’aviez laissée.
          </>
        }
        etapes={[
          {
            titre: 'Lire la carte',
            detail: (
              <>
                <strong>Sections</strong> et <strong>Champs</strong> disent la longueur de la fiche,
                <strong> Brouillons</strong> le nombre de saisies en cours pour ce modèle.
              </>
            ),
          },
          {
            titre: 'Remplir',
            detail: 'Ouvre une nouvelle fiche vierge et crée aussitôt un brouillon.',
          },
          {
            titre: 'Reprendre',
            detail: 'N’apparaît que si un brouillon existe : reprend la saisie en cours.',
          },
          {
            titre: 'Voir la structure',
            detail: 'Consulte la liste des questions sans rien remplir — utile pour préparer une visite.',
          },
        ]}
      />

      {isLoading ? (
        <div className={styles.grille}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={240} radius={14} />
          ))}
        </div>
      ) : isError || formulaires.length === 0 ? (
        <EmptyState
          icon={<FileText size={26} />}
          title="Aucun formulaire disponible"
          description="Les modèles publiés n'ont pas pu être chargés. Vérifiez votre connexion et réessayez."
        />
      ) : (
        <div className={styles.grille}>
          {formulaires.map((f) => {
            const nbBrouillons = brouillonsParCode.get(f.code) ?? 0;
            return (
              <article key={f.code} className={styles.carte}>
                <header className={styles.carteHead}>
                  <div className={styles.carteTitres}>
                    <h2 className={styles.carteTitre}>{f.titre}</h2>
                    <code className={styles.carteCode}>{f.code}</code>
                  </div>
                  <Badge size="sm" variant="neutral">v{f.version}</Badge>
                </header>

                <p className={styles.carteDescription}>{f.description}</p>

                <dl className={styles.carteStats}>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>Sections</dt>
                    <dd className={styles.statValeur}>{f.sections.length}</dd>
                  </div>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>Champs</dt>
                    <dd className={styles.statValeur}>{compterChamps(f)}</dd>
                  </div>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>Brouillons</dt>
                    <dd className={styles.statValeur}>{nbBrouillons}</dd>
                  </div>
                </dl>

                <footer className={styles.carteActions}>
                  <Link to={`/formulaires/${f.code}/saisir`} className={styles.actionPrincipale}>
                    <Button variant="primary" iconLeft={<PlayCircle size={15} />} fullWidth>
                      Remplir
                    </Button>
                  </Link>
                  {nbBrouillons > 0 ? (
                    <Link to={`/formulaires/${f.code}/saisir?reprendre=1`}>
                      <Button variant="secondary" iconLeft={<RotateCcw size={15} />}>
                        Reprendre
                      </Button>
                    </Link>
                  ) : null}
                </footer>

                <nav className={styles.carteLiens}>
                  <Link to={`/formulaires/${f.code}`} className={styles.lienDiscret}>
                    <LayoutList size={13} aria-hidden="true" />
                    Voir la structure
                  </Link>
                  {isAdmin ? (
                    <Link
                      to={`/admin/formulaires/${f.id}/constructeur`}
                      className={styles.lienDiscret}
                    >
                      <PencilRuler size={13} aria-hidden="true" />
                      Constructeur
                    </Link>
                  ) : null}
                </nav>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
