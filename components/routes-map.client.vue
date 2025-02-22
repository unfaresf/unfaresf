<template>
  <MglMap
    :map-style="style"
    :zoom="zoom"
    :center="center"
    :height="mapHeight"
  >
    <MglGeolocateControl />

    <MglVectorSource
      source-id="trips"
      :url="tileServerDomain+'/data/trips.json'"
      :tiles="tripsSourceTiles"
    >
      <MglLineLayer
        layer-id="hot-trips"
        source-layer="trips"
        :paint="hotPaint"
        :filter="hotTrips"
      ></MglLineLayer>
      <MglLineLayer
        layer-id="transit-trips"
        source-layer="trips"
        :paint="paint"
        :filter="tripFilter"
      ></MglLineLayer>
    </MglVectorSource>

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
        :minzoom="10"
      />
    </MglVectorSource>

    <MglNavigationControl />
  </MglMap>
</template>

<script setup lang="ts">
import { MglMap, useMap, MglNavigationControl, MglVectorSource, MglLineLayer, MglCircleLayer, MglGeolocateControl } from '@indoorequal/vue-maplibre-gl';
import type { CircleLayerSpecification, LngLatLike } from 'maplibre-gl';
import type { RouteResponse } from "./select/route.vue";

const {public: {tileServerDomain} } = useRuntimeConfig();

const style = 'https://api.maptiler.com/maps/streets/style.json?key=DDypiIJ7OGinseJ5cFio';
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
const stopsLayerCirclesPaint = {
  'circle-radius': 5,
  'circle-stroke-width': 2,
  'circle-stroke-color' : '#1b5e20',
  'circle-color': "rgba(0, 0, 0, 0)"
} as CircleLayerSpecification['paint'];
const hotStopsLayerCirclesPaint = {
  'circle-radius': 5,
  'circle-stroke-width': 2,
  'circle-stroke-color' : '#9f0712',
  'circle-color': "rgba(0, 0, 0, 0)"
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
const tripFilter = computed(()=> {
  return props.route? ["==","route_id",props.route?.routeId] : ["all", false];
});
const stopFilter = computed(()=> {
  return props.stopId ? ["==","stop_id", props.stopId] : ["all", false];
});

const hotTrips = computed(()=> {
  return props.showBroadcasts ? ["in","route_id", ...visibleRouteIds.value] : ["all", false];
});
const hotStops = computed(()=> {
  return props.showBroadcasts ? ["in","stop_id", ...visibleStopIds.value] : ["all", false];
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