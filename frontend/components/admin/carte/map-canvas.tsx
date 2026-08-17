"use client";

import {
  Map as MaplibreMap,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack ne réécrit pas le new URL(…, import.meta.url) interne du bundle
// maplibre : l'URL du worker sort vide et aucune tuile vectorielle ne charge
// (fond gris, zéro requête). Le worker et son unique dépendance sont servis
// depuis public/maplibre/, copiés depuis node_modules par les hooks
// predev/prebuild (sync:maplibre) — jamais désynchronisés du paquet.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
import { useEffect, useRef, useState } from "react";
import {
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_STYLE_URL,
  MAP_VIEWPORT_STORAGE_KEY,
  STATUS_ORDER,
} from "@/lib/admin/constants";
import { STATUS_MAP_COLORS } from "@/lib/admin/status";
import type { GeoPoint, LeadLite } from "@/lib/admin/types";

/*
 * Une seule instance MapLibre, créée au montage et jamais recréée : les
 * données arrivent par setData sur la source GeoJSON. Marqueurs en couche
 * circle (pas de nœuds DOM : des milliers de points restent fluides sur
 * mobile), clustering natif de la source.
 */

interface Viewport {
  center: [number, number];
  zoom: number;
}

function savedViewport(): Viewport {
  try {
    const raw = localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Viewport;
  } catch {
    // Valeur illisible : on repart du cadre par défaut.
  }
  return { center: MAP_DEFAULT_CENTER, zoom: MAP_DEFAULT_ZOOM };
}

function toFeatureCollection(leads: LeadLite[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: leads
      .filter((lead) => lead.lat !== null && lead.lng !== null)
      .map((lead) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [lead.lng as number, lead.lat as number],
        },
        properties: { id: lead.restaurantId, status: lead.status },
      })),
  };
}

// Le spread ne rentre pas dans le type tuple d'ExpressionSpecification :
// la forme ["match", entrée, libellé1, sortie1, …, défaut] est pourtant valide.
const statusColorExpression = [
  "match",
  ["get", "status"],
  ...STATUS_ORDER.flatMap((status) => [status, STATUS_MAP_COLORS[status]]),
  "#888888",
] as unknown as ExpressionSpecification;

export function MapCanvas({
  leads,
  selected,
  onSelect,
  myPosition,
  renderCard,
}: {
  leads: LeadLite[];
  selected: LeadLite | null;
  onSelect: (restaurantId: string | null) => void;
  myPosition: GeoPoint | null;
  renderCard: (lead: LeadLite) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const readyRef = useRef(false);
  const leadsRef = useRef(leads);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const myPositionRef = useRef(myPosition);
  const hadPositionRef = useRef(false);
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const syncData = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("leads") as GeoJSONSource).setData(
      toFeatureCollection(leadsRef.current)
    );
  };

  const syncSelection = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setFilter("leads-selected", [
      "==",
      ["get", "id"],
      selectedRef.current?.restaurantId ?? "",
    ]);
  };

  const syncMyPosition = () => {
    const map = mapRef.current;
    const point = myPositionRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("me") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: point
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [point.lng, point.lat] },
              properties: {},
            },
          ]
        : [],
    });
    // Premier point du suivi : on centre une fois, puis on laisse la main.
    if (point && !hadPositionRef.current) {
      map.easeTo({ center: [point.lng, point.lat], zoom: 14 });
    }
    hadPositionRef.current = point !== null;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const viewport = savedViewport();
    const map = new MaplibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: viewport.center,
      zoom: viewport.zoom,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    const updateCardPos = () => {
      const current = selectedRef.current;
      if (current && current.lng !== null && current.lat !== null) {
        const point = map.project([current.lng, current.lat]);
        setCardPos({ x: point.x, y: point.y });
      } else {
        setCardPos(null);
      }
    };

    map.on("load", () => {
      map.addSource("leads", {
        type: "geojson",
        data: toFeatureCollection(leadsRef.current),
        cluster: true,
        clusterRadius: MAP_CLUSTER_RADIUS,
        clusterMaxZoom: MAP_CLUSTER_MAX_ZOOM,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "leads",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e2764b",
          "circle-opacity": 0.9,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            25,
            20,
            100,
            26,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "leads",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "leads-point",
        type: "circle",
        source: "leads",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": statusColorExpression,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            5,
            14,
            8,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "leads-selected",
        type: "circle",
        source: "leads",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": "rgba(0, 0, 0, 0)",
          "circle-radius": 12,
          "circle-stroke-color": "#e2764b",
          "circle-stroke-width": 2.5,
        },
      });
      map.addSource("me", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "me",
        type: "circle",
        source: "me",
        paint: {
          "circle-color": "#4f94c9",
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
      readyRef.current = true;
      // Les effets tournés avant « load » n'ont rien pu pousser.
      syncData();
      syncSelection();
      syncMyPosition();
      updateCardPos();
    });

    map.on("click", "leads-point", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectRef.current(id);
    });
    map.on("click", "clusters", (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource("leads") as GeoJSONSource;
      if (feature == null || clusterId == null) return;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      });
    });
    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: readyRef.current ? ["leads-point", "clusters"] : [],
      });
      if (hits.length === 0) onSelectRef.current(null);
    });
    for (const layer of ["leads-point", "clusters"]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    map.on("move", updateCardPos);
    map.on("moveend", () => {
      const center = map.getCenter();
      localStorage.setItem(
        MAP_VIEWPORT_STORAGE_KEY,
        JSON.stringify({
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
        } satisfies Viewport)
      );
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Créée une seule fois : les mises à jour passent par les effets ci-dessous.
  }, []);

  useEffect(() => {
    leadsRef.current = leads;
    syncData();
    // syncData est stable (lit les refs) : seule la donnée compte.
  }, [leads]);

  useEffect(() => {
    selectedRef.current = selected;
    syncSelection();
    const map = mapRef.current;
    if (map && selected && selected.lng !== null && selected.lat !== null) {
      const point = map.project([selected.lng, selected.lat]);
      setCardPos({ x: point.x, y: point.y });
    } else {
      setCardPos(null);
    }
  }, [selected]);

  useEffect(() => {
    myPositionRef.current = myPosition;
    syncMyPosition();
    // syncMyPosition est stable (lit les refs) : seule la position compte.
  }, [myPosition]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {selected && cardPos && (
        <div
          className="pointer-events-none absolute z-10 hidden lg:block"
          style={{ left: cardPos.x, top: cardPos.y - 14 }}
        >
          <div className="pointer-events-auto -translate-x-1/2 -translate-y-full">
            {renderCard(selected)}
          </div>
        </div>
      )}
      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-10 lg:hidden">
          {renderCard(selected)}
        </div>
      )}
    </div>
  );
}
