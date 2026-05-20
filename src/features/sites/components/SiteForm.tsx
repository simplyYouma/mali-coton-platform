import { useEffect, useState } from 'react';
import {
  Button,
  FormField,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
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
  commune: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  description: string;
  isReference: boolean;
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  type: 'GALA',
  legalStatus: 'informel',
  workforce: '',
  createdYear: String(new Date().getFullYear()),
  commune: '',
  city: 'Bamako',
  address: '',
  lat: '',
  lng: '',
  description: '',
  isReference: false,
};

function fromSite(site: Site): FormState {
  return {
    name: site.name,
    shortName: site.shortName,
    type: site.type,
    legalStatus: site.legalStatus,
    workforce: String(site.workforce),
    createdYear: String(site.createdYear),
    commune: site.location.commune,
    city: site.location.city,
    address: site.location.address ?? '',
    lat: String(site.coordinates.lat),
    lng: String(site.coordinates.lng),
    description: site.description ?? '',
    isReference: site.isReference,
  };
}

function toInput(f: FormState): SiteInput {
  return {
    name: f.name.trim(),
    shortName: f.shortName.trim(),
    type: f.type,
    legalStatus: f.legalStatus,
    workforce: Number(f.workforce) || 0,
    createdYear: Number(f.createdYear) || new Date().getFullYear(),
    isReference: f.isReference,
    description: f.description.trim() || undefined,
    location: {
      commune: f.commune.trim(),
      city: f.city.trim(),
      address: f.address.trim() || undefined,
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

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      toast.error('Nom complet et code court obligatoires.');
      return;
    }
    if (!form.commune.trim() || !form.city.trim()) {
      toast.error('Commune et ville obligatoires.');
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

        <FormField label="Site de référence" hint="Marquera le site avec une étoile dans l'app.">
          <Switch
            checked={form.isReference}
            onChange={(e) => setForm((f) => ({ ...f, isReference: e.target.checked }))}
            label={form.isReference ? 'Oui — référence' : 'Non'}
          />
        </FormField>

        <FormField label="Commune" required>
          <Input
            value={form.commune}
            onChange={(e) => setForm((f) => ({ ...f, commune: e.target.value }))}
            placeholder="Ex : Commune V"
          />
        </FormField>

        <FormField label="Ville" required>
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Ex : Bamako"
          />
        </FormField>

        <FormField label="Adresse / quartier" className={styles.full}>
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
