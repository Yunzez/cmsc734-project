import { createHotelVis } from './hotelVis.js';

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

export async function startRenderVisualization(visualizationTargets) {
  const clickedLayer = visualizationTargets[0];
  const state = visualizationTargets[1];
  const county = visualizationTargets[2];
  const visDiv = document.getElementById("visualization");

  if (county && visualizationTargets.length > 1) {
    renderVisualizationCounty(visDiv, clickedLayer, state, county);
  } else {
    renderVisualizationState(visDiv, clickedLayer, state);
  }
  // ✅ 显示右侧州地图容器
  document.getElementById("state-view-wrapper").style.display = "flex";

  // ✅ 显示雷达图容器
  document.getElementById("city-radar-chart").style.display = "block";

  // ✅ 渲染数据
  renderRadarChart([4.2, 3.8, 4.1, 3.9, 4.5]); // ⬅️ 你可以改成动态评分

}

function renderVisualizationCounty(visDiv, clickedLayer, state, county) {
  // Implementation of the renderVisualization logic
  changeTitleName("Information for " + county + ", " + state);
  console.log(
    `Rendering visualization for state: ${state}, county: ${county || "none"}`
  );
  const mapDiv = document.getElementById("vis-overall");
  createHotelVis(mapDiv, state, county);
}

function renderVisualizationState(visDiv, clickedLayer, state) {
  changeTitleName("Information for " + state);

  // const mapDiv = document.createElement("div");
  // const mapDiv = document.getElementById("state-map-container");
  // mapDiv.innerHTML = "";
  // mapDiv.id = "overall-map";
  // mapDiv.style.position = "relative";
  // document.getElementById("vis-overall").appendChild(mapDiv);
  const mapDiv = document.getElementById("state-map-container");
  if (!mapDiv) {
    console.error("state-map-container not found!");
    return;
  }
  mapDiv.innerHTML = "";
  mapDiv.style.position = "relative";
  mapDiv.style.height = "600px";

  createOverallSection(visDiv, clickedLayer, state);
}

function changeTitleName(name) {
  document.getElementById("visHeaderTitle").innerText = name;
}

function createOverallSection(visDiv, clickedFeature, state) {
  // const overall = document.getElementById("overall-map");
  // overall.innerHTML = "";
  // overall.style.width = "100%";
  // overall.style.height = "100%";
  // // const mapDiv = document.getElementById("state-map-container");

  const mapDiv = document.getElementById("state-map-container");

  if (!mapDiv) {
    console.error("state-map-container not found in DOM.");
    return;
  }

  mapDiv.innerHTML = "";
  mapDiv.style.position = "relative";
  mapDiv.style.height = "600px";



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
  // Initialize Leaflet map
  const map = L.map(mapDiv, {
    maxZoom: 14,
    minZoom: 6,
    zoom: 8, // Set default zoom level to 7
  });

  // const map = L.map(mapDiv, {
  //   maxZoom: 14,
  //   minZoom: 6,
  //   zoom: 8,
  // });

  // Add base tile layer
  L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png"
  ).addTo(map);

  // Create Leaflet GeoJSON layer from clicked feature
  const geoJsonLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: [clickedFeature],
    },
    {
      style: {
        color: "#FFA500", // Subtle orange color for the border
        weight: 1.5, // Slightly thinner border
        fillColor: "#FFDAB9", // Peach puff color for a softer fill
        fillOpacity: 0.5, // More transparent fill for subtlety
      },
    }
  ).addTo(map);

  map.fitBounds(geoJsonLayer.getBounds());

  // created map

  // Add built-in SVG layer to Leaflet map
  L.svg().addTo(map);
  const svg = d3.select("#overall-map").select("svg");
  const g = svg.select("g").attr("class", "leaflet-zoom-hide");

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

    const circles = g
      .selectAll("city-pop")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", (d) => sizeScale(d.population))
      .attr("fill", (d) => colorScale(Math.log(d.density)))
      .attr("opacity", 0.5)
      .attr("class", "city-bubble")
      .attr("title", (d) => d.city_ascii)
      .on("mouseover", (e, d) => {
        console.log("mouseover", d);
        tooltip
          .style("left", `calc(${e.pageX + 10}px + 50vw)`)
          .style("top", `${e.pageY - 30}px`)
          .style("opacity", 1)
          .html(
            `<strong>${d.city
            }</strong><br>Pop: ${d.population.toLocaleString()}<br>Density: ${d.density
            }`
          );
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    function updatePositions() {
      console.log("updatePositions", g.selectAll("city-pop"));
      circles
        .attr("cx", (d) => map.latLngToLayerPoint([d.lat, d.lng]).x)
        .attr("cy", (d) => map.latLngToLayerPoint([d.lat, d.lng]).y);
    }

    console.log(circles, "data:", data);
    updatePositions();
    map.on("zoomend", updatePositions);
  });
}
