<template>
  <MglMap
    :map-style="style"
    :zoom="zoom"
    :center="center"
    height="500px"
  >
    <MglVectorSource
      source-id="sfbayarea"
      url="http://0.0.0.0:8080/data/transit_lines.json"
      :tiles="routesSourceTiles"
    >
      <MglLineLayer
      layer-id="transit-routes"
      source-layer="sfbayarea"
      :paint="paint"
      :filter="routeFilter"
      ></MglLineLayer>

      <MglCircleLayer
        layer-id="transit-stops"
        source-layer="sfbayarea"
        :paint="librariesLayerCirclesPaint"
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

const style = 'https://api.maptiler.com/maps/streets/style.json?key=DDypiIJ7OGinseJ5cFio';
const routesSourceTiles = [ 'http://0.0.0.0:8080/data/transit_lines/{z}/{x}/{y}.pbf' ];
const center:LngLatLike = [-122.4494,37.7549];
const zoom = 10.5;
const paint = {
  "line-width": 2,
  "line-color": "#000000"
};
const librariesLayerCirclesPaint = {
  'circle-radius': 5,
  'circle-stroke-width': 2,
  'circle-stroke-color' : '#1b5e20',
  'circle-color': "rgba(0, 0, 0, 0)"
} as CircleLayerSpecification['paint'];
const props = defineProps<{
  routeId: string|null,
  stopId: string|null,
}>();
const mapOne = useMap();

const routeFilter = computed(()=> {
  return props.routeId ? ["==","route_id",props.routeId] : ["all", false];
});
const stopFilter = computed(()=> {
  return props.stopId ? ["==","stop_id",props.stopId] : ["all", false];
});

watch(() => props.routeId, (newRouteId) => {
  if (newRouteId) {
    // timeout because queryRenderedFeatures depends on the map updating
    // after the map updates
    setTimeout(() => {
      const routeFeatures = mapOne.map?.queryRenderedFeatures({ layers: ['transit-routes'] });
      if (routeFeatures) {
        const [feature] = routeFeatures;

        if (feature) {
          // this is a MultiLineString and TS seems to hate it.
          const multiline:Position[][] = feature.geometry?.coordinates;
          const bbox = multiline.reduce((bounds, line) => {
            return line.reduce((bounds, segment) => {
              return bounds.extend(segment);
            }, bounds);
          }, new LngLatBounds(multiline[0][0], multiline[0][0]));

          if (bbox) {
            mapOne.map?.fitBounds(bbox, {
              padding: 20
            });
          }
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
      const routeFeatures = mapOne.map?.queryRenderedFeatures({ layers: ['transit-stops'] });
      if (routeFeatures?.length) {
        const [feature] = routeFeatures;
        mapOne.map?.easeTo({zoom:17, duration:1500, center: feature.geometry?.coordinates});
      }
    }, ((1000/60) * 5));
  }
});
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>