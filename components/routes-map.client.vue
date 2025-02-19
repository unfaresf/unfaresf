<template>
  <MglMap
    :map-style="style"
    :zoom="zoom"
    :center="center"
    height="330px"
  >
    <MglVectorSource
      source-id="trips"
      url="http://localhost:8080/data/trips.json"
      :tiles="tripsSourceTiles"
    >
      <MglLineLayer
      layer-id="transit-trips"
      source-layer="trips"
      :paint="paint"
      :filter="tripFilter"
      ></MglLineLayer>
    </MglVectorSource>

    <MglVectorSource
      source-id="stops"
      url="http://localhost:8080/data/stops.json"
      :tiles="stopsSourceTiles"
    >
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
import { MglMap, useMap, MglNavigationControl, MglVectorSource, MglLineLayer, MglCircleLayer } from '@indoorequal/vue-maplibre-gl';
import type { CircleLayerSpecification, LngLatLike } from 'maplibre-gl';
import type { RouteResponse } from "./select/route.vue";

const style = 'https://api.maptiler.com/maps/streets/style.json?key=DDypiIJ7OGinseJ5cFio';
const tripsSourceTiles = [ 'http://localhost:8080/data/trips/{z}/{x}/{y}.pbf' ];
const stopsSourceTiles = [ 'http://localhost:8080/data/stops/{z}/{x}/{y}.pbf' ];
const center:LngLatLike = [-122.4494,37.7549];
const zoom = 10.5;
const paint = {
  "line-width": 2,
  "line-color": "#000000"
};
const stopsLayerCirclesPaint = {
  'circle-radius': 5,
  'circle-stroke-width': 2,
  'circle-stroke-color' : '#1b5e20',
  'circle-color': "rgba(0, 0, 0, 0)"
} as CircleLayerSpecification['paint'];

const props = defineProps<{
  route: RouteResponse|null,
  stopId: string|null,
}>();
const transitMap = useMap();

const tripFilter = computed(()=> {
  return props.route ? ["==","route_id",props.route?.routeId] : ["all", false];
});
const stopFilter = computed(()=> {
  return props.stopId ? ["==","stop_id",props.stopId] : ["all", false];
});

watch(() => props.route, async (newRoute) => {
  if (newRoute) {
    const routeDetails = await $fetch(`/api/gtfs/routes/${newRoute.routeId}`);

    if (routeDetails) {
      transitMap.map?.fitBounds(routeDetails.bbox, {
        padding: 30
      });
    }
  }
});

watch(() => props.stopId, async (newStopId) => {
  if (newStopId) {
    const [stopDetails] = await $fetch(`/api/gtfs/stops/${newStopId}`);

    if (!stopDetails.stopLon || !stopDetails.stopLat) return;

    transitMap.map?.easeTo({zoom:17, duration:1500, center: [stopDetails.stopLon, stopDetails.stopLat]});
  }
});
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>