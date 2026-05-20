import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Droplets,
  Flame,
  Layers,
  MapPin,
  Maximize2,
  Target,
} from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/common';
import { useSites } from '@/features/sites/hooks/useSites';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useAlerts } from '@/features/alerts/hooks/useAlerts';
import { formatRelativeTime } from '@/lib/format';
import type { ConformityLevel } from '@/types/common';
import type { Collection } from '@/features/collection/api/collection.types';
import styles from './MappingPage.module.css';

/**
 * Cartographie des sites pilotes — vue géospatiale opérationnelle.
 *
 * Les filtres et surcouches ci-dessous sont fonctionnels et reposent
 * uniquement sur des données déjà calculées côté serveur (mockées) :
 *  - `site.conformityByDomain` pour la coloration des marqueurs
 *  - `useCollections` pour la couche « Collectes récentes (30 j) »
 *  - `useAlerts` pour la couche « Alertes actives critiques »
 *  - `SITES_WITH_WATERCOURSE` (issu du Diagnostic) pour la couche cours d'eau
 *
 * Le fond de plan est OpenStreetMap. L'ajout de couches OGC (WMS/WFS)
 * publiées par un serveur GeoServer dédié reste une évolution backend.
 */

type DomainFilter = 'all' | 'water' | 'soil' | 'air' | 'waste' | 'health';

const DOMAIN_OPTIONS: Array<{ value: DomainFilter; label: string; hint: string }> = [
  { value: 'all', label: 'Toutes', hint: 'Conformité globale du site' },
  { value: 'water', label: 'Eaux usées', hint: 'pH, sulfates, DCO, métaux' },
  { value: 'soil', label: 'Sol', hint: 'pH, métaux lourds' },
  { value: 'air', label: 'Air', hint: 'PM2,5, PM10, CO₂' },
  { value: 'waste', label: 'Déchets', hint: 'Quantités, gestion' },
  { value: 'health', label: 'Santé / SST', hint: 'EPI, incidents' },
];

const CONFORMITY_COLOR: Record<ConformityLevel, string> = {
  conforming: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
};
const CONFORMITY_LABEL: Record<ConformityLevel, string> = {
  conforming: 'Conforme',
  warning: 'À surveiller',
  critical: 'Hors seuil',
};

/**
 * Sites longeant un cours d'eau (Niger ou bras secondaire) — repris du
 * Diagnostic Environnemental décembre 2025 §3.2. Utilisé pour la couche
 * « Cours d'eau proche » (buffer 300 m autour du site).
 */
const SITES_WITH_WATERCOURSE = new Set([
  'site-dianeguela',
  'site-galanimassiriw',
  'site-djiguiyaso',
]);

function buildMarkerIcon(color: string, isReference: boolean): L.DivIcon {
  const ring = isReference ? '3px' : '2px';
  return L.divIcon({
    className: 'mc-marker',
    html: `
      <div style="position:relative;width:28px;height:34px;transform:translate(-50%,-100%);">
        <div style="position:absolute;inset:0 0 6px 0;border-radius:50%;background:${color};border:${ring} solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.22);"></div>
        <div style="position:absolute;left:50%;bottom:-1px;width:10px;height:10px;background:${color};transform:translateX(-50%) rotate(45deg);box-shadow:0 4px 10px rgba(0,0,0,0.14);"></div>
      </div>
    `,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
  });
}

const DEFAULT_CENTER: [number, number] = [13.2, -7.5];

export function MappingPage() {
  const { data: sitesPage, isLoading } = useSites();
  const sites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);

  const { data: collectionsPage } = useCollections({});
  const { data: alertsPage } = useAlerts();

  const [domain, setDomain] = useState<DomainFilter>('all');
  const [showCollections, setShowCollections] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showWatercourses, setShowWatercourses] = useState(false);
  const [showRiskZones, setShowRiskZones] = useState(true);
  /* Cible courante du fly-to — declenche par le clic sur un site dans
   * le panel lateral. Le composant MapFocus se charge de centrer. */
  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null);

  /** Conformité du site selon le filtre domaine actif. */
  const conformityFor = (siteId: string): ConformityLevel => {
    const site = sites.find((s) => s.id === siteId);
    if (!site) return 'conforming';
    if (domain === 'all') return site.conformity;
    return site.conformityByDomain[domain];
  };

  /** Compteurs hero — recalculés selon le domaine sélectionné. */
  const stats = useMemo(() => {
    const c = { conforming: 0, warning: 0, critical: 0 };
    for (const s of sites) {
      const lvl = domain === 'all' ? s.conformity : s.conformityByDomain[domain];
      c[lvl] += 1;
    }
    const activeCritical = (alertsPage?.items ?? []).filter(
      (a) => a.status === 'active' && a.severity === 'critical',
    ).length;
    return { ...c, total: sites.length, activeCritical };
  }, [sites, domain, alertsPage]);

  /** Collectes des 30 derniers jours avec coordonnées GPS valides. */
  const recentCollections = useMemo(() => {
    if (!showCollections) return [];
    const cutoff = Date.now() - 30 * 86_400_000;
    return (collectionsPage?.items ?? []).filter(
      (c) => c.gps && new Date(c.collectedAt).getTime() >= cutoff,
    );
  }, [collectionsPage, showCollections]);

  /** Sites avec ≥1 alerte critique active — pour la couche pulse rouge. */
  const sitesWithCriticalAlerts = useMemo(() => {
    if (!showAlerts) return new Set<string>();
    const set = new Set<string>();
    (alertsPage?.items ?? [])
      .filter((a) => a.status === 'active' && a.severity === 'critical' && a.siteId)
      .forEach((a) => a.siteId && set.add(a.siteId));
    return set;
  }, [alertsPage, showAlerts]);

  const center = useMemo<[number, number]>(() => {
    if (sites.length === 0) return DEFAULT_CENTER;
    const lat = sites.reduce((s, x) => s + x.coordinates.lat, 0) / sites.length;
    const lng = sites.reduce((s, x) => s + x.coordinates.lng, 0) / sites.length;
    return [lat, lng];
  }, [sites]);

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
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Vue géospatiale</span>
          <h1 className={styles.heroTitle}>Cartographie</h1>
          <p className={styles.heroDescription}>
            Géolocalisation des sites et heatmaps de conformité.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{stats.total}</span>
            <span className={styles.heroStatLabel}>Sites</span>
          </div>
          <div className={styles.heroStat} data-tone="success">
            <span className={styles.heroStatValue}>{stats.conforming}</span>
            <span className={styles.heroStatLabel}>Conformes</span>
          </div>
          <div className={styles.heroStat} data-tone="warning">
            <span className={styles.heroStatValue}>{stats.warning}</span>
            <span className={styles.heroStatLabel}>À surveiller</span>
          </div>
          <div className={styles.heroStat} data-tone="critical">
            <span className={styles.heroStatValue}>{stats.critical}</span>
            <span className={styles.heroStatLabel}>Hors seuil</span>
          </div>
          <div className={styles.heroStat} data-tone="alert">
            <span className={styles.heroStatValue}>{stats.activeCritical}</span>
            <span className={styles.heroStatLabel}>Alertes critiques</span>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidePanel} aria-label="Filtres et couches">
          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <Layers size={14} aria-hidden="true" />
              <span>Filtre par domaine</span>
            </header>
            <div className={styles.chips}>
              {DOMAIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDomain(opt.value)}
                  className={`${styles.chip} ${domain === opt.value ? styles.chipActive : ''}`}
                  title={opt.hint}
                  aria-pressed={domain === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <MapPin size={14} aria-hidden="true" />
              <span>Surcouches</span>
            </header>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showAlerts}
                onChange={(e) => setShowAlerts(e.target.checked)}
              />
              <span className={styles.toggleBody}>
                <span className={styles.toggleLabel}>
                  Alertes actives
                </span>
              </span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showCollections}
                onChange={(e) => setShowCollections(e.target.checked)}
              />
              <span className={styles.toggleBody}>
                <span className={styles.toggleLabel}>Collectes récentes (30 j)</span>
              </span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showWatercourses}
                onChange={(e) => setShowWatercourses(e.target.checked)}
              />
              <span className={styles.toggleBody}>
                <span className={styles.toggleLabel}>
                  Cours d'eau proche
                  <Droplets size={11} aria-hidden="true" style={{ marginLeft: 4 }} />
                </span>
              </span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showRiskZones}
                onChange={(e) => setShowRiskZones(e.target.checked)}
              />
              <span className={styles.toggleBody}>
                <span className={styles.toggleLabel}>
                  Zones de risque
                  <Flame size={11} aria-hidden="true" style={{ marginLeft: 4 }} />
                </span>
              </span>
            </label>
          </section>

          {/* Sites visibles — click pour zoomer */}
          <section className={styles.panelSection}>
            <header className={styles.panelHead}>
              <Target size={14} aria-hidden="true" />
              <span>Sites surveillés</span>
            </header>
            <div className={styles.sitesList}>
              {[...sites]
                .sort((a, b) => {
                  /* Tri par criticite : critical > warning > conforming */
                  const order = { critical: 0, warning: 1, conforming: 2 } as const;
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
                      onClick={() =>
                        setFocusTarget([s.coordinates.lat, s.coordinates.lng, 11])
                      }
                      data-level={lvl}
                    >
                      <span
                        className={styles.siteCardDot}
                        style={{ background: CONFORMITY_COLOR[lvl] }}
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
                <span className={styles.legendDot} style={{ background: CONFORMITY_COLOR.conforming }} />
                Conforme
              </li>
              <li>
                <span className={styles.legendDot} style={{ background: CONFORMITY_COLOR.warning }} />
                À surveiller
              </li>
              <li>
                <span className={styles.legendDot} style={{ background: CONFORMITY_COLOR.critical }} />
                Hors seuil
              </li>
              <li>
                <span className={styles.legendStar} aria-hidden="true">★</span>
                Site de référence
              </li>
            </ul>
          </section>
        </aside>

        <div className={styles.mapShell}>
          {/* Overlay strip flottant en haut de la carte — donne un look
           * 'command center' avec les chiffres saillants toujours visibles */}
          <div className={styles.mapOverlay} aria-label="Synthèse géospatiale">
            <span className={styles.mapOverlayItem}>
              <strong>{stats.total}</strong> sites
            </span>
            <span className={styles.mapOverlayItem} data-tone="critical">
              <strong>{stats.critical}</strong> hors seuil
            </span>
            <span className={styles.mapOverlayItem} data-tone="warning">
              <strong>{stats.warning}</strong> à surveiller
            </span>
            <span className={styles.mapOverlayItem} data-tone="success">
              <strong>{stats.conforming}</strong> conformes
            </span>
            <span className={styles.mapOverlaySep} aria-hidden="true" />
            <span className={styles.mapOverlayItem} data-tone="alert">
              <AlertTriangle size={12} /> <strong>{stats.activeCritical}</strong> alerte
              {stats.activeCritical > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className={styles.mapOverlayBtn}
              onClick={() => setFocusTarget([center[0], center[1], 6])}
              title="Recentrer sur tous les sites"
            >
              <Maximize2 size={12} /> Recentrer
            </button>
          </div>
          {isLoading ? (
            <Skeleton width="100%" height="100%" />
          ) : (
            <MapContainer center={center} zoom={6} className={styles.map} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Surcouche cours d'eau (buffers) */}
              {showWatercourses
                ? sites
                    .filter((s) => SITES_WITH_WATERCOURSE.has(s.id))
                    .map((s) => (
                      <Circle
                        key={`wc-${s.id}`}
                        center={[s.coordinates.lat, s.coordinates.lng]}
                        radius={300}
                        pathOptions={{
                          color: '#0ea5e9',
                          weight: 1,
                          fillColor: '#38bdf8',
                          fillOpacity: 0.18,
                          dashArray: '4 4',
                        }}
                      />
                    ))
                : null}

              {/* Surcouche alertes critiques */}
              {showAlerts
                ? sites
                    .filter((s) => sitesWithCriticalAlerts.has(s.id))
                    .map((s) => (
                      <Circle
                        key={`al-${s.id}`}
                        center={[s.coordinates.lat, s.coordinates.lng]}
                        radius={650}
                        pathOptions={{
                          color: CONFORMITY_COLOR.critical,
                          weight: 1.5,
                          fillColor: CONFORMITY_COLOR.critical,
                          fillOpacity: 0.12,
                        }}
                      />
                    ))
                : null}

              {/* Surcouche collectes récentes */}
              {recentCollections.map((c) => (
                <CircleMarker
                  key={`col-${c.id}`}
                  center={[c.gps!.lat, c.gps!.lng]}
                  radius={4}
                  pathOptions={{
                    color: '#418FDE',
                    weight: 1,
                    fillColor: '#418FDE',
                    fillOpacity: 0.65,
                  }}
                >
                  <Popup>
                    <div className={styles.popup}>
                      <span className={styles.popupMeta}>Collecte {c.id.slice(-6).toUpperCase()}</span>
                      <span className={styles.popupMeta}>
                        {formatRelativeTime(c.collectedAt)}
                      </span>
                      <Link to={`/collecte/${c.id}`} className={styles.popupAction}>
                        Voir détail
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Heatmap risque : cercles concentriques sur les sites
               * critiques pour simuler une intensite de risque. Le rayon
               * varie selon la severite : critical=1200m, warning=800m. */}
              {showRiskZones
                ? sites.map((site) => {
                    const lvl = conformityFor(site.id);
                    if (lvl === 'conforming') return null;
                    const isCritical = lvl === 'critical';
                    return (
                      <Circle
                        key={`risk-${site.id}`}
                        center={[site.coordinates.lat, site.coordinates.lng]}
                        radius={isCritical ? 1200 : 800}
                        pathOptions={{
                          color: CONFORMITY_COLOR[lvl],
                          weight: 0,
                          fillColor: CONFORMITY_COLOR[lvl],
                          fillOpacity: isCritical ? 0.14 : 0.08,
                        }}
                      />
                    );
                  })
                : null}

              {/* Marqueurs sites */}
              {sites.map((site) => {
                const lvl = conformityFor(site.id);
                const hasAlert = sitesWithCriticalAlerts.has(site.id);
                const ss = siteStats.get(site.id);
                return (
                  <Marker
                    key={site.id}
                    position={[site.coordinates.lat, site.coordinates.lng]}
                    icon={buildMarkerIcon(CONFORMITY_COLOR[lvl], site.isReference)}
                  >
                    <Popup>
                      <div className={styles.popup}>
                        <header className={styles.popupHead}>
                          <h3 className={styles.popupTitle}>
                            {site.shortName}
                            {site.isReference ? ' ★' : ''}
                          </h3>
                          <Badge
                            size="sm"
                            variant={
                              lvl === 'conforming'
                                ? 'success'
                                : lvl === 'warning'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {CONFORMITY_LABEL[lvl]}
                          </Badge>
                        </header>
                        <span className={styles.popupMeta}>
                          {site.location.commune}, {site.location.city} · {site.workforce} membres
                        </span>

                        {/* KPIs derniere collecte */}
                        <div className={styles.popupKpiGrid}>
                          <div className={styles.popupKpi}>
                            <span className={styles.popupKpiLabel}>pH</span>
                            <span className={styles.popupKpiValue}>
                              {ss?.lastPh != null ? ss.lastPh.toFixed(2) : '—'}
                            </span>
                          </div>
                          <div className={styles.popupKpi}>
                            <span className={styles.popupKpiLabel}>Sulfates</span>
                            <span className={styles.popupKpiValue}>
                              {ss?.lastSulfates != null ? Math.round(ss.lastSulfates) : '—'}
                              <span className={styles.popupKpiUnit}>mg/L</span>
                            </span>
                          </div>
                          <div className={styles.popupKpi}>
                            <span className={styles.popupKpiLabel}>EPI</span>
                            <span className={styles.popupKpiValue}>
                              {ss?.lastEpi != null ? `${Math.round(ss.lastEpi)}%` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Sparkline pH 90 jours */}
                        {ss && ss.phSeries.length >= 2 ? (
                          <div className={styles.popupSpark}>
                            <span className={styles.popupSparkLabel}>
                              pH · {ss.phSeries.length} mesures · 90 j
                            </span>
                            <PopupSparkline values={ss.phSeries} />
                          </div>
                        ) : null}

                        {/* Derniere collecte */}
                        {ss?.lastCollectionAt ? (
                          <span className={styles.popupMeta}>
                            Dernière collecte : {formatRelativeTime(ss.lastCollectionAt)}
                          </span>
                        ) : null}

                        {hasAlert ? (
                          <span className={styles.popupAlert}>
                            <AlertTriangle size={11} /> {ss?.activeAlerts ?? 1} alerte
                            {(ss?.activeAlerts ?? 1) > 1 ? 's' : ''} active
                            {(ss?.activeAlerts ?? 1) > 1 ? 's' : ''}
                          </span>
                        ) : null}

                        <div className={styles.popupAction}>
                          <Link to={`/sites/${site.id}`}>
                            <Button variant="primary" size="sm" fullWidth>
                              Ouvrir la fiche site
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
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
