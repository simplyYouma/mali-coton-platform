import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import {
  mockCercles,
  mockCommunes,
  mockRegions,
} from '@/mocks/fixtures/geography';
import type { SiteInput } from '../api/sites';
import type { Site, SiteLegalStatus, SiteType } from '../api/site.types';
import { useCreateSite, useUpdateSite } from '../hooks/useSites';
import styles from './SiteForm.module.css';

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  /** Site existant à éditer ; absent ⇒ création. */
  site?: Site | null;
}

const TYPE_OPTIONS: Array<{ value: SiteType; label: string }> = [
  { value: 'GALA', label: 'GALA — teinture chimique' },
  { value: 'INDIGO', label: 'INDIGO — teinture indigo naturelle' },
  { value: 'GALA_INDIGO', label: 'GALA + INDIGO' },
  { value: 'NATURELLE', label: 'Teinture naturelle (autre)' },
];

const LEGAL_OPTIONS: Array<{ value: SiteLegalStatus; label: string }> = [
  { value: 'formel', label: 'Formel — déclaré' },
  { value: 'informel', label: 'Informel — non déclaré' },
];

interface FormState {
  name: string;
  shortName: string;
  type: SiteType;
  legalStatus: SiteLegalStatus;
  workforce: string;
  createdYear: string;
  /* Geo cascade — IDs des entites referentiel. */
  regionId: string;
  cercleId: string;
  communeId: string;
  quartier: string;
  lat: string;
  lng: string;
  description: string;
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  type: 'GALA',
  legalStatus: 'informel',
  workforce: '',
  createdYear: String(new Date().getFullYear()),
  regionId: '',
  cercleId: '',
  communeId: '',
  quartier: '',
  lat: '',
  lng: '',
  description: '',
};

/* Resout commune/cercle/region a partir du nom commune (best-effort)
 * pour pre-remplir le form en mode edition. Fallback : region=Bamako. */
function geoFromLocation(loc: Site['location']): {
  regionId: string;
  cercleId: string;
  communeId: string;
} {
  const commune = mockCommunes.find(
    (c) => c.nom.toLowerCase() === loc.commune.toLowerCase(),
  );
  if (commune) {
    const cercle = mockCercles.find((c) => c.id === commune.cercleId);
    return {
      regionId: cercle?.regionId ?? mockRegions[0]!.id,
      cercleId: commune.cercleId,
      communeId: commune.id,
    };
  }
  /* Fallback : essaie de matcher par nom de cercle (ville) */
  const cercle = mockCercles.find((c) =>
    c.nom.toLowerCase().includes(loc.city.toLowerCase()),
  );
  return {
    regionId: cercle?.regionId ?? mockRegions[0]!.id,
    cercleId: cercle?.id ?? '',
    communeId: '',
  };
}

function fromSite(site: Site): FormState {
  const geo = geoFromLocation(site.location);
  return {
    name: site.name,
    shortName: site.shortName,
    type: site.type,
    legalStatus: site.legalStatus,
    workforce: String(site.workforce),
    createdYear: String(site.createdYear),
    regionId: geo.regionId,
    cercleId: geo.cercleId,
    communeId: geo.communeId,
    quartier: site.location.quartier ?? site.location.address ?? '',
    lat: String(site.coordinates.lat),
    lng: String(site.coordinates.lng),
    description: site.description ?? '',
  };
}

function toInput(f: FormState): SiteInput {
  const commune = mockCommunes.find((c) => c.id === f.communeId);
  const cercle = mockCercles.find((c) => c.id === f.cercleId);
  return {
    name: f.name.trim(),
    shortName: f.shortName.trim(),
    type: f.type,
    legalStatus: f.legalStatus,
    workforce: Number(f.workforce) || 0,
    createdYear: Number(f.createdYear) || new Date().getFullYear(),
    isReference: false,
    description: f.description.trim() || undefined,
    location: {
      commune: commune?.nom ?? '',
      city: cercle?.nom.replace(/^Cercle de /i, '') ?? '',
      quartier: f.quartier.trim() || undefined,
      address: f.quartier.trim() || undefined,
    },
    coordinates: {
      lat: Number(f.lat),
      lng: Number(f.lng),
    },
  };
}

export function SiteForm({ open, onClose, site }: SiteFormProps) {
  const toast = useToast();
  const createMut = useCreateSite();
  const updateMut = useUpdateSite();
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) setForm(site ? fromSite(site) : EMPTY);
  }, [open, site]);

  const isEdit = !!site;
  const isPending = createMut.isPending || updateMut.isPending;

  /* Listes filtrees pour la cascade region/cercle/commune */
  const cercleOptions = useMemo(
    () =>
      mockCercles
        .filter((c) => !form.regionId || c.regionId === form.regionId)
        .map((c) => ({ value: c.id, label: c.nom })),
    [form.regionId],
  );
  const communeOptions = useMemo(
    () =>
      mockCommunes
        .filter((c) => !form.cercleId || c.cercleId === form.cercleId)
        .map((c) => ({ value: c.id, label: c.nom })),
    [form.cercleId],
  );

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      toast.error('Nom complet et code court obligatoires.');
      return;
    }
    if (!form.regionId || !form.cercleId || !form.communeId) {
      toast.error('Région, cercle et commune obligatoires.');
      return;
    }
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Coordonnées GPS invalides.');
      return;
    }

    const payload = toInput(form);
    try {
      if (isEdit && site) {
        await updateMut.mutateAsync({ id: site.id, patch: payload });
        toast.success(`${payload.shortName} mis à jour.`);
      } else {
        await createMut.mutateAsync(payload);
        toast.success(`${payload.shortName} créé.`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'opération.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier ${site!.shortName}` : 'Nouveau site de teinturerie'}
      description="Renseignez les informations administratives, géographiques et opérationnelles du site."
      width={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="success" onClick={handleSubmit} loading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer le site'}
          </Button>
        </>
      }
    >
      <div className={styles.grid}>
        <FormField label="Nom complet" required className={styles.full}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex : ATPEK — Centre associatif teinture & protection environnementale"
          />
        </FormField>

        <FormField label="Code court" hint="Identifiant affiché dans l'app." required>
          <Input
            value={form.shortName}
            onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
            placeholder="Ex : ATPEK"
          />
        </FormField>

        <FormField label="Type de teinture" required>
          <Select<SiteType>
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(type) => setForm((f) => ({ ...f, type }))}
          />
        </FormField>

        <FormField label="Statut légal" required>
          <Select<SiteLegalStatus>
            options={LEGAL_OPTIONS}
            value={form.legalStatus}
            onChange={(legalStatus) => setForm((f) => ({ ...f, legalStatus }))}
          />
        </FormField>

        <FormField label="Année de création" hint="Année de mise en service.">
          <Input
            type="number"
            value={form.createdYear}
            onChange={(e) => setForm((f) => ({ ...f, createdYear: e.target.value }))}
            placeholder="2008"
          />
        </FormField>

        <FormField label="Effectif" hint="Nombre de personnes travaillant sur site.">
          <Input
            type="number"
            value={form.workforce}
            onChange={(e) => setForm((f) => ({ ...f, workforce: e.target.value }))}
            placeholder="Ex : 280"
          />
        </FormField>

        <FormField label="Région" required>
          <Select<string>
            options={mockRegions.map((r) => ({ value: r.id, label: r.nom }))}
            value={form.regionId}
            placeholder="Sélectionner une région…"
            onChange={(regionId) =>
              setForm((f) => ({
                ...f,
                regionId,
                /* reset niveau enfant si la region change */
                cercleId: '',
                communeId: '',
              }))
            }
          />
        </FormField>

        <FormField
          label="Cercle / Ville"
          required
          hint={
            !form.regionId ? 'Sélectionnez d\'abord une région.' : undefined
          }
        >
          <Select<string>
            options={cercleOptions}
            value={form.cercleId}
            placeholder="Sélectionner un cercle…"
            disabled={!form.regionId}
            onChange={(cercleId) =>
              setForm((f) => ({ ...f, cercleId, communeId: '' }))
            }
          />
        </FormField>

        <FormField
          label="Commune"
          required
          hint={
            !form.cercleId ? 'Sélectionnez d\'abord un cercle.' : undefined
          }
        >
          <Select<string>
            options={communeOptions}
            value={form.communeId}
            placeholder="Sélectionner une commune…"
            disabled={!form.cercleId}
            onChange={(communeId) =>
              setForm((f) => ({ ...f, communeId }))
            }
          />
        </FormField>

        <FormField
          label="Quartier"
          hint="Repère précis (saisie libre)."
        >
          <Input
            value={form.quartier}
            onChange={(e) => setForm((f) => ({ ...f, quartier: e.target.value }))}
            placeholder="Ex : Kalaban-Coura, près du marché"
          />
        </FormField>

        <FormField label="Latitude" hint="Format décimal (ex. 12.5797)" required>
          <Input
            type="number"
            inputMode="decimal"
            step="0.0001"
            value={form.lat}
            onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
            placeholder="12.5797"
          />
        </FormField>

        <FormField label="Longitude" hint="Format décimal (ex. -7.9879)" required>
          <Input
            type="number"
            inputMode="decimal"
            step="0.0001"
            value={form.lng}
            onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
            placeholder="-7.9879"
          />
        </FormField>

        <FormField
          label="Description"
          hint="Spécificités du site (techniques, externalités observées, contraintes)."
          className={styles.full}
        >
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ex : pas de système de traitement des eaux usées installé, fortes externalités documentées."
          />
        </FormField>
      </div>
    </Modal>
  );
}
