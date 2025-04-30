// visualization/societyHeatmap.js
import { getStateNameFromAbbr } from "../../utils.js";

let societyLayer = null;

export function renderSocietyHeatmap(globalMap, stateName) {
  const povertyCSV = "../../../data/county/min_poverty_county.csv";
  const countyGeo = "../../../data/map/county.geojson";
  const currentStateName = stateName.toLowerCase();

  Promise.all([
    d3.csv(povertyCSV),
    d3.json(countyGeo)
  ]).then(([povertyData, geojson]) => {
    const povertyMap = new Map();

    // Map: "autauga,alabama" => 0.116
    povertyData.forEach(d => {
      const fullCountyField = d["County"];
      const rateRaw = d["PovertyPopulation%"]; // e.g., 0.116

      if (!fullCountyField || !rateRaw) return;

      const countyKey = fullCountyField.replace("County", "").trim().toLowerCase();
      povertyMap.set(`${countyKey},${currentStateName}`, +rateRaw);
    });

    function getPovertyRate(feature) {
      const county = Array.isArray(feature.properties.coty_name)
        ? feature.properties.coty_name[0].toLowerCase()
        : feature.properties.coty_name?.toLowerCase();

      const state = Array.isArray(feature.properties.ste_name)
        ? feature.properties.ste_name[0].toLowerCase()
        : feature.properties.ste_name?.toLowerCase();

      const key = `${county},${state}`;
      return povertyMap.get(key);
    }

    const stateFiltered = geojson.features.filter(f => {
      const name = Array.isArray(f.properties?.ste_name)
        ? f.properties.ste_name[0]
        : f.properties?.ste_name;
      return name?.toLowerCase() === currentStateName;
    });

    const scores = stateFiltered.map(getPovertyRate).filter(d => d != null);
    const colorScale = d3.scaleSequential()
      .domain([d3.max(scores), d3.min(scores)])
      .interpolator(d3.interpolateRdYlGn); // Green is better, Red is worse

    if (societyLayer) {
      globalMap.removeLayer(societyLayer);
    }

    societyLayer = L.geoJSON(stateFiltered, {
      style: feature => {
        const rate = getPovertyRate(feature);
        return {
          fillColor: rate != null ? colorScale(rate) : "#ffffff",
          weight: 1,
          opacity: 1,
          color: "#999",
          fillOpacity: 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const rate = getPovertyRate(feature);
        const county = feature.properties.coty_name;
        const tooltip = `${county} County<br>Poverty Rate: ${rate != null ? (rate * 100).toFixed(1) + "%" : "N/A"}`;
        layer.bindTooltip(tooltip);
      }
    });

    societyLayer.addTo(globalMap);
    window._societyHeatmapLayer = societyLayer;
  }).catch(err => {
    console.error("Failed to load poverty data:", err);
  });
}

export function removeSocietyHeatmap(globalMap) {
  if (societyLayer && globalMap.hasLayer(societyLayer)) {
    globalMap.removeLayer(societyLayer);
  }
}
