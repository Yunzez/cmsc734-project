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

<<<<<<< HEAD
export async function startRenderVisualization(visualizationTargets, map) {
=======


export async function startRenderVisualization(visualizationTargets) {
>>>>>>> ea9a745a5de59119f4db81d0ec22c201d069f4d7
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
//   const mapDiv = document.getElementById("vis-overall");
//   createHotelVis(mapDiv, state, county);
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

<<<<<<< HEAD
  if (!map || typeof map.getPanes !== "function") {
    console.error("❌ Leaflet map is not available (from argument).");
    return;
  }



=======
>>>>>>> ea9a745a5de59119f4db81d0ec22c201d069f4d7
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

<<<<<<< HEAD
function addAllHotels(hotelsData, map) {
  // Remove old layer if exists

  let hotelLayerGroup = L.markerClusterGroup();

  if (!Array.isArray(hotelsData)) {
    console.error("Hotels data is invalid");
    return;
  }

  hotelsData.forEach((hotel) => {
    if (
      hotel.Latitude == null ||
      hotel.Longitude == null ||
      isNaN(Number(hotel.Latitude)) ||
      isNaN(Number(hotel.Longitude))
    ) return;
    const marker = L.marker([hotel.Latitude, hotel.Longitude], {
      title: hotel.HotelName,
    });

    const popupContent = `
        <b>${hotel.HotelName}</b><br/>
        ${hotel.StarRating ? `⭐ ${hotel.StarRating} stars` : ""}<br/>
        ${hotel.Address || ""}<br/>
        <a href="${hotel.HotelWebsiteUrl}" target="_blank">Website</a>
      `;

    marker.bindPopup(popupContent);
    hotelLayerGroup.addLayer(marker);
  });
  if (map) {
    console.log("Adding hotel layer to map");
  }
  hotelLayerGroup.addTo(map);
}

export function renderHotelOnMap(stateName, globalMap) {
  const filename = `data/hotel/state_hotels/${stateName.replaceAll(
    " ",
    "_"
  )}_hotel.csv`;

  d3.csv(filename).then((hotelData) => {
    if (!hotelData.length) {
      console.warn(`No hotel data for state ${stateName}`);
      return;
    }

    hotelData.forEach((d) => {
      d.lat = +d.Latitude;
      d.lon = +d.Longitude;
      d.StarRating = +d.StarRating || 0;
    });

    addAllHotels(hotelData, globalMap);

    const map = window._leafletMap;
    if (!map) return;

    const svg = d3.select(map.getPanes().overlayPane).select("svg");
    let g = svg.select("g.leaflet-zoom-hide");
    if (g.empty()) {
      g = svg.append("g").attr("class", "leaflet-zoom-hide");
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
      .style("opacity", 0);

    const sizeScale = d3.scaleLinear().domain([0, 5]).range([4, 12]);

    const hotelCircles = g
      .selectAll(".hotel-dot")
      .data(hotelData)
      .enter()
      .append("circle")
      .attr("class", "hotel-dot")
      .attr("r", (d) => sizeScale(d.StarRating))
      .attr("fill", "orange")
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", (e, d) => {
        d3.select(e.target).attr("opacity", 1);
        tooltip
          .style("left", e.pageX + "px")
          .style("top", e.pageY - 20 + "px")
          .style("opacity", 1)
          .html(
            `
      <table>
        <tr><td><strong>Name:</strong></td><td>${d.HotelName}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${d.lat.toFixed(
              4
            )}, ${d.lon.toFixed(4)}</td></tr>
        <tr><td><strong>Stars:</strong></td><td>${d.StarRating}</td></tr>
        ${d.Description
              ? `<tr><td><strong>Description:</strong></td><td>${d.Description}</td></tr>`
              : ""
            }
      </table>
    `
          );
      })
      .on("mouseout", (e, d) => {
        d3.select(e.target).attr("opacity", 0.7);
        tooltip.style("opacity", 0);
      })
      .on("click", (e, d) => {
        const score = d.StarRating;
        renderRadarChart([score, score, score, score, score]);
      });

    function updateHotelPositions() {
      hotelCircles
        .attr("cx", (d) => map.latLngToLayerPoint([d.lat, d.lon]).x)
        .attr("cy", (d) => map.latLngToLayerPoint([d.lat, d.lon]).y);
    }

    map.on("zoomend", updateHotelPositions);
    updateHotelPositions(); // 初始绘制
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
=======
>>>>>>> ea9a745a5de59119f4db81d0ec22c201d069f4d7
