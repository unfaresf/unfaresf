<template>
  <MglMap
    :map-style="style"
    :zoom="zoom"
    :center="center"
    :height="mapHeight"
  >
    <MglGeolocateControl />
    <MglNavigationControl :showCompass="false" />

    <MglVectorSource
      source-id="stops"
      :url="tileServerDomain+'/data/stops.json'"
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
        :minzoom="10",
      />
    </MglVectorSource>

    <MglVectorSource
      source-id="trips"
      :url="tileServerDomain+'/data/trips.json'"
      :tiles="tripsSourceTiles"
      :minzoom="6"
    >
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
</template>

<script setup lang="ts">
import { MglMap, useMap, MglNavigationControl, MglVectorSource, MglLineLayer, MglCircleLayer, MglGeolocateControl, MglSymbolLayer } from '@indoorequal/vue-maplibre-gl';
import type { CircleLayerSpecification, LineLayerSpecification, LngLatLike } from 'maplibre-gl';
import type { RouteResponse } from "./select/route.vue";

const {public: {tileServerDomain} } = useRuntimeConfig();
const style = 'https://api.maptiler.com/maps/995d0704-eb12-493a-9e6c-41e320a7b94c/style.json?key=DDypiIJ7OGinseJ5cFio';
const tripsSourceTiles = [ `${tileServerDomain}/data/trips/{z}/{x}/{y}.pbf` ];
const stopsSourceTiles = [ `${tileServerDomain}/data/stops/{z}/{x}/{y}.pbf` ];
const center:LngLatLike = [-122.4404,37.7549];
const zoom = 10.5;
const paint = {
  "line-width": 2,
  "line-color": "#000000"
};
const hotPaint = {
  "line-width": 2,
  "line-color": "#ff6467"
}
const mapPadding = {top: 15, bottom:40, left: 15, right: 15};
const routeSymbolLayout = {
  'text-field': ['get', 'route_short_name'],
  'symbol-placement': 'line-center',
  'text-rotation-alignment': 'map',
  'text-letter-spacing': 0.15,
  'symbol-spacing': 5,
}
const routeSymbolPaint = {
  'text-color': '#e6e6e6',
  'text-halo-color': '#1a1a1a',
  'text-halo-width': 1.5,
  'text-halo-blur': 0.75,
};

const stopsLayerCirclesPaint = {
  'circle-radius': 8,
  'circle-stroke-width': 3,
  'circle-stroke-color' : '#9f0712',
  'circle-color': "rgba(0, 0, 0, 0)"
} as CircleLayerSpecification['paint'];
const hotStopsLayerCirclesPaint = {
  'circle-radius': 8,
  'circle-stroke-width': 0,
  'circle-stroke-color' : 'rgba(0, 0, 0, 0)',
  'circle-color': "#9f0712",
  'circle-blur': 0.7
} as CircleLayerSpecification['paint'];
const props = defineProps<{
  route: RouteResponse|null,
  stopId: string|null,
  showBroadcasts?: boolean
}>();

const { isMobile } = useDevice();
const transitMap = useMap();
const visibleRouteIds = ref<string[]>([]);
const visibleStopIds = ref<string[]>([]);
const mapHeight = computed(() => {
  return isMobile ? '500px': '362px'
});

const tripFilter = computed(() => {
  return props.route ? ["==", "route_id", props.route.routeId] : ["all", false];
});
const stopFilter = computed(():CircleLayerSpecification['filter'] => {
  return props.stopId ? ["==", "stop_id", props.stopId] : ["all", false];
});

const hotTrips = computed(():LineLayerSpecification['filter'] => {
  return props.showBroadcasts ? ["in","route_id", ...visibleRouteIds.value] : ["all", false];
});
const hotStops = computed(():CircleLayerSpecification['filter'] => {
  return props.showBroadcasts ? ["in","stop_id", ...visibleStopIds.value] : ["all", false];
});

const routeLabels = computed(():LineLayerSpecification['filter'] => {
  const routeIds = [...visibleRouteIds.value, props.route?.routeId].filter(r => !!r);

  return props.showBroadcasts ? ["in","route_id", ...routeIds] : ["all", false];
});

if (props.showBroadcasts) {
  const {data} = await useLazyFetch('/api/broadcasts/geo', {
    server: false,
  });
  if (data.value?.routes.length) {
    visibleRouteIds.value = data.value.routes.map(route => route.routeId);
    visibleStopIds.value = data.value.stops.map(stop => stop.stopId);
    transitMap.map?.fitBounds(data.value?.bbox, {
      padding: mapPadding
    });
  }
  watch(data, () => {
    if (data.value?.routes.length) {
      visibleRouteIds.value = data.value.routes.map(route => route.routeId);
      visibleStopIds.value = data.value.stops.map(stop => stop.stopId);
      transitMap.map?.fitBounds(data.value?.bbox, {
        padding: mapPadding
      });
    }
  }, {once: true});
}

// disable map rotation
if (transitMap && transitMap.map) {
  transitMap.map.dragRotate.disable();
  transitMap.map.keyboard.disable();
  transitMap.map.touchZoomRotate.disableRotation();
}

watch(() => props.route, async (newRoute) => {
  if (newRoute) {
    const routeDetails = await $fetch(`/api/gtfs/routes/${newRoute.routeId}`);

    if (routeDetails) {
      transitMap.map?.fitBounds(routeDetails.bbox, {
        padding: mapPadding
      });
    }
  }
});

watch(() => props.stopId, async (newStopId) => {
  if (newStopId) {
    const [stopDetails] = await $fetch(`/api/gtfs/stops/${newStopId}`);
    transitMap.map?.easeTo({zoom:17, duration:1500, center: [stopDetails.stopLon, stopDetails.stopLat]});
  }
});
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>