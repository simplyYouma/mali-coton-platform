import { Link } from 'react-router-dom';
import { FileText, Inbox, LayoutList, PencilRuler, PlayCircle } from 'lucide-react';
import { Badge, Button, EmptyState, NoteExplicative, Skeleton } from '@/components/common';
import { useFormulairesPublies } from '../hooks/useFormulairesNatifs';
import { useComptesBrouillons } from '../hooks/useBrouillonsFusionnes';
import { compterChamps, type FormulairePublie } from '../api/formulairesNatifs.types';
import { StatsBande } from '../components/StatsBande';
import styles from './ModelesFormulairePage.module.css';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { PERM } from '@/features/auth/lib/permissions';

/**
 * Catalogue des formulaires de collecte publiés.
 *
 * Point d'entrée de l'agent : il y choisit un modèle à remplir, ou reprend un
 * brouillon en cours. Le décompte de brouillons est calculé par code de
 * formulaire à partir de `GET /soumissions/brouillons`.
 */
/**
 * Ligne de présentation d'un modèle.
 *
 * Le champ `description` de l'API est un commentaire de gabarit (« Template
 * système natif FICHE_SITE version 2, aligné sur le XLSForm… ») : il expose
 * des identifiants techniques et double le badge de version. On lui préfère
 * une phrase dérivée du contenu réel, utile à l'agent.
 */
function resumeFormulaire(f: FormulairePublie): string {
  const nbSections = f.sections.length;
  const nbChamps = compterChamps(f);
  return `${nbSections} section${nbSections > 1 ? 's' : ''} · ${nbChamps} question${nbChamps > 1 ? 's' : ''} à renseigner`;
}

export function ModelesFormulairePage() {
  const { peutUneDe } = useAutorisations();
  /* Le constructeur modifie la structure : ce sont ces droits qui l'ouvrent. */
  const peutConstruire = peutUneDe([PERM.formulaireCreate, PERM.formulaireUpdate]);
  const { formulaires, isLoading, isError } = useFormulairesPublies();
  /* Serveur + appareil : une saisie commencée hors ligne compte comme
   * brouillon pour l'utilisateur, même si elle n'a pas encore été transmise. */
  const { total: totalBrouillons, compteParCode, peutVoirTout: voitTousLesBrouillons } = useComptesBrouillons();

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
        <div className={styles.heroActions}>
          <Link to="/formulaires/brouillons">
            <Button variant="primary" iconLeft={<Inbox size={15} />}>
              {voitTousLesBrouillons ? 'Tous les brouillons' : 'Mes brouillons'}
              {totalBrouillons > 0 ? ` (${totalBrouillons})` : ''}
            </Button>
          </Link>
        </div>
      </header>

      <NoteExplicative
        id="formulaires-catalogue"
        titre="Le point de départ de la collecte"
        resume={
          <>
            Chaque carte ci-dessous est une <strong>fiche de terrain</strong> publiée par
            l’administrateur. Vous en choisissez une, vous la remplissez sur place, puis vous
            l’envoyez. Une fiche commencée mais non envoyée se retrouve dans{' '}
            <strong>Mes brouillons</strong>, où vous pouvez la reprendre.
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
            const nbBrouillons = compteParCode.get(f.code) ?? 0;
            return (
              <article key={f.code} className={styles.carte}>
                <header className={styles.carteHead}>
                  <div className={styles.carteTitres}>
                    <h2 className={styles.carteTitre}>{f.titre}</h2>
                  </div>
                  <Badge size="sm" variant="neutral">v{f.version}</Badge>
                </header>

                <p className={styles.carteDescription}>{resumeFormulaire(f)}</p>

                <StatsBande
                  taille="compact"
                  stats={[
                    { label: 'Sections', valeur: f.sections.length },
                    { label: 'Champs', valeur: compterChamps(f) },
                    { label: 'Brouillons', valeur: nbBrouillons },
                  ]}
                />

                <footer className={styles.carteActions}>
                  <Link to={`/formulaires/${f.code}/saisir`} className={styles.actionPrincipale}>
                    <Button variant="primary" iconLeft={<PlayCircle size={15} />} fullWidth>
                      Remplir
                    </Button>
                  </Link>
                </footer>

                <nav className={styles.carteLiens}>
                  <Link to={`/formulaires/${f.code}`} className={styles.lienDiscret}>
                    <LayoutList size={13} aria-hidden="true" />
                    Voir la structure
                  </Link>
                  {peutConstruire ? (
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
