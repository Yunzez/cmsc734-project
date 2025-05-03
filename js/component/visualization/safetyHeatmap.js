// visualization/safetyHeatmap.js
import { getStateNameFromAbbr } from "../../utils.js";
import { createSafetyVis } from "./safetyVis.js";
let heatmapLayer = null;

export function renderSafetyHeatmap(globalMap, stateName, county) {
  const crimeCSV = "../../../data/crime/crime_data_county.csv";
  const countyGeo = "../../../data/map/county.geojson";

  Promise.all([d3.csv(crimeCSV), d3.json(countyGeo)]).then(
    ([crimeData, geojson]) => {
      const crimeMap = new Map();

      crimeData.forEach((d) => {
        const [countyPart, stateAbbr] = d.county_name.split(",");
        const countyKey = countyPart.replace("County", "").trim().toLowerCase();
        const stateFull = getStateNameFromAbbr(stateAbbr.trim());
        if (stateFull) {
          crimeMap.set(`${countyKey},${stateFull.toLowerCase()}`, d);
        }
      });

      function getCrimeScore(d) {
        const county = Array.isArray(d.properties.coty_name)
          ? d.properties.coty_name[0].toLowerCase()
          : d.properties.coty_name?.toLowerCase();
        const state = Array.isArray(d.properties.ste_name)
          ? d.properties.ste_name[0].toLowerCase()
          : d.properties.ste_name?.toLowerCase();
        const key = `${county},${state}`;
        const record = crimeMap.get(key);
        if (!record) return null;

        const fields = ["MURDER", "ROBBERY", "AGASSLT"];
        return d3.sum(fields.map((f) => +record[f] || 0));
      }

      const stateFiltered = geojson.features.filter((f) => {
        const name = Array.isArray(f.properties?.ste_name)
          ? f.properties.ste_name[0]
          : f.properties?.ste_name;
        return name?.toLowerCase() === stateName.toLowerCase();
      });

      const scores = stateFiltered.map(getCrimeScore).filter((d) => d != null);
      const colorScale = d3
        .scaleSequential()
        .domain([d3.min(scores), d3.max(scores)])
        .interpolator(d3.interpolateReds);

      if (heatmapLayer) {
        globalMap.removeLayer(heatmapLayer);
      }

      heatmapLayer = L.geoJSON(stateFiltered, {
        style: (feature) => {
          const score = getCrimeScore(feature);
          return {
            fillColor: score != null ? colorScale(score) : "#ffffff",
            weight: 1,
            opacity: 1,
            color: "#999",
            fillOpacity: 0.6,
          };
        },
        onEachFeature: (feature, layer) => {
          const county_name = Array.isArray(feature.properties.coty_name)
            ? feature.properties.coty_name[0]
            : feature.properties.coty_name;

          const countyId = county_name.trim().toLowerCase();
          const score = getCrimeScore(feature);
          const county = Array.isArray(feature.properties.coty_name)
            ? feature.properties.coty_name[0]
            : feature.properties.coty_name;
          const tooltip = `${county} County<br>Crime Score: ${score ?? "N/A"}`;
          layer.bindTooltip(tooltip);
          layer._countyId = countyId;
        },
      });
      heatmapLayer._layerId = "crime-heatmap";

      heatmapLayer.addTo(globalMap);
      window._crimeHeatmapLayer = heatmapLayer;

      const mapDiv = document.getElementById("vis-overall");
      createSafetyVis(mapDiv, stateName, county, globalMap, heatmapLayer);
    }
  );
}

export function removeSafetyHeatmap(globalMap) {
  if (heatmapLayer && globalMap.hasLayer(heatmapLayer)) {
    globalMap.removeLayer(heatmapLayer);
  }
}
