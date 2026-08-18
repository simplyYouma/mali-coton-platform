import { useEffect, useMemo, useRef, useState } from 'react';
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Satellite,
  ShieldCheck,
  Target,
  ZoomIn,
} from 'lucide-react';
import { Badge, Skeleton } from '@/components/common';
import { useSites } from '@/features/sites/hooks/useSites';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { useConformiteGlobale } from '@/features/conformite/hooks/useConformite';
import type { StatutConformite } from '@/features/conformite/api/conformite';
import { formatRelativeTime } from '@/lib/format';
import type { Collection } from '@/features/collection/api/collection.types';
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

export function MappingPage() {
  const { data: sitesPage, isLoading } = useSites();
  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);

  const { data: collectionsPage } = useCollections({});
  const { data: alertsPage } = useAlerts();

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

  const center = useMemo<[number, number]>(() => {
    if (filteredSites.length === 0) return DEFAULT_CENTER;
    const lat = filteredSites.reduce((s, x) => s + x.coordinates.lat, 0) / filteredSites.length;
    const lng = filteredSites.reduce((s, x) => s + x.coordinates.lng, 0) / filteredSites.length;
    return [lat, lng];
  }, [filteredSites]);

  /* Stats par site agreges des collectes — dernieres valeurs cle +
   * sparkline pH 90 jours pour afficher dans la popup. */
  type SiteStats = {
    lastCollectionAt: string | null;
    lastPh: number | null;
    lastSulfates: number | null;
    lastEpi: number | null;
    phSeries: number[];
    activeAlerts: number;
  };
  const siteStats = useMemo(() => {
    const map = new Map<string, SiteStats>();
    const cutoff = Date.now() - 90 * 86_400_000;
    for (const s of sites) {
      const all = (collectionsPage?.items ?? []).filter(
        (c: Collection) => c.siteId === s.id,
      );
      const sorted = [...all].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
      );
      const latest = sorted[0];
      const getVal = (c: Collection | undefined, ind: string) => {
        if (!c) return null;
        const m = c.measurements.find((x) => x.indicatorId === ind);
        const v = m?.value;
        return typeof v === 'number' && Number.isFinite(v) ? v : null;
      };
      const phSeries = all
        .filter((c) => new Date(c.collectedAt).getTime() >= cutoff)
        .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime())
        .map((c) => {
          const m = c.measurements.find((x) => x.indicatorId === 'water.ph');
          return typeof m?.value === 'number' && Number.isFinite(m.value) ? m.value : null;
        })
        .filter((v): v is number => v != null);
      const activeAlerts = (alertsPage?.items ?? []).filter(
        (a) => a.siteId === s.id && a.status === 'active',
      ).length;
      map.set(s.id, {
        lastCollectionAt: latest?.collectedAt ?? null,
        lastPh: getVal(latest, 'water.ph'),
        lastSulfates: getVal(latest, 'water.sulfates'),
        lastEpi: getVal(latest, 'health.epi_usage'),
        phSeries,
        activeAlerts,
      });
    }
    return map;
  }, [sites, collectionsPage, alertsPage]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Vue géospatiale</span>
          <h1 className={styles.heroTitle}>Cartographie</h1>
          <p className={styles.heroDescription}>
            Géolocalisation des sites et heatmaps de conformité.
          </p>
        </div>
      </header>

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
              {[...filteredSites]
                .sort((a, b) => {
                  /* Tri par criticite : CRITIQUE > A_SURVEILLER > CONFORME > NON_EVALUE */
                  const order = { CRITIQUE: 0, A_SURVEILLER: 1, CONFORME: 2, NON_EVALUE: 3 } as const;
                  return order[conformityFor(a.id)] - order[conformityFor(b.id)];
                })
                .map((s) => {
                  const lvl = conformityFor(s.id);
                  const ss = siteStats.get(s.id);
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
                        <span className={styles.siteCardMeta}>
                          {s.location.commune}
                          {ss?.activeAlerts ? (
                            <>
                              <span className={styles.siteCardSep}>·</span>
                              <span className={styles.siteCardAlert}>
                                {ss.activeAlerts} alerte{ss.activeAlerts > 1 ? 's' : ''}
                              </span>
                            </>
                          ) : null}
                        </span>
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
          {isLoading ? (
            <Skeleton width="100%" height="100%" />
          ) : (
            <MapContainer
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
              {filteredSites.map((site) => {
                const lvl = conformityFor(site.id);
                const ss = siteStats.get(site.id);
                return (
                  <SiteMarker
                    key={site.id}
                    site={site}
                    lvl={lvl}
                    hasAlert={(ss?.activeAlerts ?? 0) > 0}
                    activeAlerts={ss?.activeAlerts ?? 0}
                    lastCollectionAt={ss?.lastCollectionAt ?? null}
                    lastPh={ss?.lastPh ?? null}
                    lastSulfates={ss?.lastSulfates ?? null}
                    lastEpi={ss?.lastEpi ?? null}
                    phSeries={ss?.phSeries ?? []}
                    shouldOpenPopup={openPopupSiteId === site.id}
                    onPopupOpened={() => setOpenPopupSiteId(null)}
                  />
                );
              })}

              {/* Composant invisible qui ecoute focusTarget et fait fly-to */}
              <MapFocus target={focusTarget} />
            </MapContainer>
          )}
        </div>
      </div>
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
  hasAlert: boolean;
  activeAlerts: number;
  lastCollectionAt: string | null;
  lastPh: number | null;
  lastSulfates: number | null;
  lastEpi: number | null;
  phSeries: number[];
  shouldOpenPopup: boolean;
  onPopupOpened: () => void;
}

function SiteMarker({
  site, lvl, hasAlert, activeAlerts,
  lastCollectionAt, lastPh, lastSulfates, lastEpi, phSeries,
  shouldOpenPopup, onPopupOpened,
}: SiteMarkerProps) {
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

          {/* KPIs dernière collecte */}
          <div className={styles.popupKpiGrid}>
            <div className={styles.popupKpi}>
              <span className={styles.popupKpiLabel}>pH</span>
              <span className={styles.popupKpiValue}>
                {lastPh != null ? lastPh.toFixed(2) : '—'}
              </span>
            </div>
            <div className={styles.popupKpi}>
              <span className={styles.popupKpiLabel}>Sulfates</span>
              <span className={styles.popupKpiValue}>
                {lastSulfates != null ? Math.round(lastSulfates) : '—'}
                <span className={styles.popupKpiUnit}>mg/L</span>
              </span>
            </div>
            <div className={styles.popupKpi}>
              <span className={styles.popupKpiLabel}>EPI</span>
              <span className={styles.popupKpiValue}>
                {lastEpi != null ? `${Math.round(lastEpi)}%` : '—'}
              </span>
            </div>
          </div>

          {phSeries.length >= 2 ? (
            <div className={styles.popupSpark}>
              <span className={styles.popupSparkLabel}>
                pH · {phSeries.length} mesures · 90 j
              </span>
              <PopupSparkline values={phSeries} />
            </div>
          ) : null}

          {lastCollectionAt ? (
            <span className={styles.popupMeta}>
              Dernière collecte : {formatRelativeTime(lastCollectionAt)}
            </span>
          ) : null}

          {hasAlert ? (
            <span className={styles.popupAlert}>
              <AlertTriangle size={11} /> {activeAlerts} alerte
              {activeAlerts > 1 ? 's' : ''} active{activeAlerts > 1 ? 's' : ''}
            </span>
          ) : null}

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

/* ─────────────────────────────────────
 * PopupSparkline — petite courbe SVG des dernieres valeurs (pH 90j).
 * ─────────────────────────────────────*/
function PopupSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 200;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');
  /* Surveille la derniere valeur pour colorer la sparkline */
  const last = values[values.length - 1]!;
  const isOk = last >= 6.5 && last <= 8.5; // OMS pH
  const color = isOk ? '#16a34a' : '#dc2626';
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={`M${pts}`} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Point final */}
      <circle
        cx={(values.length - 1) * step}
        cy={h - ((last - min) / range) * (h - 4) - 2}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
