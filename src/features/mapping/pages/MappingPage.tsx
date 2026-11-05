import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Printer,
  Satellite,
  ShieldCheck,
  Target,
  ZoomIn,
} from 'lucide-react';
import { Badge, Skeleton, Spinner } from '@/components/common';
import { useSites } from '@/features/sites/hooks/useSites';
import { useConformiteGlobale, useConformiteSite } from '@/features/conformite/hooks/useConformite';
import type { StatutConformite } from '@/features/conformite/api/conformite';
import type { Site } from '@/features/sites/api/site.types';
import styles from './MappingPage.module.css';

/**
 * Cartographie des sites pilotes — vue géospatiale opérationnelle.
 *
 * La conformité affichée (couleur des marqueurs, filtre, légende) vient de
 * `useConformiteGlobale` — le même calcul serveur (résultats labo réels) que
 * le tableau de bord, pas du champ `Site.conformity` qui n'est pas alimenté
 * en live. `useCollections`/`useAlerts` alimentent uniquement les stats et
 * l'indicateur d'alerte affichés dans la popup de chaque site.
 *
 * Le fond de plan est OpenStreetMap. L'ajout de couches OGC (WMS/WFS)
 * publiées par un serveur GeoServer dédié reste une évolution backend.
 */

type ConformiteFilter = 'all' | StatutConformite;

const CONFORMITE_OPTIONS: Array<{ value: ConformiteFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'CRITIQUE', label: 'Critiques' },
  { value: 'A_SURVEILLER', label: 'À surveiller' },
  { value: 'CONFORME', label: 'Conformes' },
];

/** Couleurs alignées sur src/styles/tokens.css (--color-success/-warning/-danger)
 * — les mêmes que le tableau de bord (StatutPill, légende du donut). */
const STATUT_COLOR: Record<StatutConformite, string> = {
  CONFORME: '#157f4a',
  A_SURVEILLER: '#a85b00',
  CRITIQUE: '#b21f1f',
  NON_EVALUE: '#6b7280',
};
const STATUT_LABEL: Record<StatutConformite, string> = {
  CONFORME: 'Conforme',
  A_SURVEILLER: 'À surveiller',
  CRITIQUE: 'Critique',
  NON_EVALUE: 'Non évalué',
};

function buildMarkerIcon(color: string, isReference: boolean): L.DivIcon {
  const ring = isReference ? '3px' : '2px';
  return L.divIcon({
    className: 'mc-marker',
    // Pas de transform CSS ici — iconAnchor [14,34] positionne déjà la pointe
    // exactement sur la coordonnée. Un transform interne créerait un double décalage.
    html: `
      <div style="position:relative;width:28px;height:34px;">
        <div style="position:absolute;inset:0 0 6px 0;border-radius:50%;background:${color};border:${ring} solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.22);"></div>
        <div style="position:absolute;left:50%;bottom:0;width:10px;height:10px;background:${color};transform:translateX(-50%) rotate(45deg);box-shadow:0 4px 10px rgba(0,0,0,0.14);"></div>
      </div>
    `,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34],
  });
}

const DEFAULT_CENTER: [number, number] = [13.2, -7.5];

/** Ordre d'affichage par criticité : CRITIQUE > A_SURVEILLER > CONFORME > NON_EVALUE. */
const ORDRE_CRITICITE: Record<StatutConformite, number> = {
  CRITIQUE: 0,
  A_SURVEILLER: 1,
  CONFORME: 2,
  NON_EVALUE: 3,
};

const STATUTS_LEGENDE: StatutConformite[] = ['CRITIQUE', 'A_SURVEILLER', 'CONFORME', 'NON_EVALUE'];

/** Délai de secours : on imprime même si une tuile ne répond pas. */
const DELAI_MAX_TUILES_MS = 3000;

/**
 * Attend la fin du chargement des tuiles visibles (événement `load` de chaque
 * TileLayer encore en chargement), ou le délai de secours.
 */
function attendreTuiles(map: L.Map, delaiMax = DELAI_MAX_TUILES_MS): Promise<void> {
  const enCours: L.TileLayer[] = [];
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer && layer.isLoading()) enCours.push(layer);
  });
  if (enCours.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let restantes = enCours.length;
    const terminer = () => {
      clearTimeout(timer);
      enCours.forEach((layer) => layer.off('load', surChargement));
      resolve();
    };
    const surChargement = () => {
      restantes -= 1;
      if (restantes === 0) terminer();
    };
    const timer = setTimeout(terminer, delaiMax);
    enCours.forEach((layer) => layer.on('load', surChargement));
  });
}

export function MappingPage() {
  const { data: sitesPage, isLoading } = useSites();
  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);


  const { data: conformiteGlobale } = useConformiteGlobale();

  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [conformiteFilter, setConformiteFilter] = useState<ConformiteFilter>('all');
  /* Panel filtres : peut etre replie pour donner toute la place a la
   * carte. Etat persiste en memoire de session uniquement. */
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mapMode, setMapMode] = useState<'plan' | 'satellite'>('plan');
  /* Cible courante du fly-to — declenche par le clic sur un site dans
   * le panel lateral. Le composant MapFocus se charge de centrer. */
  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null);
  const [openPopupSiteId, setOpenPopupSiteId] = useState<string | null>(null);
  /* Impression : instance Leaflet exposee par la ref du MapContainer. */
  const pageRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [printedAt, setPrintedAt] = useState(() => new Date());

  /** Conformité réelle du site (résultats labo) — même source que le tableau de bord. */
  const statutBySiteId = useMemo(() => {
    const map = new Map<string, StatutConformite>();
    (conformiteGlobale?.sites ?? []).forEach((s) => map.set(String(s.id), s.statut));
    return map;
  }, [conformiteGlobale]);
  const conformityFor = (siteId: string): StatutConformite =>
    statutBySiteId.get(siteId) ?? 'NON_EVALUE';

  /** Zones (communes) disponibles, pour le filtre. */
  const zones = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      if (s.location.commune) set.add(s.location.commune);
    });
    return Array.from(set).sort();
  }, [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (zoneFilter !== 'all' && s.location.commune !== zoneFilter) return false;
      if (conformiteFilter !== 'all' && conformityFor(s.id) !== conformiteFilter) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, zoneFilter, conformiteFilter, statutBySiteId]);

  const sitesParCriticite = useMemo(
    () =>
      [...filteredSites].sort(
        (a, b) => ORDRE_CRITICITE[conformityFor(a.id)] - ORDRE_CRITICITE[conformityFor(b.id)],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredSites, statutBySiteId],
  );

  /* Emprise des sites filtres — lue depuis les ecouteurs beforeprint, d'ou la ref. */
  const filteredBounds = useMemo(
    () =>
      filteredSites.length > 0
        ? L.latLngBounds(filteredSites.map((s) => [s.coordinates.lat, s.coordinates.lng] as L.LatLngTuple))
        : null,
    [filteredSites],
  );
  const boundsRef = useRef(filteredBounds);
  boundsRef.current = filteredBounds;

  /* Vue ecran a restaurer apres l'impression. */
  const vueEcranRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);

  /**
   * Passe la carte au format d'impression : `data-print-layout` donne au
   * conteneur les dimensions de la page A4 (cf. CSS) *avant* invalidateSize,
   * pour que Leaflet charge les tuiles de toute la zone imprimee — sinon il
   * garde la taille ecran et laisse des bandes grises. Idempotent : le bouton
   * l'appelle, puis window.print() redeclenche beforeprint.
   */
  const entrerModeImpression = useCallback(() => {
    const page = pageRef.current;
    if (!map || !page) return;
    if (!vueEcranRef.current) {
      vueEcranRef.current = { center: map.getCenter(), zoom: map.getZoom() };
    }
    page.setAttribute('data-print-layout', 'true');
    map.closePopup();
    map.invalidateSize({ pan: false });
    const bounds = boundsRef.current;
    /* Marge haute plus large : l'icone du marqueur (34 px) depasse au-dessus
     * de sa coordonnee. */
    if (bounds) {
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 40 + 34],
        paddingBottomRight: [40, 40],
        maxZoom: 14,
        animate: false,
      });
    }
  }, [map]);

  const sortirModeImpression = useCallback(() => {
    const page = pageRef.current;
    if (!map || !page) return;
    page.removeAttribute('data-print-layout');
    map.invalidateSize({ pan: false });
    const vue = vueEcranRef.current;
    vueEcranRef.current = null;
    if (vue) map.setView(vue.center, vue.zoom, { animate: false });
  }, [map]);

  /* Ctrl+P / menu du navigateur : meme preparation que le bouton (sans
   * l'attente des tuiles, le navigateur n'attend pas). */
  useEffect(() => {
    const avant = () => {
      flushSync(() => setPrintedAt(new Date()));
      entrerModeImpression();
    };
    const apres = () => {
      sortirModeImpression();
      setPreparingPrint(false);
    };
    window.addEventListener('beforeprint', avant);
    window.addEventListener('afterprint', apres);
    return () => {
      window.removeEventListener('beforeprint', avant);
      window.removeEventListener('afterprint', apres);
    };
  }, [entrerModeImpression, sortirModeImpression]);

  const imprimer = async () => {
    if (!map || preparingPrint) return;
    flushSync(() => {
      setPreparingPrint(true);
      setPrintedAt(new Date());
    });
    entrerModeImpression();
    await attendreTuiles(map);
    window.print();
  };

  const zoneLabel = zoneFilter === 'all' ? 'Toutes les zones' : zoneFilter;
  const conformiteLabel =
    CONFORMITE_OPTIONS.find((o) => o.value === conformiteFilter)?.label ?? 'Toutes';
  const printedAtLabel = printedAt.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const center = useMemo<[number, number]>(() => {
    if (filteredSites.length === 0) return DEFAULT_CENTER;
    const lat = filteredSites.reduce((s, x) => s + x.coordinates.lat, 0) / filteredSites.length;
    const lng = filteredSites.reduce((s, x) => s + x.coordinates.lng, 0) / filteredSites.length;
    return [lat, lng];
  }, [filteredSites]);

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Vue géospatiale</span>
          <h1 className={styles.heroTitle}>Cartographie</h1>
          <p className={styles.heroDescription}>
            Géolocalisation des sites et heatmaps de conformité.
          </p>
        </div>
      </header>

      {/* En-tete visible uniquement a l'impression */}
      <section className={styles.printHeader}>
        <div className={styles.printTitleRow}>
          <h2 className={styles.printTitle}>Cartographie des sites</h2>
          <span className={styles.printDate}>Imprimé le {printedAtLabel}</span>
        </div>
        <div className={styles.printMetaRow}>
          <span>
            <strong>Zone :</strong> {zoneLabel}
          </span>
          <span>
            <strong>Conformité :</strong> {conformiteLabel}
          </span>
          <span>
            <strong>{filteredSites.length}</strong> site{filteredSites.length > 1 ? 's' : ''} affiché
            {filteredSites.length > 1 ? 's' : ''}
          </span>
          <ul className={styles.printLegend}>
            {STATUTS_LEGENDE.map((statut) => (
              <li key={statut}>
                <span className={styles.legendDot} style={{ background: STATUT_COLOR[statut] }} />
                {STATUT_LABEL[statut]}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div
        className={styles.layout}
        data-panel-collapsed={panelCollapsed ? 'true' : undefined}
      >
        <button
          type="button"
          className={styles.panelToggle}
          onClick={() => setPanelCollapsed((v) => !v)}
          aria-label={
            panelCollapsed ? 'Afficher les filtres' : 'Masquer les filtres'
          }
          title={panelCollapsed ? 'Afficher les filtres' : 'Masquer les filtres'}
        >
          {panelCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        {!panelCollapsed ? (
        <aside className={styles.sidePanel} aria-label="Filtres et couches">
          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <MapPin size={14} aria-hidden="true" />
              <span>Filtre par zone</span>
            </header>
            <div className={styles.chips}>
              <button
                type="button"
                onClick={() => setZoneFilter('all')}
                className={`${styles.chip} ${zoneFilter === 'all' ? styles.chipActive : ''}`}
                aria-pressed={zoneFilter === 'all'}
              >
                Toutes
              </button>
              {zones.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoneFilter(z)}
                  className={`${styles.chip} ${zoneFilter === z ? styles.chipActive : ''}`}
                  aria-pressed={zoneFilter === z}
                >
                  {z}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Filtre par conformité</span>
            </header>
            <div className={styles.chips}>
              {CONFORMITE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConformiteFilter(opt.value)}
                  className={`${styles.chip} ${conformiteFilter === opt.value ? styles.chipActive : ''}`}
                  aria-pressed={conformiteFilter === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sites visibles — click pour zoomer */}
          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <Target size={14} aria-hidden="true" />
              <span>Sites surveillés</span>
            </header>
            <div className={styles.sitesList}>
              {sitesParCriticite.map((s) => {
                const lvl = conformityFor(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={styles.siteCard}
                    onClick={() => setOpenPopupSiteId(s.id)}
                    data-level={lvl}
                  >
                    <span
                      className={styles.siteCardDot}
                      style={{ background: STATUT_COLOR[lvl] }}
                      aria-hidden="true"
                    />
                    <span className={styles.siteCardBody}>
                      <span className={styles.siteCardName}>{s.shortName}</span>
                      <span className={styles.siteCardMeta}>{s.location.commune}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <span>Légende</span>
            </header>
            <ul className={styles.legend}>
              <li>
                <span className={styles.legendDot} style={{ background: STATUT_COLOR.CRITIQUE }} />
                Critiques
              </li>
              <li>
                <span className={styles.legendDot} style={{ background: STATUT_COLOR.A_SURVEILLER }} />
                À surveiller
              </li>
              <li>
                <span className={styles.legendDot} style={{ background: STATUT_COLOR.CONFORME }} />
                Conformes
              </li>
            </ul>
          </section>
        </aside>
        ) : null}

        <div className={styles.mapShell}>
          {/* Bouton 'Recentrer' compact en haut-droite de la carte —
           * les stats sont deja affichees au-dessus dans le hero. */}
          <button
            type="button"
            className={styles.mapRecenterBtn}
            onClick={() => setFocusTarget([center[0], center[1], 6])}
            title="Recentrer la carte sur tous les sites"
          >
            <Maximize2 size={12} /> Recentrer
          </button>
          <button
            type="button"
            className={`${styles.mapSatelliteBtn} ${mapMode === 'satellite' ? styles.mapSatelliteBtnActive : ''}`}
            onClick={() => setMapMode((m) => (m === 'plan' ? 'satellite' : 'plan'))}
            title={mapMode === 'satellite' ? 'Passer en mode plan' : 'Passer en mode satellite'}
          >
            {mapMode === 'satellite' ? <MapIcon size={12} /> : <Satellite size={12} />}
            {mapMode === 'satellite' ? 'Plan' : 'Satellite'}
          </button>
          <button
            type="button"
            className={`${styles.mapRecenterBtn} ${styles.mapPrintBtn}`}
            onClick={() => void imprimer()}
            disabled={!map || preparingPrint}
            title="Imprimer la carte des sites affichés"
          >
            <Printer size={12} /> {preparingPrint ? 'Préparation…' : 'Imprimer'}
          </button>
          {isLoading ? (
            <Skeleton width="100%" height="100%" />
          ) : (
            <MapContainer
              ref={setMap}
              center={center}
              zoom={6}
              className={styles.map}
              scrollWheelZoom
              zoomControl={false}
            >
              {/* Zoom deplace en bas a gauche : libere le coin haut-gauche
               * (bouton de repli du panneau) et le coin haut-droit (Recentrer). */}
              <ZoomControl position="bottomleft" />
              {mapMode === 'satellite' ? (
                <>
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    attribution=""
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                </>
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              {/* Marqueurs sites — couleur alignée sur la conformité réelle
               * (labo), filtrés par zone et statut via le panneau lateral. */}
              {filteredSites.map((site) => (
                <SiteMarker
                  key={site.id}
                  site={site}
                  lvl={conformityFor(site.id)}
                  shouldOpenPopup={openPopupSiteId === site.id}
                  onPopupOpened={() => setOpenPopupSiteId(null)}
                />
              ))}

              {/* Composant invisible qui ecoute focusTarget et fait fly-to */}
              <MapFocus target={focusTarget} />
            </MapContainer>
          )}
        </div>
      </div>

      {/* Annexe visible uniquement a l'impression : liste des sites, page 2 */}
      {sitesParCriticite.length > 0 ? (
        <section className={styles.printAnnex}>
          <h2 className={styles.printTitle}>Sites affichés</h2>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th>Site</th>
                <th>Commune</th>
                <th>Statut</th>
                <th>Latitude</th>
                <th>Longitude</th>
              </tr>
            </thead>
            <tbody>
              {sitesParCriticite.map((s) => {
                const lvl = conformityFor(s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.shortName}</td>
                    <td>{s.location.commune || '—'}</td>
                    <td>
                      <span className={styles.legendDot} style={{ background: STATUT_COLOR[lvl] }} />{' '}
                      {STATUT_LABEL[lvl]}
                    </td>
                    <td>{s.coordinates.lat.toFixed(5)}</td>
                    <td>{s.coordinates.lng.toFixed(5)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────
 * SiteMarker — marqueur avec popup enrichi + géocodage inversé lazy
 * ─────────────────────────────────────*/
interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
}
interface GeoInfo {
  quartier: string;
  commune: string;
  ville: string;
  region: string;
  displayName: string;
}

interface SiteMarkerProps {
  site: Site;
  lvl: StatutConformite;
  shouldOpenPopup: boolean;
  onPopupOpened: () => void;
}

function SiteMarker({ site, lvl, shouldOpenPopup, onPopupOpened }: SiteMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();
  const onPopupOpenedRef = useRef(onPopupOpened);
  onPopupOpenedRef.current = onPopupOpened;

  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (!shouldOpenPopup) return;
    map.flyTo([site.coordinates.lat, site.coordinates.lng], 18, { duration: 0.8 });
    const t = setTimeout(() => {
      markerRef.current?.openPopup();
      onPopupOpenedRef.current();
    }, 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenPopup]);

  /* Géocodage inversé Nominatim — déclenché uniquement à l'ouverture
   * du popup (lazy) pour respecter la limite 1 req/s. Cache permanent. */
  const { data: geo, isLoading: geoLoading } = useQuery<GeoInfo>({
    queryKey: ['geocode', site.coordinates.lat.toFixed(5), site.coordinates.lng.toFixed(5)],
    queryFn: async () => {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${site.coordinates.lat}&lon=${site.coordinates.lng}&format=json&accept-language=fr`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const data = await res.json() as { address: NominatimAddress; display_name: string };
      const a = data.address;
      return {
        quartier:    a.quarter ?? a.neighbourhood ?? a.suburb ?? '',
        commune:     a.city_district ?? a.county ?? '',
        ville:       a.city ?? a.town ?? a.village ?? '',
        region:      a.state ?? '',
        displayName: data.display_name ?? '',
      };
    },
    enabled: popupOpen,
    staleTime: Infinity,
    retry: false,
  });

  const adresseLine = geo
    ? [geo.quartier, geo.commune, geo.ville, geo.region].filter(Boolean).join(' · ')
    : [site.location.commune, site.location.city].filter(Boolean).join(', ');

  const gmapsUrl = `https://www.google.com/maps?q=${site.coordinates.lat},${site.coordinates.lng}`;

  return (
    <Marker
      ref={markerRef}
      position={[site.coordinates.lat, site.coordinates.lng]}
      icon={buildMarkerIcon(STATUT_COLOR[lvl], site.isReference)}
      eventHandlers={{
        popupopen:  () => setPopupOpen(true),
        popupclose: () => setPopupOpen(false),
      }}
    >
      <Popup>
        <div className={styles.popup}>
          <header className={styles.popupHead}>
            <h3 className={styles.popupTitle}>{site.shortName}</h3>
            <Badge
              size="sm"
              variant={
                lvl === 'CONFORME' ? 'success'
                : lvl === 'A_SURVEILLER' ? 'warning'
                : lvl === 'CRITIQUE' ? 'danger'
                : 'neutral'
              }
            >
              {STATUT_LABEL[lvl]}
            </Badge>
          </header>

          {/* Localisation géocodée (ou fallback stocké) + coordonnées */}
          <div className={styles.popupLocation}>
            <span className={styles.popupLocationText}>
              {geoLoading ? 'Localisation en cours…' : adresseLine || '—'}
            </span>
            <span className={styles.popupCoords}>
              {site.coordinates.lat.toFixed(6)}, {site.coordinates.lng.toFixed(6)}
            </span>
          </div>

          {/* Mesures issues des analyses laboratoire.
            *
            * Les valeurs affichées ici viennent de l'endpoint de conformité, et
            * non des collectes : en live, `import_kobos` ne porte aucune mesure
            * (`measurements` y est toujours vide), si bien que l'ancien bloc
            * pH / Sulfates / EPI restait invariablement à « — ». */}
          <MesuresSite siteId={site.id} actif={popupOpen} />

          {/* Barre d'actions unifiée */}
          <div className={styles.popupActions}>
            <button
              type="button"
              className={styles.popupActionBtn}
              onClick={() => map.flyTo([site.coordinates.lat, site.coordinates.lng], 18, { duration: 0.6 })}
              title="Zoomer au maximum sur ce point"
            >
              <ZoomIn size={13} />
              Zoom
            </button>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.popupActionBtn}
              onClick={(e) => e.stopPropagation()}
              title="Ouvrir dans Google Maps"
            >
              <MapPin size={13} />
              Google Maps
            </a>
            <Link to={`/sites/${site.id}`} className={`${styles.popupActionBtn} ${styles.popupActionBtnPrimary}`}>
              Fiche site →
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/* ─────────────────────────────────────
 * MesuresSite — paramètres analysés du site, chargés à l'ouverture du popup
 * ─────────────────────────────────────*/
function MesuresSite({ siteId, actif }: { siteId: string; actif: boolean }) {
  /* `useConformiteSite` s'active sur la présence de l'id : passer `undefined`
   * tant que le popup est fermé évite d'appeler l'API pour tous les sites au
   * chargement de la carte. Le cache est partagé avec la fiche site. */
  const { data, isLoading, isError } = useConformiteSite(actif ? siteId : undefined);

  if (isLoading) {
    return (
      <span className={`${styles.popupMeta} ${styles.popupChargement}`}>
        <Spinner size={14} label="Chargement des mesures" />
        Chargement des mesures…
      </span>
    );
  }
  if (isError || !data) {
    return <span className={styles.popupMeta}>Mesures indisponibles pour ce site.</span>;
  }

  const { resume, composantes } = data;

  /* Les paramètres hors seuil d'abord : c'est l'information qu'on vient
   * chercher en ouvrant un site sur la carte. */
  const horsSeuil = composantes
    .flatMap((c) => c.parametres)
    .filter((prm) => prm.statut === 'NON_CONFORME' || prm.statut === 'CRITIQUE');

  return (
    <>
      <div className={styles.popupKpiGrid}>
        <div className={styles.popupKpi}>
          <span className={styles.popupKpiLabel}>Conformité</span>
          <span className={styles.popupKpiValue}>
            {resume.tauxConformite.toFixed(0)}
            <span className={styles.popupKpiUnit}>%</span>
          </span>
        </div>
        <div className={styles.popupKpi}>
          <span className={styles.popupKpiLabel}>Conformes</span>
          <span className={styles.popupKpiValue}>{resume.conformes}</span>
        </div>
        <div className={styles.popupKpi}>
          <span className={styles.popupKpiLabel}>Hors seuil</span>
          <span className={styles.popupKpiValue}>{resume.nonConformes}</span>
        </div>
      </div>

      {horsSeuil.length > 0 ? (
        <div className={styles.popupMesures}>
          <span className={styles.popupMesuresTitre}>Paramètres hors seuil</span>
          <ul className={styles.popupMesuresListe}>
            {horsSeuil.slice(0, 3).map((prm) => (
              <li key={prm.id} className={styles.popupMesure}>
                <span className={styles.popupMesureNom}>{prm.libelle || prm.code}</span>
                <span className={styles.popupMesureValeur}>
                  {prm.valeurBrute || '—'}
                  {prm.unite ? <span className={styles.popupKpiUnit}>{prm.unite}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {horsSeuil.length > 3 ? (
            <span className={styles.popupMeta}>
              + {horsSeuil.length - 3} autre{horsSeuil.length - 3 > 1 ? 's' : ''} paramètre
              {horsSeuil.length - 3 > 1 ? 's' : ''} hors seuil
            </span>
          ) : null}
        </div>
      ) : resume.totalEvaluables > 0 ? (
        <span className={styles.popupMeta}>Tous les paramètres évalués sont dans les seuils.</span>
      ) : (
        <span className={styles.popupMeta}>Aucun paramètre évalué pour ce site.</span>
      )}
    </>
  );
}

/* ─────────────────────────────────────
 * MapFocus — composant invisible qui ecoute le focusTarget et fait
 * flyTo via useMap (react-leaflet). Permet de centrer la carte quand
 * le sup clique sur un site dans le panel lateral.
 * ─────────────────────────────────────*/
function MapFocus({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!target) return;
    const key = `${target[0]}:${target[1]}:${target[2]}`;
    if (last.current === key) return;
    last.current = key;
    map.flyTo([target[0], target[1]], target[2], { duration: 0.8 });
  }, [target, map]);
  return null;
}
