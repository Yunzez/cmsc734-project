import { createHotelVis } from "./hotelVis.js";

async function fetchCitiesData(state, county) {
  const data = await d3.csv("../../../data/map/cities.csv");
  if (county) {
    return data.filter(
      (city) => city.state_name === state && city.county_name === county
    );
  } else {
    return data.filter((city) => city.state_name === state);
  }
}

export async function startRenderVisualization(visualizationTargets, map) {
  console.log("startRenderVisualization", visualizationTargets);
  const clickedLayer = visualizationTargets[0];
  const state = visualizationTargets[1];
  const county = visualizationTargets[2];
  const visDiv = document.getElementById("visualization");

  if (county && visualizationTargets.length > 1) {
    renderVisualizationCounty(visDiv, clickedLayer, state, county);
  } else {
    renderVisualizationState(visDiv, clickedLayer, state, map);
  }

  document.getElementById("state-view-wrapper").style.display = "flex";

  document.getElementById("city-radar-chart").style.display = "block";

  renderRadarChart([4.2, 3.8, 4.1, 3.9, 4.5]); // 可以改成动态评分
}

function renderVisualizationCounty(visDiv, clickedLayer, state, county) {
  // Implementation of the renderVisualization logic
  changeTitleName(state, county);
  console.log(
    `Rendering visualization for state: ${state}, county: ${county || "none"}`
  );
}

function renderVisualizationState(visDiv, clickedLayer, state, map) {
  changeTitleName(state);

  // createOverallSection(visDiv, clickedLayer, state);

  createOverallSection(visDiv, clickedLayer, state, map);
}

function changeTitleName(state, county = null) {
  const titleElement = document.getElementById("visHeaderTitle");
  const infoElement = document.createElement("div");
  // Clear old paragraph info first
  infoElement.innerHTML = "Information for ";

  if (county) {
    const infoCountyElement = document.createElement("span");
    infoCountyElement.innerText = county + ", ";
    infoCountyElement.id = "info-county";
    infoElement.appendChild(infoCountyElement);
  }

  const infoStateElement = document.createElement("span");
  infoStateElement.innerText = state;
  infoStateElement.id = "info-state";
  infoElement.appendChild(infoStateElement);
  titleElement.appendChild(infoElement);
}

function createOverallSection(visDiv, clickedFeature, state, map) {
  // const overall = document.getElementById("overall-map");
  // overall.innerHTML = "";
  // overall.style.width = "100%";
  // overall.style.height = "100%";
  if (!map || typeof map.getPanes !== "function") {
    console.error("❌ Leaflet map is not available (from argument).");
    return;
  }

  const tooltip = d3
    .select("#visualization")
    .append("div")
    .attr("class", "city-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("padding", "6px 10px")
    .style("background", "#2f3542")
    .style("color", "#f1f2f6")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("opacity", 0)
    .style("z-index", 1000);

  const svg = d3.select(map.getPanes().overlayPane).select("svg");
  let g = svg.select("g.leaflet-zoom-hide");
  if (g.empty()) {
    g = svg.append("g").attr("class", "leaflet-zoom-hide");
  }


  fetchCitiesData(state).then((data) => {
    data.forEach((d) => {
      if (d.population === "N/A" || d.density === "N/A" || d.population == 0) {
        return;
      }
      d.lat = +d.lat;
      d.lng = +d.lng;
      d.population = +d.population;
      d.density = +d.density;

      d.logPopulation = +d.population;
      d.logDensity = Math.log(d.density > 0 ? d.density : 1);
    });

    const sizeScale = d3
      .scaleSqrt()
      .domain(d3.extent(data, (d) => d.logPopulation))
      .range([1, 20]);

    const colorScale = d3
      .scaleSequential()
      .domain(d3.extent(data, (d) => d.logDensity))
      .interpolator(d3.interpolateYlGnBu);
    // Initial render



    function updatePositions() {
      console.log("updatePositions", g.selectAll("city-pop"));
      circles
        .attr("cx", (d) => map.latLngToLayerPoint([d.lat, d.lng]).x)
        .attr("cy", (d) => map.latLngToLayerPoint([d.lat, d.lng]).y);
    }

    // console.log(circles, "data:", data);
    // updatePositions();
    // map.on("zoomend", updatePositions);
  });
}


export function renderAirportOnMap(stateName, globalMap) {
  const geojsonPath = `data/airport/raw_airport.geojson`;

  fetch(geojsonPath)
    .then(res => res.json())
    .then(data => {
      const filtered = data.features.filter(f =>
        f.properties.state_name?.toLowerCase() === stateName.toLowerCase()
      );
      console.log(`✈️ ${filtered.length} airports found in ${stateName}`);


      if (!filtered.length) {
        console.warn(`No airport data found for ${stateName}`);
        return;
      }

      // 清除旧图层（如果存在）
      if (window._airportLayer) {
        globalMap.removeLayer(window._airportLayer);
      }

      const airportLayer = L.layerGroup();

      const airplaneIcon = L.divIcon({
        html: "✈️",
        className: "airport-icon",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      filtered.forEach(f => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties;

        const marker = L.marker([lat, lng], { icon: airplaneIcon });

        const tooltipContent = `
  <strong>${props.fac_name || props.name}</strong><br/>
  ICAO: ${props.icao_ident || "N/A"}<br/>
  Type: ${props.fac_type || "N/A"}<br/>
  State: ${props.state_name || "N/A"}<br/>
  Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}
`;

        marker.bindTooltip(tooltipContent, {
          direction: "top",
          offset: [0, -10],
          className: "airport-tooltip",
        });

        airportLayer.addLayer(marker);
      });

      airportLayer.addTo(globalMap);
      window._airportLayer = airportLayer;
    })
    .catch(err => {
      console.error("❌ Failed to load airport geojson:", err);
    });
}
