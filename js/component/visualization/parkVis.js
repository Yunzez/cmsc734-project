// visualization/parkVis.js

import { getStateAbbrFromName } from "../../utils.js";

let parkLayer = null;

function mercatorToLatLng([x, y]) {
  const R_MAJOR = 6378137.0;
  const lon = (x / R_MAJOR) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R_MAJOR)) - Math.PI / 2) * (180 / Math.PI);
  return [lat, lon];
}

function convertFeatureToLatLng(feature) {
  if (feature.geometry.type !== "MultiPolygon") return null;

  const converted = feature.geometry.coordinates.map(polygon =>
    polygon.map(ring =>
      ring.map(([x, y]) => {
        const [lat, lon] = mercatorToLatLng([x, y]);
        return [lon, lat]; // Leaflet expects [lng, lat]
      })
    )
  );

  return {
    type: "Feature",
    properties: feature.properties,
    geometry: {
      type: "MultiPolygon",
      coordinates: converted
    }
  };
}

function fetchParkGeojsonByState(stateName) {
    const stateAbbr = getStateAbbrFromName(stateName);
    const fileSafeName = stateName.replaceAll(" ", "_");
    const filename = `data/park/state_parks/${fileSafeName}_park.geojson`;
    return fetch(filename).then(res => res.json());
  }
  

export function renderParkOnMap(stateName, globalMap) {
  fetchParkGeojsonByState(stateName)
    .then((geojson) => {
      if (!geojson?.features?.length) {
        console.warn(`⚠️ No park data found for ${stateName}`);
        return;
      }

      if (!globalMap.getPane("parksPane")) {
        globalMap.createPane("parksPane");
        globalMap.getPane("parksPane").style.zIndex = 650;
      }

      if (window._parkLayer) {
        globalMap.removeLayer(window._parkLayer);
      }

      const convertedFeatures = geojson.features.map(convertFeatureToLatLng).filter(Boolean);

      parkLayer = L.geoJSON(
        { type: "FeatureCollection", features: convertedFeatures },
        {
          pane: "parksPane",
          style: {
            color: "#145A32",
            weight: 1.5,
            fillColor: "#27ae60",
            fillOpacity: 0.45,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const name = props.PARKNAME || props.UNIT_NAME || props.name || "Unnamed Park";
            const tooltipContent = `
              <strong>${name}</strong><br/>
              Type: ${props.UNIT_TYPE || "Unknown"}<br/>
              State: ${props.STATE || stateName}
            `;
            layer.bindTooltip(tooltipContent, {
              direction: "top",
              offset: [0, -8],
              className: "park-tooltip",
            });
          }
        }
      );

      parkLayer.addTo(globalMap);
      window._parkLayer = parkLayer;
    })
    .catch(err => {
      console.error("❌ Failed to load park geojson:", err);
    });
}

export function removeParkFromMap(globalMap) {
  if (window._parkLayer && globalMap.hasLayer(window._parkLayer)) {
    globalMap.removeLayer(window._parkLayer);
    console.log("🧹 Removed park layer from map");
  }
}

export async function fetchParkNames(stateName) {
  const geojson = await fetchParkGeojsonByState(stateName);
  const names = geojson.features
    .map(f => f.properties.PARKNAME || f.properties.UNIT_NAME || "")
    .filter(n => n.length > 0);
  return names;
}

export { fetchParkGeojsonByState };
