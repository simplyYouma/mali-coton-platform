import { useMemo, useState } from 'react';
import { Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  SkeletonTableau,
  Switch,
} from '@/components/common';
import { StatsBande } from '@/features/formulaires';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import { PERM } from '@/features/auth/lib/permissions';
import {
  useComptes,
  useCreerCompte,
  useModifierCompte,
  useRolesAdmin,
  useSupprimerCompte,
} from '../hooks/useComptes';
import { libellesRoles } from '../lib/roles';
import type { CompteAdmin, CompteInput } from '../api/comptes';
import styles from './ComptesPage.module.css';

type FiltreActif = 'tous' | 'actifs' | 'inactifs';

interface EtatFormulaire {
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  rolesIris: string[];
  plainPassword: string;
}

const FORMULAIRE_VIDE: EtatFormulaire = {
  nom: '',
  prenom: '',
  email: '',
  actif: true,
  rolesIris: [],
  plainPassword: '',
};

export function ComptesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { peut } = useAutorisations();
  const peutGerer = peut(PERM.utilisateurManage);

  const { data: comptes = [], isLoading } = useComptes();
  const { data: roles = [] } = useRolesAdmin();
  const creer = useCreerCompte();
  const modifier = useModifierCompte();
  const supprimer = useSupprimerCompte();

  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState<string>('tous');
  const [filtreActif, setFiltreActif] = useState<FiltreActif>('tous');
  const [edition, setEdition] = useState<CompteAdmin | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState<EtatFormulaire>(FORMULAIRE_VIDE);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return comptes.filter((c) => {
      if (q && ![c.nom, c.prenom, c.email].join(' ').toLowerCase().includes(q)) return false;
      if (filtreRole !== 'tous' && !c.rolesIris.includes(filtreRole)) return false;
      if (filtreActif === 'actifs' && !c.actif) return false;
      if (filtreActif === 'inactifs' && c.actif) return false;
      return true;
    });
  }, [comptes, recherche, filtreRole, filtreActif]);

  const ouvrirCreation = () => {
    setEdition(null);
    setForm(FORMULAIRE_VIDE);
    setOuvert(true);
  };

  const ouvrirEdition = (c: CompteAdmin) => {
    setEdition(c);
    setForm({
      nom: c.nom,
      prenom: c.prenom,
      email: c.email,
      actif: c.actif,
      rolesIris: c.rolesIris,
      /* Jamais renvoyé en lecture : on repart d'un champ vide, et on
       * n'enverra rien s'il le reste. */
      plainPassword: '',
    });
    setOuvert(true);
  };

  const enregistrer = async () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      toast.error('Nom, prénom et e-mail sont obligatoires.');
      return;
    }
    if (!edition && !form.plainPassword.trim()) {
      toast.error('Un mot de passe est requis à la création.');
      return;
    }

    const base: CompteInput = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      actif: form.actif,
      roles: form.rolesIris,
    };

    try {
      if (edition) {
        await modifier.mutateAsync({
          id: edition.id,
          // Mot de passe laissé vide = inchangé.
          patch: form.plainPassword.trim()
            ? { ...base, plainPassword: form.plainPassword.trim() }
            : base,
        });
        toast.success('Compte mis à jour.');
      } else {
        await creer.mutateAsync({ ...base, plainPassword: form.plainPassword.trim() });
        toast.success('Compte créé.');
      }
      setOuvert(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const basculerActif = async (c: CompteAdmin) => {
    try {
      await modifier.mutateAsync({ id: c.id, patch: { actif: !c.actif } });
      toast.success(c.actif ? 'Compte désactivé.' : 'Compte réactivé.');
    } catch {
      toast.error('Modification impossible.');
    }
  };

  const demanderSuppression = async (c: CompteAdmin) => {
    const ok = await confirm({
      title: `Supprimer le compte de ${c.nomComplet} ?`,
      message:
        'La suppression est définitive. Préférez la désactivation si le compte doit seulement perdre l’accès.',
      confirmLabel: 'Supprimer définitivement',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync(c.id);
      toast.success('Compte supprimé.');
    } catch {
      toast.error('Suppression impossible.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Administration</span>
          <h1 className={styles.heroTitle}>Utilisateurs</h1>
        </div>
        {peutGerer ? (
          <div className={styles.heroActions}>
            <Button variant="primary" iconLeft={<UserPlus size={15} />} onClick={ouvrirCreation}>
              Nouvel utilisateur
            </Button>
          </div>
        ) : null}
      </header>

      <StatsBande
        aria-label="Répartition des comptes"
        stats={[
          { label: 'Comptes', valeur: comptes.length },
          { label: 'Actifs', valeur: comptes.filter((c) => c.actif).length },
          { label: 'Rôles', valeur: roles.length },
        ]}
      />

      <div className={styles.filtres}>
        <label className={styles.recherche}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, prénom ou e-mail…"
            aria-label="Rechercher un utilisateur"
          />
        </label>
        <Select
          value={filtreRole}
          onChange={setFiltreRole}
          options={[
            { value: 'tous', label: 'Tous les rôles' },
            ...roles.map((r) => ({ value: r.iri, label: r.libelle })),
          ]}
          aria-label="Filtrer par rôle"
        />
        <Select<FiltreActif>
          value={filtreActif}
          onChange={setFiltreActif}
          options={[
            { value: 'tous', label: 'Tous les états' },
            { value: 'actifs', label: 'Actifs' },
            { value: 'inactifs', label: 'Désactivés' },
          ]}
          aria-label="Filtrer par état"
        />
      </div>

      {isLoading ? (
        <SkeletonTableau colonnes={4} lignes={6} hauteurLigne={58} />
      ) : filtres.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="Aucun utilisateur"
          description={
            comptes.length === 0
              ? 'Aucun compte n’est encore enregistré.'
              : 'Aucun compte ne correspond à ces filtres.'
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôles</th>
                <th>État</th>
                {peutGerer ? <th className={styles.thActions}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtres.map((c) => {
                const libelles = libellesRoles(c, roles);
                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.nom}>{c.nomComplet}</span>
                      <span className={styles.email}>{c.email}</span>
                    </td>
                    <td>
                      {libelles.length > 0 ? (
                        <span className={styles.badges}>
                          {/* Libellés lisibles — jamais les codes de rôle. */}
                          {libelles.map((l) => (
                            <Badge key={l} size="sm" variant="info">{l}</Badge>
                          ))}
                        </span>
                      ) : (
                        <span className={styles.muted}>Aucun rôle</span>
                      )}
                    </td>
                    <td>
                      <Badge size="sm" variant={c.actif ? 'success' : 'neutral'}>
                        {c.actif ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    {peutGerer ? (
                      <td className={styles.thActions}>
                        <div className={styles.actions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            iconLeft={<Pencil size={13} />}
                            onClick={() => ouvrirEdition(c)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void basculerActif(c)}
                          >
                            {c.actif ? 'Désactiver' : 'Réactiver'}
                          </Button>
                          <Button
                            variant="ghost-danger"
                            size="sm"
                            iconLeft={<Trash2 size={13} />}
                            onClick={() => void demanderSuppression(c)}
                            aria-label={`Supprimer ${c.nomComplet}`}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={ouvert}
        onClose={() => setOuvert(false)}
        title={edition ? `Modifier ${edition.nomComplet}` : 'Nouvel utilisateur'}
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOuvert(false)}>Annuler</Button>
            <Button
              variant="primary"
              onClick={() => void enregistrer()}
              loading={creer.isPending || modifier.isPending}
            >
              {edition ? 'Enregistrer' : 'Créer le compte'}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <div className={styles.formDuo}>
            <FormField label="Prénom" required>
              <Input
                value={form.prenom}
                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
              />
            </FormField>
            <FormField label="Nom" required>
              <Input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Adresse e-mail" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </FormField>

          <FormField
            label="Mot de passe"
            required={!edition}
            hint={edition ? 'Laissez vide pour conserver le mot de passe actuel.' : undefined}
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={form.plainPassword}
              onChange={(e) => setForm((f) => ({ ...f, plainPassword: e.target.value }))}
            />
          </FormField>

          <fieldset className={styles.rolesChoix}>
            <legend className={styles.legende}>Rôles</legend>
            {roles.map((r) => (
              <Checkbox
                key={r.iri}
                label={r.libelle}
                checked={form.rolesIris.includes(r.iri)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    /* Le backend attend des IRIs : l'utilisateur choisit un
                     * libellé, la conversion se fait ici. */
                    rolesIris: e.target.checked
                      ? [...f.rolesIris, r.iri]
                      : f.rolesIris.filter((i) => i !== r.iri),
                  }))
                }
              />
            ))}
          </fieldset>

          <Switch
            label="Compte actif"
            checked={form.actif}
            onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
          />
        </div>
      </Modal>
    </div>
  );
}
