import { useMemo, useState } from 'react';
import { Info, Lock, Pencil, ShieldPlus, Trash2, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  SkeletonListe,
  Textarea,
} from '@/components/common';
import { StatsBande } from '@/features/formulaires';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAutorisations } from '@/app/providers/AuthzProvider';
import {
  DOMAINES,
  LIBELLE_DOMAINE,
  PERM,
  domaineDe,
  estObsolete,
  type Domaine,
} from '@/features/auth/lib/permissions';
import {
  useComptes,
  useCreerRole,
  useModifierRole,
  usePermissionsAdmin,
  useRolesAdmin,
  useSupprimerRole,
} from '../hooks/useComptes';
import { compterPorteurs, estRolePrivilegie } from '../lib/roles';
import type { PermissionAdmin, RoleAdmin } from '../api/comptes';
import styles from './RolesPermissionsPage.module.css';

interface EtatFormulaire {
  code: string;
  libelle: string;
  description: string;
  permissionsIris: string[];
}

const FORMULAIRE_VIDE: EtatFormulaire = {
  code: '',
  libelle: '',
  description: '',
  permissionsIris: [],
};

export function RolesPermissionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { peut } = useAutorisations();
  const peutGerer = peut(PERM.utilisateurManage);

  const { data: roles = [], isLoading } = useRolesAdmin();
  const { data: permissions = [] } = usePermissionsAdmin();
  const { data: comptes = [] } = useComptes();
  const creer = useCreerRole();
  const modifier = useModifierRole();
  const supprimer = useSupprimerRole();

  const [edition, setEdition] = useState<RoleAdmin | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState<EtatFormulaire>(FORMULAIRE_VIDE);

  /* Les deux permissions héritées sont écartées de l'éditeur : sans domaine ni
   * usage, les proposer inviterait à construire des rôles dessus. */
  const parDomaine = useMemo(() => {
    const map = new Map<Domaine, PermissionAdmin[]>();
    DOMAINES.forEach((d) => map.set(d, []));
    permissions
      .filter((p) => !estObsolete(p.code))
      .forEach((p) => {
        const d = domaineDe(p.code);
        if (d) map.get(d)!.push(p);
      });
    return map;
  }, [permissions]);

  const ouvrirCreation = () => {
    setEdition(null);
    setForm(FORMULAIRE_VIDE);
    setOuvert(true);
  };

  const ouvrirEdition = (r: RoleAdmin) => {
    setEdition(r);
    setForm({
      code: r.code,
      libelle: r.libelle,
      description: r.description,
      permissionsIris: r.permissionsIris,
    });
    setOuvert(true);
  };

  const basculerPermission = (iri: string, coche: boolean) =>
    setForm((f) => ({
      ...f,
      permissionsIris: coche
        ? [...f.permissionsIris, iri]
        : f.permissionsIris.filter((i) => i !== iri),
    }));

  const basculerDomaine = (domaine: Domaine, coche: boolean) => {
    const iris = (parDomaine.get(domaine) ?? []).map((p) => p.iri);
    setForm((f) => ({
      ...f,
      permissionsIris: coche
        ? [...new Set([...f.permissionsIris, ...iris])]
        : f.permissionsIris.filter((i) => !iris.includes(i)),
    }));
  };

  const enregistrer = async () => {
    if (!form.libelle.trim() || !form.code.trim()) {
      toast.error('Code et libellé sont obligatoires.');
      return;
    }
    const corps = {
      code: form.code.trim(),
      libelle: form.libelle.trim(),
      description: form.description.trim(),
      permissions: form.permissionsIris,
    };
    try {
      if (edition) {
        await modifier.mutateAsync({ id: edition.id, patch: corps });
        toast.success('Rôle mis à jour.');
      } else {
        await creer.mutateAsync(corps);
        toast.success('Rôle créé.');
      }
      setOuvert(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const demanderSuppression = async (r: RoleAdmin, porteurs: number) => {
    /* Un rôle encore attribué ferait échouer l'API : on l'explique au lieu de
     * laisser survenir une erreur serveur opaque. */
    if (porteurs > 0) {
      toast.error(
        `« ${r.libelle} » est encore attribué à ${porteurs} compte${porteurs > 1 ? 's' : ''}. Retirez-le d’abord.`,
      );
      return;
    }
    const ok = await confirm({
      title: `Supprimer le rôle « ${r.libelle} » ?`,
      message: 'Cette suppression est définitive.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await supprimer.mutateAsync(r.id);
      toast.success('Rôle supprimé.');
    } catch {
      toast.error('Suppression impossible.');
    }
  };

  const editionPrivilegiee = edition ? estRolePrivilegie(edition) : false;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Administration</span>
          <h1 className={styles.heroTitle}>Rôles &amp; permissions</h1>
        </div>
        {peutGerer ? (
          <div className={styles.heroActions}>
            <Button variant="primary" iconLeft={<ShieldPlus size={15} />} onClick={ouvrirCreation}>
              Nouveau rôle
            </Button>
          </div>
        ) : null}
      </header>

      <StatsBande
        aria-label="Répartition des accès"
        stats={[
          { label: 'Rôles', valeur: roles.length },
          { label: 'Permissions', valeur: permissions.filter((p) => !estObsolete(p.code)).length },
          { label: 'Comptes', valeur: comptes.length },
        ]}
      />

      {isLoading ? (
        <SkeletonListe lignes={4} hauteurLigne={96} />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="Aucun rôle défini"
          description="Créez un rôle pour regrouper un ensemble de permissions."
        />
      ) : (
        <ul className={styles.liste}>
          {roles.map((r) => {
            const porteurs = compterPorteurs(r, comptes);
            const privilegie = estRolePrivilegie(r);
            return (
              <li key={r.id} className={styles.carte}>
                <div className={styles.carteCorps}>
                  <div className={styles.carteHaut}>
                    <span className={styles.carteTitre}>{r.libelle}</span>
                    {privilegie ? (
                      <Badge size="sm" variant="info">
                        <Lock size={11} /> Accès complet
                      </Badge>
                    ) : null}
                  </div>
                  {r.description ? (
                    <p className={styles.carteDescription}>{r.description}</p>
                  ) : null}
                  <div className={styles.carteMeta}>
                    <span>
                      {privilegie
                        ? /* `permissions: []` alors que le rôle a tous les droits :
                           * annoncer « 0 permission » serait faux. */
                          'Toutes les permissions'
                        : `${r.permissionsIris.length} permission${r.permissionsIris.length > 1 ? 's' : ''}`}
                    </span>
                    <span className={styles.point} aria-hidden="true" />
                    <span>
                      {porteurs} compte{porteurs > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {peutGerer ? (
                  <div className={styles.carteActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft={<Pencil size={13} />}
                      onClick={() => ouvrirEdition(r)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      iconLeft={<Trash2 size={13} />}
                      onClick={() => void demanderSuppression(r, porteurs)}
                      aria-label={`Supprimer ${r.libelle}`}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={ouvert}
        onClose={() => setOuvert(false)}
        title={edition ? `Modifier « ${edition.libelle} »` : 'Nouveau rôle'}
        width={720}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOuvert(false)}>Annuler</Button>
            <Button
              variant="primary"
              onClick={() => void enregistrer()}
              loading={creer.isPending || modifier.isPending}
            >
              {edition ? 'Enregistrer' : 'Créer le rôle'}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <div className={styles.formDuo}>
            <FormField label="Libellé" required hint="Nom lisible, affiché dans l’interface.">
              <Input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Agent collecteur"
              />
            </FormField>
            <FormField label="Code" required hint="Identifiant technique du rôle.">
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="ROLE_AGENT_COLLECTEUR"
                className={styles.mono}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>

          {editionPrivilegiee ? (
            <p className={styles.avertissement}>
              <Info size={14} aria-hidden="true" />
              Les droits de ce rôle sont accordés directement par le serveur et ne sont pas pilotés
              par la liste ci-dessous : les modifier ici resterait sans effet.
            </p>
          ) : (
            <div className={styles.domaines}>
              {DOMAINES.map((d) => {
                const liste = parDomaine.get(d) ?? [];
                if (liste.length === 0) return null;
                const cochees = liste.filter((p) => form.permissionsIris.includes(p.iri)).length;
                const toutes = cochees === liste.length;
                return (
                  <fieldset key={d} className={styles.domaine}>
                    <legend className={styles.domaineTete}>
                      <Checkbox
                        label={LIBELLE_DOMAINE[d]}
                        checked={toutes}
                        // Partiellement cochée : ni vide, ni pleine.
                        ref={(el) => {
                          if (el) el.indeterminate = cochees > 0 && !toutes;
                        }}
                        onChange={(e) => basculerDomaine(d, e.target.checked)}
                      />
                      <span className={styles.compteur}>
                        {cochees}/{liste.length}
                      </span>
                    </legend>
                    <div className={styles.permissions}>
                      {liste.map((p) => (
                        <Checkbox
                          key={p.iri}
                          /* Libellé métier, jamais le code. */
                          label={p.libelle}
                          checked={form.permissionsIris.includes(p.iri)}
                          onChange={(e) => basculerPermission(p.iri, e.target.checked)}
                        />
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
