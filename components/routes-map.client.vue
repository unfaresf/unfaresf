<template>
  <div class="fixed map-size w-full lg:w-3/4">
    <MglMap
      :map-style="props.config.mapStylesUrl"
      :zoom="zoom"
      :center="center"
      height="calc(100dvh - 51px)"
      width="100%"
      :attributionControl="false"
    >
      <MglGeolocateControl />
      <MglAttributionControl
        :position="isMobile ? 'top-left' : 'bottom-left'"
        :compact="true"
      />
      <MglNavigationControl :showCompass="false" />

      <MglVectorSource
        source-id="stops"
        :url="props.config.tileServerDomain + '/data/stops.json'"
        :tiles="stopsSourceTiles"
      >
        <MglCircleLayer
          layer-id="hot-stops"
          source-layer="stops"
          :paint="hotStopsLayerCirclesPaint"
          :filter="hotStops"
          :minzoom="7"
        />
        <MglCircleLayer
          layer-id="transit-stops"
          source-layer="stops"
          :paint="stopsLayerCirclesPaint"
          :filter="stopFilter"
          :minzoom="10"
        />
      </MglVectorSource>

      <MglVectorSource
        source-id="trips"
        :url="props.config.tileServerDomain + '/data/trips.json'"
        :tiles="tripsSourceTiles"
        :minzoom="6"
      >
        <MglLineLayer
          layer-id="warm-trips"
          source-layer="trips"
          :paint="warmPaint"
          :filter="warmStops"
        />
        <MglLineLayer
          layer-id="hot-trips"
          source-layer="trips"
          :paint="hotPaint"
          :filter="hotTrips"
        />
        <MglLineLayer
          layer-id="transit-trips"
          source-layer="trips"
          :paint="paint"
          :filter="tripFilter"
        />

        <MglSymbolLayer
          layer-id="transit-trips-labels"
          source-layer="trips"
          :minzoom="6"
          :layout="routeSymbolLayout"
          :paint="routeSymbolPaint"
          :filter="routeLabels"
        />
      </MglVectorSource>
    </MglMap>
  </div>
</template>

<style scoped>
.map-size {
  height: calc(100dvh - 51px);
}
</style>
<script setup lang="ts">
import {
  MglMap,
  useMap,
  MglNavigationControl,
  MglVectorSource,
  MglLineLayer,
  MglCircleLayer,
  MglGeolocateControl,
  MglSymbolLayer,
  MglAttributionControl,
} from "@indoorequal/vue-maplibre-gl";
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  LngLatLike,
} from "maplibre-gl";
import type { Route } from "./select/route.vue";
import type { MapOptions } from "../db/schema";

const paint = {
  "line-width": 2,
  "line-color": "#000000",
};
const hotPaint = {
  "line-width": 2,
  "line-color": "#ff6467",
};
const warmPaint = {
  "line-width": 3,
  "line-opacity": 0.1,
  "line-color": "#fff085",
};
const defaultBoundingBox = [180,90,-180,-90];
const mapPadding = { top: 15, bottom: 40, left: 15, right: 15 };
const routeSymbolLayout = {
  "text-field": ["get", "route_short_name"],
  "symbol-placement": "line-center",
  "text-rotation-alignment": "map",
  "text-letter-spacing": 0.15,
  "symbol-spacing": 5,
};
const routeSymbolPaint = {
  "text-color": "#e6e6e6",
  "text-halo-color": "#1a1a1a",
  "text-halo-width": 1.5,
  "text-halo-blur": 0.75,
};

const stopsLayerCirclesPaint = {
  "circle-radius": 8,
  "circle-stroke-width": 3,
  "circle-stroke-color": "#9f0712",
  "circle-color": "rgba(0, 0, 0, 0)",
} as CircleLayerSpecification["paint"];
const hotStopsLayerCirclesPaint = {
  "circle-radius": 8,
  "circle-stroke-width": 0,
  "circle-stroke-color": "rgba(0, 0, 0, 0)",
  "circle-color": "#9f0712",
  "circle-blur": 0.7,
} as CircleLayerSpecification["paint"];
const props = defineProps<{
  route: Route | null;
  stopId: string | null;
  showBroadcasts?: boolean;
  config: MapOptions;
}>();

const zoom = props.config.zoom;
const center = props.config.center;

const tripsSourceTiles = [
  `${props.config.tileServerDomain}/data/trips/{z}/{x}/{y}.pbf`,
];
const stopsSourceTiles = [
  `${props.config.tileServerDomain}/data/stops/{z}/{x}/{y}.pbf`,
];

const { isMobile } = useDevice();
const transitMap = useMap();
const visibleRouteIds = ref<string[]>([]);
const visibleStopIds = ref<string[]>([]);
const warmRouteIds = ref<string[]>([]);

const tripFilter = computed(() => {
  return props.route ? ["==", "route_id", props.route.routeId] : ["all", false];
});
const stopFilter = computed((): CircleLayerSpecification["filter"] => {
  return props.stopId ? ["==", "stop_id", props.stopId] : ["all", false];
});

const hotTrips = computed((): LineLayerSpecification["filter"] => {
  return props.showBroadcasts
    ? ["in", "route_id", ...visibleRouteIds.value]
    : ["all", false];
});
const hotStops = computed((): CircleLayerSpecification["filter"] => {
  return props.showBroadcasts
    ? ["in", "stop_id", ...visibleStopIds.value]
    : ["all", false];
});
const warmStops = computed((): LineLayerSpecification["filter"] => {
  return props.showBroadcasts
    ? ["in", "route_id", ...warmRouteIds.value]
    : ["all", false];
});

const routeLabels = computed((): LineLayerSpecification["filter"] => {
  const routeIds = [...visibleRouteIds.value, ...warmRouteIds.value, props.route?.routeId].filter(
    (r): r is string => !!r
  );

  return props.showBroadcasts
    ? ["in", "route_id", ...routeIds]
    : ["all", false];
});

if (props.showBroadcasts) {
  const { data } = await useLazyFetch("/api/broadcasts/geo", {
    server: false,
  });
  watch(
    data,
    () => {
      if (data.value?.routes || data.value?.stops) {
        visibleRouteIds.value = data.value.routes.filter((r): r is typeof r & {routeId:string} => !!r.routeId).map((route) => route.routeId);
        visibleStopIds.value = data.value.stops.map((stop) => stop.stopId);
        warmRouteIds.value = data.value.stops.flatMap((stop) => stop.routeIds.split(','));

        if (JSON.stringify(defaultBoundingBox) !== JSON.stringify(data.value?.bbox)) {
          transitMap.map?.fitBounds(data.value?.bbox, {
            padding: mapPadding,
            maxZoom: 12
          });
        }
      }
    },
    { once: true }
  );
}

// disable map rotation
if (transitMap && transitMap.map) {
  transitMap.map.dragRotate.disable();
  transitMap.map.keyboard.disable();
  transitMap.map.touchZoomRotate.disableRotation();
}

let pendingRouteDetailsReq: AbortController | null = null;
watch(
  () => props.route,
  async (newRoute) => {
    if (newRoute) {
      if (pendingRouteDetailsReq) {
        pendingRouteDetailsReq.abort("stale request");
      }
      pendingRouteDetailsReq = new AbortController();

      try {
        const routeDetails = await $fetch(
          `/api/gtfs/routes/${newRoute.routeId}`,
          {
            signal: pendingRouteDetailsReq.signal,
          }
        );

        if (routeDetails) {
          // @ts-ignore: Property 'bbox' does not exist on type SerializeObject
          transitMap.map?.fitBounds(routeDetails.bbox, {
            padding: mapPadding,
          });
        }
      } finally {
        pendingRouteDetailsReq = null;
      }
    } else {
      transitMap.map?.flyTo({ center, zoom });
    }
  }
);

let pendingStopDetailsReq: AbortController | null = null;
watch(
  () => props.stopId,
  async (newStopId) => {
    if (newStopId) {
      if (pendingStopDetailsReq) {
        pendingStopDetailsReq.abort("stale request");
      }
      pendingStopDetailsReq = new AbortController();
      try {
        const [stopDetails] = await $fetch(`/api/gtfs/stops/${newStopId}`, {
          signal: pendingStopDetailsReq.signal,
        });
        transitMap.map?.easeTo({
          zoom: 13,
          duration: 1500,
          // @ts-ignore: Property 'stopLon|stopLat' does not exist on type SerializeObject
          center: [stopDetails.stopLon, stopDetails.stopLat],
        });
      } finally {
        pendingStopDetailsReq = null;
      }
    } else {
      transitMap.map?.flyTo({ center, zoom });
    }
  }
);
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
