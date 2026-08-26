import type { ReactNode } from 'react';
import {
  Beaker,
  ClipboardList,
  Database,
  FileText,
  FormInput,
  LayoutDashboard,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Microscope,
  Pipette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { NavItem, NavSection } from '@/components/common/AppShell';
import { PERM } from '@/features/auth/lib/permissions';

/**
 * Déclaration unique des pages et de leurs droits d'accès.
 *
 * La garde de route et l'entrée de menu lisaient jusqu'ici deux descriptions
 * séparées, avec des critères qui avaient divergé : `/dashboard` s'affichait
 * sur `analytics.read` mais s'ouvrait sur un rôle, `/sites` figurait au menu
 * sans aucune garde de route. Une seule table évite que l'un des deux dérive.
 *
 * Aucun accès n'est déduit d'un nom de rôle : les codes sont incohérents en
 * base (`ROLE_ADMIN`, `ROLE_AGENT_COLLECTEUR`, `superviseur`) et un simple
 * renommage suffirait à ouvrir ou fermer des pages par accident. L'administrateur
 * n'est pas un cas particulier — le backend lui sert la liste complète.
 */

export type SectionNav = 'main' | 'labo' | 'tools' | 'admin';

export const TITRES_SECTION: Record<SectionNav, string> = {
  main: 'Menu principal',
  labo: 'Analyse & Laboratoire',
  tools: 'Outils & analyse',
  admin: 'Administration',
};

interface EntreeNav {
  label: string;
  icon: ReactNode;
  section: SectionNav;
}

export interface Page {
  /** Chemin exact de la route, clé unique de la table. */
  to: string;
  /** Détenir **une** de ces permissions suffit à ouvrir la page. */
  permissions: readonly string[];
  /** Présent = l'entrée figure au menu ; absent = page accessible mais non listée. */
  nav?: EntreeNav;
  /** Pourquoi la page reste hors du menu, quand c'est un choix et non une sous-page. */
  motifHorsMenu?: string;
}

export const PAGES = [
  {
    to: '/dashboard',
    permissions: [PERM.analyticsRead],
    nav: { label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, section: 'main' },
  },
  {
    to: '/sites',
    permissions: [PERM.siteRead],
    nav: { label: 'Sites', icon: <MapPin size={18} />, section: 'main' },
  },
  { to: '/sites/:id', permissions: [PERM.siteRead] },
  {
    to: '/collecte',
    permissions: [PERM.collecteRead],
    nav: { label: 'Collectes', icon: <ClipboardList size={18} />, section: 'main' },
  },
  { to: '/collecte/:id', permissions: [PERM.collecteRead] },
  {
    to: '/collecte/validation',
    permissions: [PERM.collecteValidate],
    motifHorsMenu: 'Validation : masquée temporairement de la nav (route conservée).',
  },
  {
    to: '/collecte/import',
    permissions: [PERM.collecteCreate],
    motifHorsMenu: 'Import : atteint depuis la liste des collectes.',
  },
  { to: '/collecte/:id/resultats-labo', permissions: [PERM.collecteValidate] },
  {
    to: '/labo/analyses',
    permissions: [PERM.collecteRead],
    nav: { label: "Résultats d'analyse", icon: <Microscope size={18} />, section: 'labo' },
  },
  {
    to: '/labo/prelevements',
    permissions: [PERM.collecteRead],
    nav: { label: 'Prélèvements', icon: <Pipette size={18} />, section: 'labo' },
  },
  {
    to: '/labo/echantillons',
    permissions: [PERM.collecteRead],
    nav: { label: 'Échantillons', icon: <Beaker size={18} />, section: 'labo' },
  },
  {
    to: '/formulaires',
    permissions: [PERM.formulaireRead],
    nav: { label: 'Formulaires', icon: <FormInput size={18} />, section: 'main' },
  },
  { to: '/formulaires/:code', permissions: [PERM.formulaireRead] },
  { to: '/formulaires/:code/saisir', permissions: [PERM.soumissionCreate] },
  {
    to: '/formulaires/brouillons',
    permissions: [PERM.soumissionRead],
    motifHorsMenu:
      'Mes brouillons : vue secondaire, atteinte depuis la page Modèles — pas une destination de premier niveau.',
  },
  {
    to: '/alertes',
    permissions: [PERM.alerteRead, PERM.alerteManage],
    motifHorsMenu: 'Alertes : masquée temporairement de la nav (route conservée).',
  },
  {
    to: '/recommandations',
    permissions: [PERM.alerteRead, PERM.alerteManage],
    nav: { label: 'Recommandations', icon: <Lightbulb size={18} />, section: 'main' },
  },
  {
    to: '/agents',
    permissions: [PERM.utilisateurManage],
    motifHorsMenu: 'Agents : masquée temporairement de la nav (route conservée).',
  },
  { to: '/agents/:id', permissions: [PERM.utilisateurManage] },
  {
    to: '/cartographie',
    permissions: [PERM.siteRead],
    nav: { label: 'Cartographie', icon: <MapIcon size={18} />, section: 'tools' },
  },
  {
    to: '/analytics',
    permissions: [PERM.analyticsRead],
    motifHorsMenu: 'Analytics : masquée temporairement de la nav (route conservée).',
  },
  {
    to: '/reporting',
    permissions: [PERM.rapportGenerate],
    nav: { label: 'Rapports', icon: <FileText size={18} />, section: 'tools' },
  },
  {
    to: '/admin/utilisateurs',
    permissions: [PERM.utilisateurManage],
    nav: { label: 'Utilisateurs', icon: <Users size={18} />, section: 'admin' },
  },
  {
    to: '/admin/roles',
    permissions: [PERM.utilisateurManage],
    nav: { label: 'Rôles & permissions', icon: <ShieldCheck size={18} />, section: 'admin' },
  },
  {
    to: '/admin/referentiels',
    permissions: [PERM.utilisateurManage],
    nav: { label: 'Référentiels', icon: <Database size={18} />, section: 'admin' },
  },
  {
    to: '/admin/audit',
    permissions: [PERM.utilisateurManage],
    motifHorsMenu: "Journal d'audit : masquée temporairement de la nav (route conservée).",
  },
  {
    /* Alias historique du catalogue, conservé pour les liens existants ; il
     * mène au constructeur, d'où les mêmes droits que celui-ci. */
    to: '/admin/formulaires',
    permissions: [PERM.formulaireCreate, PERM.formulaireUpdate],
    motifHorsMenu:
      'Modèles formulaires : masquée de la nav — elle servait le même catalogue que « Formulaires ».',
  },
  {
    to: '/admin/formulaires/:id/constructeur',
    permissions: [PERM.formulaireCreate, PERM.formulaireUpdate],
  },
] as const satisfies readonly Page[];

/** Chemins déclarés — un chemin non listé ne compile pas dans une garde. */
export type CheminPage = (typeof PAGES)[number]['to'];

const TOUTES: readonly Page[] = PAGES;
const PAR_CHEMIN = new Map<string, Page>(TOUTES.map((p) => [p.to, p]));

/** Permissions ouvrant une page ; lève si le chemin n'est pas déclaré. */
export function permissionsDe(to: CheminPage): readonly string[] {
  const page = PAR_CHEMIN.get(to);
  if (!page) throw new Error(`Page non déclarée dans navigation.tsx : ${to}`);
  return page.permissions;
}

type TestPermission = (codes: readonly string[]) => boolean;

/** Entrées de menu ouvertes à l'utilisateur, groupées par section. */
export function navigationPour(peutUneDe: TestPermission): NavSection[] {
  const groupes: Record<SectionNav, NavItem[]> = { main: [], labo: [], tools: [], admin: [] };

  for (const page of TOUTES) {
    if (!page.nav) continue;
    if (!peutUneDe(page.permissions)) continue;
    const { label, icon, section } = page.nav;
    groupes[section].push({ to: page.to, label, icon });
  }

  /* Une section dont toutes les entrées sont masquées ne doit pas afficher
   * son titre : un intitulé seul laisse croire à un contenu manquant. */
  return (['main', 'labo', 'tools', 'admin'] as const)
    .filter((cle) => groupes[cle].length > 0)
    .map((cle) => ({ title: TITRES_SECTION[cle], items: groupes[cle] }));
}

/**
 * Page d'arrivée : la première entrée de menu ouverte à l'utilisateur.
 *
 * Elle ne dépend plus du rôle — un compte laboratoire atterrissait sur
 * `/dashboard`, page absente de son propre menu. `null` signale qu'aucune page
 * n'est ouverte, cas traité à part pour ne pas boucler en redirection.
 */
export function premierePagePour(peutUneDe: TestPermission): string | null {
  for (const page of TOUTES) {
    if (!page.nav) continue;
    if (peutUneDe(page.permissions)) return page.to;
  }
  return null;
}
