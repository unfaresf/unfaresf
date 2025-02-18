<template>
  <MglMap
    :map-style="style"
    :zoom="zoom"
    :center="center"
    height="500px"
  >
    <MglVectorSource
      source-id="routes"
      url="http://localhost:8080/data/routes.json"
      :tiles="routesSourceTiles"
    >
      <MglLineLayer
      layer-id="transit-routes"
      source-layer="routes"
      :paint="paint"
      :filter="routeFilter"
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
<!--  -->
<script setup lang="ts">
import { MglMap, useMap, MglNavigationControl, MglVectorSource, MglLineLayer, MglCircleLayer } from '@indoorequal/vue-maplibre-gl';
import type { CircleLayerSpecification, LngLatLike } from 'maplibre-gl';
import { LngLatBounds } from 'maplibre-gl';
import type { Position } from 'geojson';
import type { RouteResponse } from "./select/route.vue";

const style = 'https://api.maptiler.com/maps/streets/style.json?key=DDypiIJ7OGinseJ5cFio';
const routesSourceTiles = [ 'http://localhost:8080/data/routes/{z}/{x}/{y}.pbf' ];
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

const routeFilter = computed(()=> {
  return props.route ? ["all", ["==","route_id",props.route?.routeId],["==","direction_id",props.route?.directionsId]] : ["all", false];
});
const stopFilter = computed(()=> {
  return props.stopId ? ["==","stop_id",props.stopId] : ["all", false];
});

watch(() => props.route, (newRoute) => {
  if (newRoute) {
    // timeout because queryRenderedFeatures depends on the map updating
    // after the map updates
    setTimeout(() => {
      const routeFeatures = transitMap.map?.queryRenderedFeatures({ layers: ['transit-routes'] });
      if (routeFeatures) {
        const [feature] = routeFeatures;

        if (feature) {
          // this is a MultiLineString and TS seems to hate it.
          const coordinates:Position[] = feature.geometry?.coordinates;
          const bounds = coordinates.reduce((bounds, coord) => {
              return bounds.extend(coord);
          }, new LngLatBounds(coordinates[0], coordinates[0]));

          transitMap.map?.fitBounds(bounds, {
            padding: 30
          });
        }
      }
    }, ((1000/60) * 5));
  }
});

watch(() => props.stopId, (newRouteId) => {
  if (newRouteId) {
    // timeout because queryRenderedFeatures depends on the map updating
    // after the map updates
    setTimeout(() => {
      const routeFeatures = transitMap.map?.queryRenderedFeatures({ layers: ['transit-stops'] });
      if (routeFeatures?.length) {
        const [feature] = routeFeatures;
        transitMap.map?.easeTo({zoom:17, duration:1500, center: feature.geometry?.coordinates});
      }
    }, ((1000/60) * 5));
  }
});
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>