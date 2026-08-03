import { Component, inject, signal, computed, NgZone, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { LeafletDirective, LeafletLayersDirective } from '@bluehalo/ngx-leaflet';
import * as L from 'leaflet';
import 'leaflet-draw';

// ── MultiPoint draw handler ───────────────────────────────────────────────────
// Registers L.Draw.MultiPoint: click to add nodes, dblclick to finish.
function registerMultiPointHandler(): void {
  const Ld = L as any;
  if (Ld.Draw.MultiPoint) return; // already registered

  Ld.Draw.MultiPoint = Ld.Draw.Feature.extend({
    statics: { TYPE: 'multipoint' },
    options: { repeatMode: false },

    initialize(map: L.Map, options: any) {
      this.type = 'multipoint';
      this._points = [];
      this._markers = [];
      Ld.Draw.Feature.prototype.initialize.call(this, map, options);
    },

    addHooks() {
      Ld.Draw.Feature.prototype.addHooks.call(this);
      if (this._map) {
        this._tooltip.updateContent({ text: 'Click to add nodes. Double-click to finish.' });
        if (!this._mouseMarker) {
          this._mouseMarker = L.marker(this._map.getCenter(), {
            icon: L.divIcon({
              className: 'leaflet-mouse-marker',
              iconAnchor: [20, 20],
              iconSize: [40, 40],
            }),
            opacity: 0,
            zIndexOffset: 2000,
          });
        }
        this._mouseMarker
          .on('click', this._onClick, this)
          .addTo(this._map);
        this._map.on('mousemove', this._onMouseMove, this);
        this._map.on('dblclick', this._onDblClick, this);
      }
    },

    removeHooks() {
      Ld.Draw.Feature.prototype.removeHooks.call(this);
      if (this._map) {
        this._map.off('mousemove', this._onMouseMove, this);
        this._map.off('dblclick', this._onDblClick, this);
        if (this._mouseMarker) {
          this._mouseMarker.off('click', this._onClick, this);
          this._map.removeLayer(this._mouseMarker);
          delete this._mouseMarker;
        }
        this._markers.forEach((m: L.CircleMarker) => this._map.removeLayer(m));
        this._markers = [];
        this._points = [];
      }
    },

    _nearestNodeIndex(latlng: L.LatLng): number {
      const SNAP_PX = 12;
      const cursor = this._map.latLngToLayerPoint(latlng);
      let best = -1, bestDist = SNAP_PX;
      this._points.forEach((pt: L.LatLng, i: number) => {
        const d = cursor.distanceTo(this._map.latLngToLayerPoint(pt));
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    },

    _onMouseMove(e: L.LeafletMouseEvent) {
      if (this._mouseMarker) this._mouseMarker.setLatLng(e.latlng);
      const near = this._nearestNodeIndex(e.latlng);
      if (near >= 0) {
        this._tooltip.updateContent({ text: 'Click to remove this node.' });
      } else if (this._points.length === 0) {
        this._tooltip.updateContent({ text: 'Click to add nodes. Double-click to finish.' });
      } else {
        this._tooltip.updateContent({ text: `${this._points.length} node${this._points.length === 1 ? '' : 's'} — double-click to finish.` });
      }
      this._tooltip.updatePosition(e.latlng);
    },

    _onClick(e: L.LeafletMouseEvent) {
      const latlng = this._mouseMarker ? this._mouseMarker.getLatLng() : e.latlng;
      const nearIdx = this._nearestNodeIndex(latlng);
      if (nearIdx >= 0) {
        this._map.removeLayer(this._markers[nearIdx]);
        this._markers.splice(nearIdx, 1);
        this._points.splice(nearIdx, 1);
        const n = this._points.length;
        this._tooltip.updateContent({ text: n === 0 ? 'Click to add nodes. Double-click to finish.' : `${n} node${n === 1 ? '' : 's'} — double-click to finish.` });
        return;
      }
      this._points.push(latlng);
      const m = L.circleMarker(latlng, {
        radius: 6, color: '#fff', weight: 1.5,
        fillColor: '#a78bfa', fillOpacity: 0.8, opacity: 0.8,
      }).addTo(this._map);
      this._markers.push(m);
      this._tooltip.updateContent({ text: `${this._points.length} node${this._points.length === 1 ? '' : 's'} — double-click to finish.` });
    },

    completeShape() {
      if (this._points.length < 1) return;
      this._fireCreatedEvent();
      this.disable();
      if (this.options.repeatMode) this.enable();
    },

    _onDblClick() {
      if (this._points.length < 1) return;
      // Remove the phantom point added by the preceding click event of the dblclick
      if (this._points.length > 1) {
        this._points.pop();
        const last = this._markers.pop();
        if (last) this._map.removeLayer(last);
      }
      this.completeShape();
    },

    _fireCreatedEvent() {
      // Wrap as a FeatureGroup so existing event plumbing receives a layer object
      const group = L.featureGroup(
        this._points.map((ll: L.LatLng) =>
          L.circleMarker(ll, { radius: 7, color: '#fff', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.9 })
        )
      );
      // Attach the raw latlng array so onDrawCreated can read it
      (group as any)._multiPointLatLngs = [...this._points];
      Ld.Draw.Feature.prototype._fireCreatedEvent.call(this, group);
    },
  });

  // Patch DrawToolbar to include the new handler
  const origGetModeHandlers = Ld.DrawToolbar.prototype.getModeHandlers;
  Ld.DrawToolbar.prototype.getModeHandlers = function(map: L.Map) {
    const handlers: any[] = origGetModeHandlers.call(this, map);
    if (this.options['multipoint']) {
      handlers.push({
        enabled: this.options['multipoint'],
        handler: new Ld.Draw.MultiPoint(map, this.options['multipoint']),
        title: 'Place distributed nodes',
      });
    }
    return handlers;
  };
}
import { AppStore } from '../../store/app.store';
import {
  Location, LocationState, LOCATION_STATE_OPTIONS,
  ColonyMap, MapPlacement, Character, Asset,
  PlacementSubjectType, GeometryType, ColonySnapshot,
} from '../../core/models/types';
import { getAncestryImagePath } from '../../core/utils/ancestry-images';
import { ApiService } from '../../core/services/api.service';

import polylabel from '@mapbox/polylabel';

// Ray-casting point-in-polygon test for normalized [x,y] coords.
function pointInPolygon(px: number, py: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

// Returns the normalized area of a polygon ring (bounding box proxy for "specificity").
function polygonBboxArea(ring: [number, number][]): number {
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

// Compute pole-of-inaccessibility centroid for a placement (Point, MultiPoint, or Polygon).
function placementCentroid(placement: MapPlacement): [number, number] | null {
  try {
    const data = JSON.parse(placement.geometryData);
    if (placement.geometryType === 'Point') return data as [number, number];
    if (placement.geometryType === 'MultiPoint') {
      const pts = data as [number, number][];
      if (!pts.length) return null;
      const cx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
      const cy = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
      return [cx, cy];
    }
    if (placement.geometryType === 'Polygon') {
      // polylabel expects [ring, ...holes] where each ring is [[x,y],...]
      const ring = (data as [number, number][]).map(([x, y]) => [x, y]);
      return polylabel([ring]);
    }
  } catch { /* ignore */ }
  return null;
}

interface LocationFormModel {
  id: string; name: string; description: string;
  parentLocationId: string; state: LocationState; linkedAssetId: string;
  markerColor: string;
}

interface MapFormModel { name: string; imageWidth: number; imageHeight: number; }

const emptyForm = (): LocationFormModel => ({
  id: '', name: '', description: '', parentLocationId: '', state: 'Active', linkedAssetId: '',
  markerColor: '',
});

const toFormModel = (l: Location): LocationFormModel => ({
  id: l.id, name: l.name, description: l.description ?? '',
  parentLocationId: l.parentLocationId ?? '', state: l.state,
  linkedAssetId: l.linkedAssetId ?? '',
  markerColor: l.markerColor ?? '',
});

const fromFormModel = (fm: LocationFormModel): Location => ({
  id: fm.id, campaignId: '',
  name: fm.name.trim(),
  description: fm.description.trim() || undefined,
  parentLocationId: fm.parentLocationId || undefined,
  state: fm.state,
  linkedAssetId: fm.linkedAssetId || undefined,
  markerColor: fm.markerColor.trim() || undefined,
});

function normalizedToLatLng(x: number, y: number, mapHeight: number): L.LatLng {
  return L.latLng(-(y * mapHeight), x * mapHeight);
}

function latLngToNormalized(latlng: L.LatLng, mapHeight: number): [number, number] {
  return [latlng.lng / mapHeight, -latlng.lat / mapHeight];
}

const GEOMETRY_TYPE_COLORS: Record<string, string> = {
  Polygon:     '#f59e0b',
  MultiPoint:  '#a78bfa',
};

function resolveLocationColor(loc: Location, geometryType?: string): string {
  if (loc.markerColor) return loc.markerColor;
  if (geometryType && GEOMETRY_TYPE_COLORS[geometryType]) return GEOMETRY_TYPE_COLORS[geometryType];
  return '#60a5fa';
}

// Walk up the location hierarchy to find inherited placement on this map
function resolveEntityPlacement(
  entityLocationId: string | undefined,
  placements: MapPlacement[],
  locations: Location[],
  entityId: string,
  subjectType: PlacementSubjectType,
  mapId: string,
): MapPlacement | null {
  const direct = placements.find(
    p => p.mapId === mapId && p.subjectId === entityId && p.subjectType === subjectType,
  );
  if (direct) return direct;

  let locId = entityLocationId;
  while (locId) {
    const locPlacement = placements.find(
      p => p.mapId === mapId && p.subjectId === locId && p.subjectType === 'Location',
    );
    if (locPlacement) return { ...locPlacement, subjectId: entityId, subjectType };
    const loc = locations.find(l => l.id === locId);
    locId = loc?.parentLocationId;
  }
  return null;
}

registerMultiPointHandler();

interface PendingShape {
  layer: any;
  geometryType: GeometryType;
  geometryData: string;
}

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [NgTemplateOutlet, FormField, LeafletDirective, LeafletLayersDirective],
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
})
export class LocationsComponent implements OnDestroy {
  private zone = inject(NgZone);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  store = inject(AppStore);

  readonly stateOptions = LOCATION_STATE_OPTIONS;
  constructor() {
    toObservable(this.store.isViewingSnapshot)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isSnapshot => {
        if (isSnapshot) {
          this.detachDrawControl();
          if (this.leafletMap) this.attachSnapshotDrawControl();
        } else {
          this.detachSnapshotDrawControl();
          if (this.leafletMap) this.attachDrawControl();
        }
      });

    toObservable(this.currentMapId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshMapView());
  }

  // ── Location modal ────────────────────────────────────────────────────────

  readonly showModal = signal(false);
  readonly editForm = signal<LocationFormModel>(emptyForm());
  readonly f = form(this.editForm);

  // ── Map modal (add map from within edit modal) ────────────────────────────

  readonly showMapModal = signal(false);
  readonly mapForm = signal<MapFormModel>({ name: '', imageWidth: 2000, imageHeight: 2000 });

  // ── Map upload state ──────────────────────────────────────────────────────

  readonly uploadingMapId = signal('');

  // ── Placements modal ──────────────────────────────────────────────────────

  readonly showPlacementsModal = signal(false);

  // ── Accordion state ───────────────────────────────────────────────────────

  private collapsedIds = signal<Set<string>>(new Set());
  private assetsCollapsedIds = signal<Set<string>>(new Set());
  private charsCollapsedIds = signal<Set<string>>(new Set());

  isExpanded(id: string): boolean { return !this.collapsedIds().has(id); }
  isAssetsExpanded(id: string): boolean { return !this.assetsCollapsedIds().has(id); }
  isCharsExpanded(id: string): boolean { return !this.charsCollapsedIds().has(id); }

  toggleExpand(id: string): void {
    this.collapsedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleAssets(id: string): void {
    this.assetsCollapsedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleChars(id: string): void {
    this.charsCollapsedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── View toggle ───────────────────────────────────────────────────────────

  readonly viewMode = signal<'list' | 'map'>('map');

  // ── Layer visibility toggles ──────────────────────────────────────────────

  private readonly ALL_LAYER_TYPES = ['Zone', 'Point', 'Distributed', 'Character', 'Asset'] as const;
  readonly layerToggles: { key: string; label: string; icon: string }[] = [
    { key: 'Zone',        label: 'Zones',        icon: 'fa-draw-polygon' },
    { key: 'Point',       label: 'Locations',    icon: 'fa-location-dot' },
    { key: 'Distributed', label: 'Distributed',  icon: 'fa-share-nodes' },
    { key: 'Character',   label: 'Characters',   icon: 'fa-user' },
    { key: 'Asset',       label: 'Assets',       icon: 'fa-star' },
  ];
  readonly hiddenLayerTypes = signal<Set<string>>(new Set());

  // ── Movement trail visibility ─────────────────────────────────────────────
  // Tracks entity IDs whose trail is currently shown. Not persisted — resets on nav.
  readonly trailsEnabled = signal<Set<string>>(new Set());
  readonly allTrailsEnabled = signal(false);

  isTrailEnabled(entityId: string): boolean {
    return this.allTrailsEnabled() || this.trailsEnabled().has(entityId);
  }

  toggleTrail(entityId: string): void {
    this.trailsEnabled.update(s => {
      const n = new Set(s);
      n.has(entityId) ? n.delete(entityId) : n.add(entityId);
      return n;
    });
  }

  toggleAllTrails(): void { this.allTrailsEnabled.update(v => !v); }

  isLayerVisible(key: string): boolean { return !this.hiddenLayerTypes().has(key); }

  toggleLayerType(key: string): void {
    this.hiddenLayerTypes.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  // Navigation stack: array of map IDs, last = current
  readonly mapNavStack = signal<string[]>([]);

  readonly defaultMapId = computed(() => {
    const hero = this.store.colonyMaps().find(m => m.isHero);
    if (hero) return hero.id;
    const roots = this.store.viewLocations()
      .filter(l => !l.parentLocationId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const root of roots) {
      const m = this.store.colonyMaps().find(cm => cm.locationId === root.id);
      if (m) return m.id;
    }
    return this.store.colonyMaps()[0]?.id ?? '';
  });

  readonly currentMapId = computed(() => {
    const stack = this.mapNavStack();
    return stack.length > 0 ? stack[stack.length - 1] : this.defaultMapId();
  });

  readonly currentMap = computed(() =>
    this.store.colonyMaps().find(m => m.id === this.currentMapId()),
  );

  // Build breadcrumb by walking the current map's location ancestry upward.
  // The nav stack is used to resolve which ancestor maps to link to.
  readonly breadcrumbItems = computed(() => {
    const currentMapId = this.currentMapId();
    const allMaps = this.store.colonyMaps();
    const allLocs = this.store.viewLocations();
    const navStack = this.mapNavStack();

    const cm = allMaps.find(m => m.id === currentMapId);
    if (!cm) return [];

    // Walk location ancestry to build the chain from root → current
    const chain: { id: string; map: ColonyMap; loc: Location | undefined }[] = [];
    let locId = cm.locationId;
    const visited = new Set<string>();
    while (locId && !visited.has(locId)) {
      visited.add(locId);
      const loc = allLocs.find(l => l.id === locId);
      if (!loc) break;
      // Find the hero map for this location (fall back to first map)
      const locMaps = allMaps.filter(m => m.locationId === loc.id);
      const heroMap = locMaps.find(m => m.isHero) ?? locMaps[0];
      if (heroMap) {
        chain.unshift({ id: heroMap.id, map: heroMap, loc });
      }
      locId = loc.parentLocationId;
    }

    // Replace the last entry's map id with the actual current map
    // (the current map may not be the hero map)
    if (chain.length > 0) {
      chain[chain.length - 1] = { id: currentMapId, map: cm, loc: chain[chain.length - 1].loc };
    } else {
      chain.push({ id: currentMapId, map: cm, loc: undefined });
    }

    // Patch ancestor map ids from the nav stack where available
    // so breadcrumb links go back to where the user actually came from
    for (let i = 0; i < chain.length - 1 && i < navStack.length - 1; i++) {
      const stackMap = allMaps.find(m => m.id === navStack[i]);
      if (stackMap && stackMap.locationId === chain[i].loc?.id) {
        chain[i] = { ...chain[i], id: navStack[i], map: stackMap };
      }
    }

    return chain;
  });

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode.set(mode);
    if (mode === 'map') {
      this.mapNavStack.set([]);
    }
  }

  navigateToMap(mapId: string): void {
    this.viewMode.set('map');
    this.mapNavStack.set([mapId]);
    this.detachDrawControl();
  }

  navigateIntoMap(mapId: string): void {
    this.mapNavStack.update(s => [...s.length ? s : [this.defaultMapId()], mapId]);
    this.detachDrawControl();
  }

  // ── Leaflet ───────────────────────────────────────────────────────────────

  private leafletMap: L.Map | null = null;
  private imageOverlay: L.ImageOverlay | null = null;
  private drawControl: L.Control.Draw | null = null;
  private drawFeatureGroup: L.FeatureGroup | null = null;
  // Snapshot-mode draw control (separate instance so baseline & snapshot controls don't conflict)
  private snapDrawControl: L.Control.Draw | null = null;
  private snapDrawFeatureGroup: L.FeatureGroup | null = null;

  // Pending placement: shape drawn but entity not yet selected
  readonly pendingShape = signal<PendingShape | null>(null);
  readonly pendingSubjectType = signal<PlacementSubjectType>('Location');
  readonly pendingSubjectId = signal('');
  readonly pendingLocationId = signal('');

  // Location options for the placement panel: map root + any polygon placements containing the drawn point.
  readonly pendingLocationOptions = computed((): { id: string; name: string }[] => {
    const shape = this.pendingShape();
    const cm = this.currentMap();
    if (!shape || !cm) return [];

    // Map root option
    const rootLoc = cm.locationId ? this.store.viewLocations().find(l => l.id === cm.locationId) : undefined;
    const rootOption = rootLoc
      ? { id: rootLoc.id, name: rootLoc.name }
      : { id: cm.id, name: cm.name };

    // Extract a representative point from the drawn shape
    let px: number | null = null, py: number | null = null;
    try {
      if (shape.geometryType === 'Point') {
        [px, py] = JSON.parse(shape.geometryData) as [number, number];
      } else if (shape.geometryType === 'MultiPoint') {
        const pts = JSON.parse(shape.geometryData) as [number, number][];
        if (pts.length) { [px, py] = pts[0]; }
      } else if (shape.geometryType === 'Polygon') {
        const ring = JSON.parse(shape.geometryData) as [number, number][];
        if (ring.length) { [px, py] = ring[0]; }
      }
    } catch { /* ignore */ }

    if (px === null || py === null) return [rootOption];

    const placements = this.store.mapPlacements().filter(p => p.mapId === cm.id);
    const locs = this.store.viewLocations();

    const containingPolygons = placements
      .filter(p => p.subjectType === 'Location' && p.geometryType === 'Polygon' && p.subjectId !== rootOption.id)
      .filter(p => {
        try {
          const ring = JSON.parse(p.geometryData) as [number, number][];
          return pointInPolygon(px!, py!, ring);
        } catch { return false; }
      })
      .sort((a, b) => {
        try {
          return polygonBboxArea(JSON.parse(a.geometryData)) - polygonBboxArea(JSON.parse(b.geometryData));
        } catch { return 0; }
      });

    const polygonOptions = containingPolygons.map(p => {
      const loc = locs.find(l => l.id === p.subjectId);
      return { id: p.subjectId, name: loc?.name ?? p.subjectId };
    });

    return [rootOption, ...polygonOptions];
  });

  readonly leafletOptions = computed((): L.MapOptions => {
    const cm = this.currentMap();
    if (!cm) return {};
    return {
      crs: L.CRS.Simple, minZoom: -10, maxZoom: 4,
      zoomSnap: 0, zoomDelta: 0.5,
      center: L.latLng(-cm.imageHeight / 2, cm.imageWidth / 2),
      zoom: -3,
    };
  });

  readonly layers = computed((): L.Layer[] => {
    const cm = this.currentMap();
    if (!cm) return [];
    const hidden = this.hiddenLayerTypes();
    const snap = this.store.activeSnapshot();
    const placements = this.store.mapPlacements().filter(p => p.mapId === cm.id && !p.isHidden);
    const locs = this.store.viewLocations();
    const chars = this.store.viewCharacters();
    const assets = this.store.viewAssets();
    const h = cm.imageHeight;
    const result: L.Layer[] = [];

    const hasDirectPlacement = (subjectId: string, subjectType: PlacementSubjectType) => {
      // A placementOverride for this entity on the current map counts as a direct placement
      if (snap) {
        const ov = snap.placementOverrides[subjectId];
        if (ov === 'removed') return false;
        if (ov && ov.mapId === cm.id) return true;
      }
      return placements.some(p => p.subjectId === subjectId && p.subjectType === subjectType);
    };

    // Resolve a synthetic placement from placementOverrides if present for the current map
    const resolveOverridePlacement = (entityId: string, subjectType: PlacementSubjectType): MapPlacement | null => {
      if (!snap) return null;
      const ov = snap.placementOverrides[entityId];
      if (!ov || ov === 'removed' || ov.mapId !== cm.id) return null;
      return { id: `override-${entityId}`, mapId: cm.id, subjectType, subjectId: entityId, geometryType: ov.geometryType, geometryData: ov.geometryData, isHidden: false };
    };

    // Build a map of locationId → inherited chars/assets so location popups can list them
    const inheritedCharsByLoc = new Map<string, Character[]>();
    const inheritedAssetsByLoc = new Map<string, Asset[]>();

    // Walk the full ancestor chain and bucket each entity into every placed ancestor location
    const addToAllAncestors = <T>(
      map: Map<string, T[]>,
      entityLocId: string | undefined,
      entity: T,
    ) => {
      let locId = entityLocId;
      while (locId) {
        if (placements.some(p => p.mapId === cm.id && p.subjectId === locId && p.subjectType === 'Location')) {
          const list = map.get(locId) ?? [];
          list.push(entity);
          map.set(locId, list);
        }
        const loc = locs.find(l => l.id === locId);
        locId = loc?.parentLocationId;
      }
    };

    for (const char of chars) {
      const locId = snap ? snap.characterLocations[char.id] : char.locationId;
      if (!locId) continue;
      addToAllAncestors(inheritedCharsByLoc, locId, char);
    }

    for (const asset of assets) {
      if (hasDirectPlacement(asset.id, 'Asset')) continue;
      const locId = snap ? snap.assetLocations[asset.id] : asset.locationId;
      if (!locId) continue;
      addToAllAncestors(inheritedAssetsByLoc, locId, asset);
    }

    // Build location layers in two passes: areas first (rendered below), then points on top
    const buildLocLayer = (p: MapPlacement) => {
      const loc = locs.find(l => l.id === p.subjectId);
      if (!loc) return;

      const inheritedChars = inheritedCharsByLoc.get(loc.id) ?? [];
      const inheritedAssets = inheritedAssetsByLoc.get(loc.id) ?? [];
      const inheritedAssetIds = new Set(inheritedAssets.map(a => a.id));
      const childLocs = locs.filter(l => l.parentLocationId === loc.id &&
        (!l.linkedAssetId || !inheritedAssetIds.has(l.linkedAssetId)));
      const subMaps = this.store.colonyMaps().filter(m => m.locationId === loc.id);
      const hasSubMap = subMaps.length > 0;

      const locColor = resolveLocationColor(loc, p.geometryType);
      const isArea = p.geometryType === 'Polygon';

      const editBtn = !this.store.isViewingSnapshot()
        ? `<button class="leaflet-edit-btn" data-locid="${loc.id}" title="Edit location"><i class="fa-solid fa-pen"></i></button>`
        : '';
      let popupHtml = `<strong>${loc.name}${editBtn}</strong>`;
      const allItems = [
        ...childLocs.map(l => `<li style="color:#a78bfa">${l.name}</li>`),
        ...inheritedChars.map(c => `<li style="color:#f472b6">${c.name}</li>`),
        ...inheritedAssets.map(a => `<li style="color:#fb923c">${a.name}</li>`),
      ];
      if (allItems.length) {
        const MAX = 5;
        const visible = allItems.slice(0, MAX);
        const overflow = allItems.length - MAX;
        if (overflow > 0) visible.push(`<li style="color:var(--text-muted)">and ${overflow} more…</li>`);
        popupHtml += `<ul style="margin:0.3em 0 0;padding-left:1.1em">${visible.join('')}</ul>`;
      }

      const drillBtn = hasSubMap
        ? `<br><button class="btn btn-secondary leaflet-drill-btn" data-mapid="${(subMaps.find(m => m.isHero) ?? subMaps[0]).id}"><i class="fa-solid fa-map"></i> Open map</button>`
        : '';
      const finalPopup = popupHtml + drillBtn;

      result.push(...this.placementToLayers(p, loc.name, locColor, h, undefined, undefined, finalPopup, isArea));
    };

    // Pass 1: Zone areas (Polygon geometry) — largest first so smaller polygons render on top
    const polygonPlacements = placements
      .filter(p => p.subjectType === 'Location' && p.geometryType === 'Polygon')
      .sort((a, b) => polygonBboxArea(JSON.parse(b.geometryData)) - polygonBboxArea(JSON.parse(a.geometryData)));
    if (!hidden.has('Zone')) {
      for (const p of polygonPlacements) buildLocLayer(p);
    }

    // Pass 2: Point and Distributed — rendered on top of zones
    for (const p of placements) {
      if (p.subjectType !== 'Location') continue;
      if (p.geometryType === 'Polygon') continue;
      const toggleKey = p.geometryType === 'MultiPoint' ? 'Distributed' : 'Point';
      if (!hidden.has(toggleKey)) buildLocLayer(p);
    }

    const snapEdit = this.store.isViewingSnapshot();

    // Render only directly-placed characters and assets as their own layers
    for (const char of chars) {
      if (hidden.has('Character')) continue;
      if (!hasDirectPlacement(char.id, 'Character')) continue;
      const locId = snap ? snap.characterLocations[char.id] : char.locationId;
      const resolved = resolveOverridePlacement(char.id, 'Character')
        ?? resolveEntityPlacement(locId, placements, locs, char.id, 'Character', cm.id);
      if (!resolved) continue;
      const charPopup = `<strong>${char.name}</strong><br><a href="/characters/${char.id}">View detail</a>`;
      const layers = this.placementToLayers(resolved, char.name, '#f472b6', h, `/characters/${char.id}`, undefined, charPopup);
      if (snapEdit && snap) {
        layers.forEach(layer => {
          if (layer instanceof L.Marker) {
            layer.options.draggable = true;
            layer.dragging?.enable();
            layer.on('dragend', (e: any) => this.onEntityDragEnd(char.id, 'character', e.target.getLatLng()));
          }
        });
      }
      result.push(...layers);
    }

    for (const asset of assets) {
      if (hidden.has('Asset')) continue;
      if (!hasDirectPlacement(asset.id, 'Asset')) continue;
      const locId = snap ? snap.assetLocations[asset.id] : asset.locationId;
      const resolved = resolveOverridePlacement(asset.id, 'Asset')
        ?? resolveEntityPlacement(locId, placements, locs, asset.id, 'Asset', cm.id);
      if (!resolved) continue;
      const assetPopup = `<strong>${asset.name}</strong>`;
      const layers = this.placementToLayers(resolved, asset.name, '#fb923c', h, undefined, undefined, assetPopup);
      if (snapEdit && snap) {
        layers.forEach(layer => {
          if (layer instanceof L.Marker) {
            layer.options.draggable = true;
            layer.dragging?.enable();
            layer.on('dragend', (e: any) => this.onEntityDragEnd(asset.id, 'asset', e.target.getLatLng()));
          }
        });
      }
      result.push(...layers);
    }

    // ── Movement trails ───────────────────────────────────────────────────────
    const allSnaps = this.store.colonySnapshots();
    const baseChars = this.store.characters();
    const baseAssets = this.store.assets();
    const allLocs = this.store.locations();
    const allPlacements = this.store.mapPlacements();

    const resolvePositionOnMap = (entityId: string, isChar: boolean, snapShot: ColonySnapshot): [number, number] | null => {
      const ov = snapShot.placementOverrides[entityId];
      if (ov && ov !== 'removed' && ov.mapId === cm.id) {
        try {
          const d = JSON.parse(ov.geometryData);
          if (ov.geometryType === 'Point') return d as [number, number];
        } catch { /* skip */ }
      }
      const locId = isChar ? snapShot.characterLocations[entityId] : snapShot.assetLocations[entityId];
      const mapPlacements = allPlacements.filter(p => p.mapId === cm.id);
      const resolved = resolveEntityPlacement(locId, mapPlacements, allLocs, entityId, isChar ? 'Character' : 'Asset', cm.id);
      if (!resolved) return null;
      const centroid = placementCentroid(resolved);
      return centroid;
    };

    const buildTrail = (entityId: string, color: string, isChar: boolean): void => {
      // When viewing a snapshot, only show trail up to and including that session
      const currentSnapIdx = snap ? allSnaps.findIndex(s => s.sessionId === snap.sessionId) : -1;
      const trailSnaps = currentSnapIdx >= 0 ? allSnaps.slice(0, currentSnapIdx + 1) : allSnaps;
      const positions: ([number, number] | null)[] = trailSnaps.map(s => resolvePositionOnMap(entityId, isChar, s));

      // One polyline per consecutive session pair so each step can be faded independently
      const steps: [[number, number], [number, number]][] = [];
      for (let i = 0; i < positions.length - 1; i++) {
        const a = positions[i];
        const b = positions[i + 1];
        if (!a || !b) continue;
        if (a[0].toFixed(5) === b[0].toFixed(5) && a[1].toFixed(5) === b[1].toFixed(5)) continue;
        steps.push([a, b]);
      }

      const totalSteps = steps.length;
      steps.forEach((step, si) => {
        const opacity = Math.max(0.1, (si + 1) / totalSteps);
        const latlngs = step.map(([x, y]) => normalizedToLatLng(x, y, h));
        result.push(L.polyline(latlngs, { color, weight: 2, opacity, interactive: false }));
      });
    };

    if (snap && (this.allTrailsEnabled() || this.trailsEnabled().size > 0)) {
      for (const char of baseChars) {
        if (!this.isTrailEnabled(char.id)) continue;
        buildTrail(char.id, '#f472b6', true);
      }
      for (const asset of baseAssets) {
        if (!this.isTrailEnabled(asset.id)) continue;
        buildTrail(asset.id, '#fb923c', false);
      }
    }

    return result;
  });

  private placementToLayers(
    p: MapPlacement, label: string, color: string, h: number,
    linkPath?: string, onClick?: () => void, popupHtml?: string, isArea = false,
  ): L.Layer[] {
    try {
      const data = JSON.parse(p.geometryData);
      const defaultPopup = popupHtml ?? (linkPath
        ? `<strong>${label}</strong><br><a href="${linkPath}">View detail</a>`
        : `<strong>${label}</strong>`);
      if (p.geometryType === 'Point') {
        const [x, y] = data as [number, number];
        const isCharacter = linkPath?.startsWith('/characters');
        const iconHtml = isCharacter
          ? `<i class="fa-solid fa-user leaflet-marker-character" style="color:${color}"></i>`
          : `<i class="fa-solid fa-location-dot leaflet-marker-poi" style="color:${color}"></i>`;
        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconAnchor: isCharacter ? [8, 8] : [7, 20],
          iconSize: isCharacter ? [16, 16] : [14, 20],
          popupAnchor: [0, isCharacter ? -10 : -22],
        });
        const m = L.marker(normalizedToLatLng(x, y, h), { icon });
        if (onClick) {
          m.on('click', onClick);
        } else {
          m.bindPopup(defaultPopup);
        }
        return [m];
      } else if (p.geometryType === 'MultiPoint') {
        const points = data as [number, number][];
        return points.map(([x, y]) => {
          const m = L.circleMarker(normalizedToLatLng(x, y, h), {
            radius: 6, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.8, opacity: 0.8,
          });
          if (onClick) {
            m.on('click', onClick);
          } else {
            m.bindPopup(defaultPopup);
          }
          return m;
        });
      } else if (p.geometryType === 'Polygon') {
        const coords = (data as [number, number][]).map(([x, y]) => normalizedToLatLng(x, y, h));
        const fillOpacity = isArea ? 0.08 : 0.15;
        const weight = isArea ? 1.5 : 2;
        const poly = L.polygon(coords, { color, fillColor: color, fillOpacity, weight });
        if (isArea) {
          poly.on('mouseover', () => poly.setStyle({ weight: 3, fillOpacity: 0.18 }));
          poly.on('mouseout',  () => poly.setStyle({ weight: 1.5, fillOpacity: 0.08 }));
        }
        if (onClick) {
          poly.on('click', onClick);
        } else {
          poly.bindPopup(defaultPopup);
        }
        return [poly];
      }
    } catch { /* malformed geometry — skip */ }
    return [];
  }

  onMapReady(map: L.Map): void {
    this.leafletMap = map;
    this.refreshMapView();
    // Delegate drill-in button clicks inside popups back into Angular
    map.on('popupopen', (e: any) => {
      const container: HTMLElement = e.popup.getElement();
      container.querySelectorAll<HTMLButtonElement>('.leaflet-drill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mapId = btn.dataset['mapid'];
          if (mapId) this.zone.run(() => this.navigateIntoMap(mapId));
        });
      });
      container.querySelectorAll<HTMLButtonElement>('.leaflet-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const locId = btn.dataset['locid'];
          const loc = this.store.locations().find(l => l.id === locId);
          if (loc) this.zone.run(() => this.openEdit(loc));
        });
      });
    });

    if (!this.store.isViewingSnapshot()) {
      this.attachDrawControl();
    }
  }

  private refreshMapView(): void {
    const map = this.leafletMap;
    const cm = this.currentMap();
    if (!map || !cm) return;
    const bounds = L.latLngBounds(L.latLng(-cm.imageHeight, 0), L.latLng(0, cm.imageWidth));
    this.zone.runOutsideAngular(() => {
      if (this.imageOverlay) { this.imageOverlay.remove(); this.imageOverlay = null; }
      if (cm.imagePath) {
        this.imageOverlay = L.imageOverlay(cm.imagePath, bounds).addTo(map);
      }
      const size = map.getSize();
      const fillZoom = Math.log2(Math.max(size.x / cm.imageWidth, size.y / cm.imageHeight));
      map.setView(bounds.getCenter(), fillZoom, { animate: false });
      map.setMinZoom(fillZoom - 2);
      map.setMaxBounds(bounds);
    });
  }

  private attachDrawControl(): void {
    const map = this.leafletMap;
    if (!map || this.drawControl) return;
    this.zone.runOutsideAngular(() => {
      this.drawFeatureGroup = new L.FeatureGroup().addTo(map);
      this.drawControl = new (L.Control as any).Draw({
        draw: {
          marker: false,
          circlemarker: { color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.9, radius: 7 },
          circle: false, rectangle: false, polyline: false,
          polygon: {
            allowIntersection: false,
            shapeOptions: { color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.15 },
          },
          multipoint: {},
        },
        edit: { featureGroup: this.drawFeatureGroup, edit: false, remove: false },
      });
      map.addControl(this.drawControl!);
      map.on((L as any).Draw.Event.CREATED, this.onDrawCreated);
    });
  }

  private detachDrawControl(): void {
    const map = this.leafletMap;
    if (!map) return;
    if (this.drawControl) { map.removeControl(this.drawControl); this.drawControl = null; }
    if (this.drawFeatureGroup) { this.drawFeatureGroup.remove(); this.drawFeatureGroup = null; }
    map.off((L as any).Draw.Event.CREATED, this.onDrawCreated);
  }

  private attachSnapshotDrawControl(): void {
    const map = this.leafletMap;
    if (!map || this.snapDrawControl) return;
    this.zone.runOutsideAngular(() => {
      this.snapDrawFeatureGroup = new L.FeatureGroup().addTo(map);
      this.snapDrawControl = new (L.Control as any).Draw({
        draw: {
          marker: false,
          circlemarker: { color: '#f472b6', fillColor: '#f472b6', fillOpacity: 0.9, radius: 7 },
          circle: false, rectangle: false, polyline: false,
          polygon: false,
          multipoint: {},
        },
        edit: { featureGroup: this.snapDrawFeatureGroup, edit: false, remove: false },
      });
      map.addControl(this.snapDrawControl!);
      map.on((L as any).Draw.Event.CREATED, this.onSnapDrawCreated);
    });
  }

  private detachSnapshotDrawControl(): void {
    const map = this.leafletMap;
    if (!map) return;
    if (this.snapDrawControl) { map.removeControl(this.snapDrawControl); this.snapDrawControl = null; }
    if (this.snapDrawFeatureGroup) { this.snapDrawFeatureGroup.remove(); this.snapDrawFeatureGroup = null; }
    map.off((L as any).Draw.Event.CREATED, this.onSnapDrawCreated);
  }

  private onSnapDrawCreated = (event: any): void => {
    this.zone.run(() => {
      const snap = this.store.activeSnapshot();
      const cm = this.currentMap();
      if (!snap || !cm) return;
      const h = cm.imageHeight;
      let geometryType: GeometryType = 'Point';
      let geometryData = '[]';

      if (event.layerType === 'multipoint') {
        const latlngs: L.LatLng[] = event.layer._multiPointLatLngs ?? [];
        geometryType = 'MultiPoint';
        geometryData = JSON.stringify(latlngs.map((ll: L.LatLng) => latLngToNormalized(ll, h)));
      } else if (event.layer instanceof L.CircleMarker && !(event.layer instanceof L.Circle)) {
        const [nx, ny] = latLngToNormalized(event.layer.getLatLng(), h);
        geometryType = 'Point';
        geometryData = JSON.stringify([nx, ny]);
      }

      if (this.snapDrawFeatureGroup) this.snapDrawFeatureGroup.addLayer(event.layer);

      this.pendingShape.set({ layer: event.layer, geometryType, geometryData });
      this.pendingSubjectType.set('Character');
      this.pendingSubjectId.set('');
      this.pendingLocationId.set('');
    });
  };

  // Called after drag: resolves location by containment then writes synthetic effects.
  private onEntityDragEnd(entityId: string, entityType: 'character' | 'asset', latlng: L.LatLng): void {
    const snap = this.store.activeSnapshot();
    const cm = this.currentMap();
    if (!snap || !cm) return;

    const h = cm.imageHeight;
    const [nx, ny] = latLngToNormalized(latlng, h);
    const placements = this.store.mapPlacements().filter(p => p.mapId === cm.id);
    const locs = this.store.viewLocations();

    // Find the most-specific containing polygon (smallest bbox area)
    const containingPolygons = placements
      .filter(p => p.subjectType === 'Location' && p.geometryType === 'Polygon')
      .filter(p => {
        try {
          const ring = JSON.parse(p.geometryData) as [number, number][];
          return pointInPolygon(nx, ny, ring);
        } catch { return false; }
      });

    let newLocationId: string;
    if (containingPolygons.length > 0) {
      const best = containingPolygons.reduce((a, b) => {
        try {
          const aArea = polygonBboxArea(JSON.parse(a.geometryData));
          const bArea = polygonBboxArea(JSON.parse(b.geometryData));
          return aArea <= bArea ? a : b;
        } catch { return a; }
      });
      newLocationId = best.subjectId;
    } else {
      newLocationId = cm.locationId ?? '';
    }

    const placementValue = JSON.stringify({ mapId: cm.id, geometryType: 'Point', geometryData: JSON.stringify([nx, ny]) });

    const writes = [
      this.api.upsertMapEdit({ sessionId: snap.sessionId, targetType: entityType, targetId: entityId, property: 'mapPlacement', value: placementValue }),
    ];
    if (newLocationId) {
      writes.push(this.api.upsertMapEdit({ sessionId: snap.sessionId, targetType: entityType, targetId: entityId, property: 'locationChange', value: newLocationId }));
    }

    // Fire all writes then reload sessions so snapshot recomputes
    let pending = writes.length;
    const done = () => { if (--pending === 0) this.zone.run(() => this.store.loadSessions()); };
    writes.forEach(obs => obs.subscribe({ next: done, error: done }));
  }

  confirmSnapshotPlacement(): void {
    const shape = this.pendingShape();
    const snap = this.store.activeSnapshot();
    const cm = this.currentMap();
    const entityId = this.pendingSubjectId();
    const entityType = this.pendingSubjectType() === 'Asset' ? 'asset' : 'character';
    if (!shape || !snap || !cm || !entityId) return;

    const opts = this.pendingLocationOptions();
    const selectedLocationId = this.pendingLocationId() || (opts.length > 0 ? opts[0].id : cm.locationId ?? '');

    const placementValue = JSON.stringify({ mapId: cm.id, geometryType: shape.geometryType, geometryData: shape.geometryData });

    this.api.upsertMapEdit({
      sessionId: snap.sessionId,
      targetType: entityType,
      targetId: entityId,
      property: 'mapPlacement',
      value: placementValue,
    }).subscribe(() => this.store.loadSessions());

    if (selectedLocationId) {
      this.api.upsertMapEdit({
        sessionId: snap.sessionId,
        targetType: entityType,
        targetId: entityId,
        property: 'locationChange',
        value: selectedLocationId,
      }).subscribe();
    }

    if (this.snapDrawFeatureGroup && shape.layer) {
      this.snapDrawFeatureGroup.removeLayer(shape.layer);
    }
    this.discardPendingShape();
  }

  private onDrawCreated = (event: any): void => {
    this.zone.run(() => {
      const cm = this.currentMap();
      if (!cm) return;
      const h = cm.imageHeight;
      let geometryType: GeometryType = 'Point';
      let geometryData = '[]';

      if (event.layerType === 'multipoint') {
        const latlngs: L.LatLng[] = event.layer._multiPointLatLngs ?? [];
        geometryType = 'MultiPoint';
        geometryData = JSON.stringify(latlngs.map((ll: L.LatLng) => latLngToNormalized(ll, h)));
      } else if (event.layer instanceof L.CircleMarker && !(event.layer instanceof L.Circle)) {
        const [nx, ny] = latLngToNormalized(event.layer.getLatLng(), h);
        geometryType = 'Point';
        geometryData = JSON.stringify([nx, ny]);
      } else if (event.layer instanceof L.Polygon) {
        const latlngs = event.layer.getLatLngs()[0] as L.LatLng[];
        geometryData = JSON.stringify(latlngs.map(ll => latLngToNormalized(ll, h)));
        geometryType = 'Polygon';
      }

      // Add preview layer to feature group so user sees it while picking entity
      if (this.drawFeatureGroup) {
        this.drawFeatureGroup.addLayer(event.layer);
      }

      this.pendingShape.set({ layer: event.layer, geometryType, geometryData });
      this.pendingSubjectType.set('Location');
      this.pendingSubjectId.set('');
      this.pendingLocationId.set('');
    });
  };

  confirmPlacement(): void {
    const shape = this.pendingShape();
    const cm = this.currentMap();
    let subjectId = this.pendingSubjectId();
    let subjectType = this.pendingSubjectType();
    if (!shape || !cm || !subjectId) return;

    // Resolve the selected location (fall back to the map's root location).
    const opts = this.pendingLocationOptions();
    const selectedLocationId = this.pendingLocationId() || (opts.length > 0 ? opts[0].id : cm.locationId ?? '');

    // If an Asset is the linkedAsset of a Location, record the placement as
    // that Location instead so children-placed counts and markers stay consistent.
    if (subjectType === 'Asset') {
      const linkedLocation = this.store.locations().find(l => l.linkedAssetId === subjectId);
      if (linkedLocation) {
        subjectId = linkedLocation.id;
        subjectType = 'Location';
      }
    }

    this.store.saveMapPlacement({
      id: '', mapId: cm.id,
      subjectType,
      subjectId,
      geometryType: shape.geometryType,
      geometryData: shape.geometryData,
      isHidden: false,
    });

    if (subjectType === 'Character' && selectedLocationId) {
      const char = this.store.characters().find(c => c.id === subjectId);
      if (char) this.store.saveCharacter({ ...char, locationId: selectedLocationId });
    } else if (subjectType === 'Asset' && selectedLocationId) {
      // subjectId was rewritten to the linked location above — no-op here
    } else if (this.pendingSubjectType() === 'Asset' && selectedLocationId) {
      const asset = this.store.assets().find(a => a.id === this.pendingSubjectId());
      if (asset) this.store.saveAsset({ ...asset, locationId: selectedLocationId });
    } else if (this.pendingSubjectType() === 'Location' && selectedLocationId) {
      // Placing a location: update its parentLocationId to the selected containing location,
      // unless the selected location IS the placed location itself.
      if (selectedLocationId !== subjectId) {
        const loc = this.store.locations().find(l => l.id === subjectId);
        if (loc) this.store.saveLocation({ ...loc, parentLocationId: selectedLocationId });
      }
    }

    this.discardPendingShape();
  }

  discardPendingShape(): void {
    const shape = this.pendingShape();
    if (shape && this.drawFeatureGroup) {
      this.drawFeatureGroup.removeLayer(shape.layer);
    }
    this.pendingShape.set(null);
    this.pendingSubjectId.set('');
    this.pendingLocationId.set('');
  }

  // ── Placements for current map ────────────────────────────────────────────

  readonly placementsForCurrentMap = computed(() =>
    this.store.mapPlacements().filter(p => p.mapId === this.currentMapId()),
  );

  subjectLabel(p: MapPlacement): string {
    if (p.subjectType === 'Location') return this.store.locations().find(l => l.id === p.subjectId)?.name ?? p.subjectId;
    if (p.subjectType === 'Character') return this.store.characters().find(c => c.id === p.subjectId)?.name ?? p.subjectId;
    if (p.subjectType === 'Asset') return this.store.assets().find(a => a.id === p.subjectId)?.name ?? p.subjectId;
    return p.subjectId;
  }

  deletePlacement(id: string): void {
    if (!confirm('Remove this placement?')) return;
    this.store.deleteMapPlacement(id);
  }

  // ── Map context stats ─────────────────────────────────────────────────────

  readonly currentMapChildrenPlaced = computed(() => {
    const cm = this.currentMap();
    if (!cm?.locationId) return { placed: 0, total: 0 };
    return this.childrenPlacedCount(cm.locationId);
  });

  // ── List helpers ──────────────────────────────────────────────────────────

  readonly parentOptions = computed(() =>
    this.store.viewLocations()
      .filter(l => l.id !== this.editForm().id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly rootLocations = computed(() =>
    this.store.viewLocations()
      .filter(l => !l.parentLocationId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  // Flat list of {loc, depth, isLast, continuations} in tree order, honouring collapse state.
  // continuations[i] = true means depth column i has more siblings below this row (draw a vertical pipe).
  readonly visibleLocations = computed(() => {
    const result: { loc: Location; depth: number; isLast: boolean; continuations: boolean[] }[] = [];
    const collapsed = this.collapsedIds();
    const recurse = (parentId: string | undefined, depth: number, continuations: boolean[]) => {
      const children = this.store.viewLocations()
        .filter(l => (l.parentLocationId || undefined) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (let i = 0; i < children.length; i++) {
        const loc = children[i];
        const isLast = i === children.length - 1;
        result.push({ loc, depth, isLast, continuations: continuations.slice(1) });
        if (!collapsed.has(loc.id)) {
          recurse(loc.id, depth + 1, [...continuations, !isLast]);
        }
      }
    };
    recurse(undefined, 0, []);
    return result;
  });

  childrenOf(parentId: string): Location[] {
    return this.store.viewLocations()
      .filter(l => l.parentLocationId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  descendantIdsOf(locationId: string): Set<string> {
    const result = new Set<string>();
    const queue = [locationId];
    const all = this.store.viewLocations();
    while (queue.length) {
      const id = queue.pop()!;
      for (const l of all) {
        if (l.parentLocationId === id) {
          result.add(l.id);
          queue.push(l.id);
        }
      }
    }
    return result;
  }

  mapsForLocation(locationId: string): ColonyMap[] {
    return this.store.colonyMaps()
      .filter(m => m.locationId === locationId)
      .sort((a, b) => (b.isHero ? 1 : 0) - (a.isHero ? 1 : 0) || a.name.localeCompare(b.name));
  }

  childrenPlacedCount(locationId: string): { placed: number; total: number } {
    const childIds = this.childrenOf(locationId).map(c => c.id);
    if (!childIds.length) return { placed: 0, total: 0 };
    const placements = this.store.mapPlacements();
    const placed = childIds.filter(id =>
      placements.some(p => p.subjectId === id && p.subjectType === 'Location'),
    ).length;
    return { placed, total: childIds.length };
  }

  hasPlacementOnParentMap(loc: Location): boolean {
    if (!loc.parentLocationId) return false;
    const parentMaps = this.store.colonyMaps()
      .filter(m => m.locationId === loc.parentLocationId).map(m => m.id);
    return this.store.mapPlacements()
      .some(p => p.subjectId === loc.id && p.subjectType === 'Location' && parentMaps.includes(p.mapId));
  }

  assetsAt(loc: Location): { asset: Asset; inherited: boolean }[] {
    const assets = this.store.viewAssets();
    const descendantIds = this.descendantIdsOf(loc.id);
    const allLocs = this.store.viewLocations();
    const descendantLinkedAssetIds = new Set(
      allLocs
        .filter(l => descendantIds.has(l.id) && !!l.linkedAssetId)
        .map(l => l.linkedAssetId as string),
    );
    const childLinkedAssetIds = new Set(
      this.childrenOf(loc.id)
        .map(c => c.linkedAssetId)
        .filter((id): id is string => !!id),
    );
    const result: { asset: Asset; inherited: boolean }[] = [];
    for (const a of assets) {
      if (a.id === loc.linkedAssetId) continue;
      if (a.locationId === loc.id || childLinkedAssetIds.has(a.id)) {
        result.push({ asset: a, inherited: false });
      } else if (descendantIds.has(a.locationId ?? '') || descendantLinkedAssetIds.has(a.id)) {
        result.push({ asset: a, inherited: true });
      }
    }
    return result;
  }

  charactersAt(loc: Location): { character: Character; inherited: boolean }[] {
    const descendantIds = this.descendantIdsOf(loc.id);
    return this.store.viewCharacters()
      .filter(c => c.locationId === loc.id || descendantIds.has(c.locationId ?? ''))
      .map(c => ({ character: c, inherited: c.locationId !== loc.id }));
  }

  characterPortrait(c: Character): string {
    return c.portraitPath ?? getAncestryImagePath(c.ancestry, c.gender);
  }

  private static readonly ASSET_TYPE_ICONS: Record<string, string> = {
    Infrastructure: 'fa-duotone fa-landmark',
    Artifact:       'fa-duotone fa-ring',
    Resource:       'fa-duotone fa-treasure-chest',
    Intelligence:   'fa-duotone fa-scroll-old',
  };

  assetTypeIcon(asset: Asset): string {
    return LocationsComponent.ASSET_TYPE_ICONS[asset.type] ?? 'fa-solid fa-star';
  }

  pendingAdditionIcon(p: { type: 'character' | 'asset'; assetType?: string }): string {
    if (p.type === 'character') return 'fa-solid fa-user';
    return LocationsComponent.ASSET_TYPE_ICONS[p.assetType ?? ''] ?? 'fa-solid fa-star';
  }

  linkedAsset(loc: Location): Asset | undefined {
    return loc.linkedAssetId ? this.store.assets().find(a => a.id === loc.linkedAssetId) : undefined;
  }

  stateClass(state: LocationState): string {
    const map: Record<LocationState, string> = {
      Active: 'state-active', Abandoned: 'state-abandoned',
      Ruined: 'state-ruined', Unknown: 'state-unknown',
    };
    return map[state];
  }

  // ── Modal actions ─────────────────────────────────────────────────────────

  openAdd(parentLocationId?: string): void {
    this.editForm.set({ ...emptyForm(), parentLocationId: parentLocationId ?? '' });
    this.modalEntityType.set('character');
    this.modalEntityId.set('');
    this.modalPendingAdditions.set([]);
    this.showModal.set(true);
  }

  openEdit(location: Location): void {
    this.editForm.set(toFormModel(location));
    this.modalEntityType.set('character');
    this.modalEntityId.set('');
    this.modalPendingAdditions.set([]);
    this.showModal.set(true);
  }

  openEditCurrentMap(): void {
    const cm = this.currentMap();
    if (!cm?.locationId) return;
    const loc = this.store.viewLocations().find(l => l.id === cm.locationId);
    if (loc) this.openEdit(loc);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.showMapModal.set(false);
    this.modalPendingAdditions.set([]);
  }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    this.store.saveLocation(fromFormModel(fm));
    // Apply pending entity additions
    for (const addition of this.modalPendingAdditions()) {
      this.assignEntityToLocation(addition.id, addition.type, fm.id || '');
    }
    this.modalPendingAdditions.set([]);
    this.showModal.set(false);
  }

  delete(id: string): void {
    if (this.childrenOf(id).length > 0) {
      alert('Remove child locations before deleting this location.');
      return;
    }
    if (!confirm('Delete this location?')) return;
    this.store.deleteLocation(id);
  }

  // ── Map management (within edit modal) ───────────────────────────────────

  openAddMap(): void {
    this.mapForm.set({ name: '', imageWidth: 2000, imageHeight: 2000 });
    this.showMapModal.set(true);
  }

  closeMapModal(): void { this.showMapModal.set(false); }

  saveMap(): void {
    const mf = this.mapForm();
    const locationId = this.editForm().id;
    if (!mf.name.trim() || !locationId) return;
    this.store.saveColonyMap({
      id: '', campaignId: '', name: mf.name.trim(),
      locationId, imageWidth: Number(mf.imageWidth),
      imageHeight: Number(mf.imageHeight), isHero: false,
    });
    this.showMapModal.set(false);
  }

  deleteMap(id: string): void {
    if (!confirm('Remove this map?')) return;
    this.store.deleteColonyMap(id);
  }

  toggleHero(map: ColonyMap): void {
    this.store.saveColonyMap({ ...map, isHero: !map.isHero });
  }

  uploadMapImage(event: Event, map: ColonyMap): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingMapId.set(map.id);
    this.api.uploadMapImage(file).subscribe({
      next: ({ path }) => { this.store.saveColonyMap({ ...map, imagePath: path }); this.uploadingMapId.set(''); },
      error: () => this.uploadingMapId.set(''),
    });
  }

  // ── Entity-to-location assignment ────────────────────────────────────────

  // ── Modal entity management ───────────────────────────────────────────────

  readonly modalEntityType = signal<'character' | 'asset'>('character');
  readonly modalEntityId = signal('');
  readonly modalPendingAdditions = signal<{ id: string; type: 'character' | 'asset'; name: string; assetType?: string }[]>([]);

  readonly modalCurrentEntities = computed(() => {
    const locId = this.editForm().id;
    if (!locId) return { characters: [] as Character[], assets: [] as Asset[] };
    return {
      characters: this.store.viewCharacters().filter(c => c.locationId === locId),
      assets: this.store.viewAssets().filter(a => a.locationId === locId && a.id !== this.editForm().linkedAssetId),
    };
  });

  readonly modalEntityOptions = computed(() => {
    const locId = this.editForm().id;
    const type = this.modalEntityType();
    const pendingIds = new Set(this.modalPendingAdditions().filter(p => p.type === type).map(p => p.id));
    if (type === 'character') {
      return this.store.viewCharacters()
        .filter(c => c.locationId !== locId && !pendingIds.has(c.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return this.store.viewAssets()
        .filter(a => a.locationId !== locId && !pendingIds.has(a.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  addModalEntity(): void {
    const id = this.modalEntityId();
    const type = this.modalEntityType();
    if (!id) return;
    if (type === 'character') {
      const name = this.store.viewCharacters().find(c => c.id === id)?.name ?? id;
      this.modalPendingAdditions.update(list => [...list, { id, type, name }]);
    } else {
      const asset = this.store.viewAssets().find(a => a.id === id);
      this.modalPendingAdditions.update(list => [...list, { id, type, name: asset?.name ?? id, assetType: asset?.type }]);
    }
    this.modalEntityId.set('');
  }

  removeModalPendingAddition(id: string): void {
    this.modalPendingAdditions.update(list => list.filter(p => p.id !== id));
  }

  assignEntityToLocation(entityId: string, entityType: 'character' | 'asset', locationId: string): void {
    const snap = this.store.activeSnapshot();
    const subjectType: PlacementSubjectType = entityType === 'character' ? 'Character' : 'Asset';

    if (snap) {
      const writes = [
        this.api.upsertMapEdit({
          sessionId: snap.sessionId, targetType: entityType, targetId: entityId,
          property: 'locationChange', value: locationId,
        }),
      ];
      // Also place at centroid on the current map if the location has a placement there
      const cm = this.currentMap();
      if (cm) {
        const locPlacement = this.store.mapPlacements().find(
          p => p.mapId === cm.id && p.subjectId === locationId && p.subjectType === 'Location',
        );
        if (locPlacement) {
          const centroid = placementCentroid(locPlacement);
          if (centroid) {
            writes.push(this.api.upsertMapEdit({
              sessionId: snap.sessionId, targetType: entityType, targetId: entityId,
              property: 'mapPlacement',
              value: JSON.stringify({ mapId: cm.id, geometryType: 'Point', geometryData: JSON.stringify(centroid) }),
            }));
          }
        }
      }
      let pending = writes.length;
      const done = () => { if (--pending === 0) this.zone.run(() => this.store.loadSessions()); };
      writes.forEach(obs => obs.subscribe({ next: done, error: done }));
    } else {
      // Baseline: update locationId
      if (entityType === 'character') {
        const char = this.store.characters().find(c => c.id === entityId);
        if (char) this.store.saveCharacter({ ...char, locationId });
      } else {
        const asset = this.store.assets().find(a => a.id === entityId);
        if (asset) this.store.saveAsset({ ...asset, locationId });
      }
      // Place at centroid on every map where this location has a placement
      const locPlacements = this.store.mapPlacements().filter(
        p => p.subjectId === locationId && p.subjectType === 'Location',
      );
      for (const locPlacement of locPlacements) {
        const centroid = placementCentroid(locPlacement);
        if (centroid) {
          this.store.saveMapPlacement({
            id: '', mapId: locPlacement.mapId, subjectType, subjectId: entityId,
            geometryType: 'Point', geometryData: JSON.stringify(centroid), isHidden: false,
          });
        }
      }
    }
  }

  removeEntityFromLocation(entityId: string, entityType: 'character' | 'asset'): void {
    const snap = this.store.activeSnapshot();
    if (snap) {
      this.api.upsertMapEdit({
        sessionId: snap.sessionId,
        targetType: entityType,
        targetId: entityId,
        property: 'locationChange',
        value: null,
      }).subscribe(() => this.store.loadSessions());
    } else {
      if (entityType === 'character') {
        const char = this.store.characters().find(c => c.id === entityId);
        if (char) this.store.saveCharacter({ ...char, locationId: undefined });
      } else {
        const asset = this.store.assets().find(a => a.id === entityId);
        if (asset) this.store.saveAsset({ ...asset, locationId: undefined });
      }
      const subjectType = entityType === 'character' ? 'Character' : 'Asset';
      const toRemove = this.store.mapPlacements().filter(
        p => p.subjectId === entityId && p.subjectType === subjectType,
      );
      for (const p of toRemove) this.store.deleteMapPlacement(p.id);
    }
  }

  ngOnDestroy(): void {
    this.detachDrawControl();
    this.imageOverlay?.remove();
  }
}
