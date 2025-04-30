import { createHotelVis } from "./hotelVis.js";
import { renderAirportOnMap } from "./airportVis.js";


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
    console.log("rendering county")
    renderVisualizationCounty(visDiv, clickedLayer, state, county);
  } else {
    console.log("rendering state")
    renderVisualizationState(visDiv, clickedLayer, state, map);
  }

//   document.getElementById("city-radar-chart").style.display = "block";

//   renderRadarChart([4.2, 3.8, 4.1, 3.9, 4.5]); // 可以改成动态评分
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
  createOverallSection(visDiv, clickedLayer, state, map);
  console.log("after createOverallSection")
}

function changeTitleName(state, county = null) {
  const titleElement = document.getElementById("visHeaderTitle");
  titleElement.innerHTML = ""; // Clear old title first
  const infoElement = document.createElement("div");
  // Clear old paragraph info first
  infoElement.innerHTML = "Information for ";
     console.log("change title name with ", state, county);
  if (county) {
    const infoCountyElement = document.createElement("span");
    infoCountyElement.innerText = county + " County, ";
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
    console.log("❌ Leaflet map is not available (from argument).");
    return;
  }

  const svg = d3.select(map.getPanes().overlayPane).select("svg");
  let g = svg.select("g.leaflet-zoom-hide");
  if (g.empty()) {
    g = svg.append("g").attr("class", "leaflet-zoom-hide");
  }

  console.log("check 1")
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

