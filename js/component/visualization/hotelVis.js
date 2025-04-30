let opennedNode = null;
let selectedRating = null;
let localStateName = null; // this is for to reset view from bubbles
let localCountyName = null; // this is for to reset view from bubbles
let initialized = false;
const FACILITY_CATEGORIES = {
  "Free WiFi": /wifi/i,
  Breakfast: /breakfast/i,
  Accessible: /(wheelchair|accessible|roll-in|in-room accessibility)/i,
  Parking: /(self parking|off-street|parking)/i,
};

export function createHotelVis(
  parentContainer,
  state,
  county,
  filteredData = null,
  globalMap
) {
  // ! if there is already a visualization, we return since it could be a reset from back btn
  if (document.getElementById("hotel-vis") !== null) {
    return;
  }

  const container = document.createElement("div");
  container.id = "hotel-vis";
  parentContainer.appendChild(container);
  const filterContainer = document.createElement("div");
  filterContainer.id = "hotel-feature-filters";
  const tabs = document.createElement("div");
  tabs.className = "tabs";
  filterContainer.appendChild(tabs);
  const features = ["All", "Free WiFi", "Breakfast", "Accessible", "Parking"];
  features.forEach((feature) => {
    const checkbox = document.createElement("input");
    if (feature === "All") {
      checkbox.checked = true;
    }
    checkbox.type = "radio";
    checkbox.name = "tabs";
    checkbox.id = `feature-${feature.replace(/\s+/g, "-").toLowerCase()}`;
    checkbox.value = feature;
    checkbox.className = "feature-checkbox";

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = feature;
    label.className = "tab";
    label.setAttribute("data-feature", feature);

    checkbox.addEventListener("click", () => {
      if (checkbox.checked) {
        checkbox.classList.add("active-feature");
      } else {
        checkbox.classList.remove("active-feature");
      }
    });

    tabs.appendChild(checkbox);
    tabs.appendChild(label);
  });
  const glider = document.createElement("span");
  glider.className = "glider";

  tabs.appendChild(glider);
  container.appendChild(filterContainer);

  //   const container = parentContainer;
  console.log("Creating hotel visualization for", state);
  const data_state = String(state).replace(/\s+/g, "_");
  const csvPath = `../../../data/hotel/state_hotels/${data_state}_hotel.csv`;

  const loadData = filteredData
    ? Promise.resolve(filteredData)
    : d3.csv(
        `../../../data/hotel/state_hotels/${String(state).replace(
          /\s+/g,
          "_"
        )}_hotel.csv`,
        d3.autoType
      );

  loadData.then((data) => {
    const rawData = data.filter((d) => d.StarRating >= 1 && d.StarRating <= 5);
    const width = parentContainer.offsetWidth;
    const height = 600;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "hotel-vis-svg")
      .attr("width", width)
      .attr("height", height);

    const pack = d3.pack().size([width, height]).padding(10);
    function renderBubbles(filteredData) {
      const grouped = d3.rollups(
        filteredData,
        (v) => v,
        (d) => d.StarRating
      );

      const starGroups = grouped
        .map(([rating, hotels]) => ({
          rating,
          hotels,
          count: hotels.length,
        }))
        .sort((a, b) => a.rating - b.rating);

      const root = d3
        .hierarchy({ children: starGroups })
        .sum((d) => Math.log(d.count + 1));
      pack(root);

      const countExtent = d3.extent(starGroups, (d) => d.count);
      const colorScale = d3
        .scaleSequential()
        .domain(countExtent)
        .interpolator(d3.interpolateBlues);

      const nodes = svg
        .selectAll("g.star-node")
        .data(root.children, (d) => d.data.rating);

      const nodeEnter = nodes
        .enter()
        .append("g")
        .attr("class", "hotel-bubble star-node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer");

      nodeEnter.append("circle").attr("class", "hotel-count-bubble");
      nodeEnter.append("text").attr("class", "hotel-count-label");

      const allNodes = nodeEnter.merge(nodes);

      allNodes
        .transition()
        .duration(400)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      allNodes
        .select("circle")
        .transition()
        .duration(400)
        .attr("r", (d) => d.r)
        .attr("fill", (d) => colorScale(d.data.count))
        .attr("opacity", 0.8);

      allNodes
        .select("text")
        .text((d) => `${d.data.rating}★\n(${d.data.count})`)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .style("z-index", 1000)
        .style("fill", (d) => {
          const bg = d3.rgb(colorScale(d.data.count));
          const brightness = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
          return brightness > 160 ? "#000" : "#fff";
        });

      allNodes
        .select("circle")
        .style("cursor", "pointer")
        .style("pointer-events", "all")
        .on("click", (e, d) => {
          e.preventDefault();
          opennedNode = d3.select(e.currentTarget);
          showHotels(svg, starGroups, d.data.rating, globalMap);
        });

      nodes.exit().remove();
    }

    function filterByFeature(feature) {
      if (feature === "All") return renderBubbles(rawData);

      const regex = FACILITY_CATEGORIES[feature];
      const filtered = rawData.filter((d) =>
        regex.test(d.HotelFacilities || "")
      );
      renderBubbles(filtered);
    }
    // attach functionality to labels
    const labels = Array.from(tabs.querySelectorAll("label.tab"));

    labels.forEach((label, i) => {
      label.addEventListener("click", () => {
        glider.style.transform = `translateX(${i * 100}%)`;
        const selected = label.getAttribute("data-feature");
        filterByFeature(selected);
      });
    });
    // Initial render
    renderBubbles(rawData);

    createBackBtn(svg, width, height, [], globalMap);
    svg.selectAll("g.back-button").style("display", "none");
  });
}

function createBackBtn(svg, width, height, starGroups, globalMap) {
  const backButton = svg
    .append("g")
    .attr("class", "back-button")
    .attr("transform", `translate(${width - 100}, ${height - 30})`)
    .style("cursor", "pointer")
    .style("pointer-events", "visible");

  backButton
    .append("rect")
    .attr("width", 100)
    .attr("height", 30)
    .attr("rx", 6)
    .attr("fill", "#555");

  backButton
    .append("text")
    .text("← Back")
    .attr("x", 50)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .style("font-size", "14px");

  backButton.on("click", (e) => {
    e.preventDefault();
    opennedNode.on("click", (e, d) => {
      e.preventDefault();
      opennedNode.on("click", null);
      showHotels(svg, starGroups, d.data.rating, globalMap);
    });
    resetView(svg, starGroups, globalMap);
  });
}

function resetView(svg, starGroups, globalMap) {
  svg.selectAll(".hotel-count-label").style("display", "block");
  const trivialElements = document.getElementsByClassName("trival");
  if (trivialElements.length > 0) {
    Array.from(trivialElements).forEach((d) => d.remove());
  }
  console.log("Resetting view");
  selectedRating = null;
  renderHotelOnMap(localStateName, localCountyName, globalMap);
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const pack = d3.pack().size([width, height]).padding(10);
  const root = d3.hierarchy({ children: starGroups }).sum((d) => d.count);
  pack(root);

  svg.selectAll("g.star-node").each(function (d, i) {
    const g = d3.select(this);
    g.transition()
      .duration(600)
      .attr("transform", `translate(${d.x}, ${d.y}) scale(1)`);

    g.select("circle").transition().duration(600).attr("opacity", 0.8);
    g.on("click", (e, d) =>
      showHotels(svg, starGroups, d.data.rating, globalMap)
    );
  });

  svg.selectAll("g.hotel-pack").remove();
  // svg.selectAll("g.back-button").remove();
  svg.selectAll("g.back-button").style("display", "none");
}

function showHotels(svg, starGroups, focusedRating, globalMap) {
  console.log("Clicked on", focusedRating);
  selectedRating = focusedRating;
  svg.selectAll("g.back-button").style("display", "block");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const focus = starGroups.find((d) => d.rating === focusedRating);
  if (!focus) return;

  const fixedRadius = 2.5;

  // Locate & raise the focus node
  svg.selectAll("g.star-node").each(function (d) {
    const g = d3.select(this);
    svg.selectAll(`.hotel-count-label`).style("display", "none");

    if (d.data.rating === focusedRating) {
      const R = d.r;

      g.raise()
        .transition()
        .duration(600)
        .attr("transform", `translate(${width / 2}, ${height / 2}) scale(2.5)`);
      const maxShown = 200;
      const hotels = focus.hotels.slice(0, maxShown).map((h) => ({
        ...h,
        r: fixedRadius,
        x: 0,
        y: 0,
      }));

      if (focus.hotels.length > maxShown) {
        g.append("text")
        .attr("class", "trival")
          .attr("x", 0)
          .attr("y", R + 12)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", "#999")
          .text(`+ ${focus.hotels.length - maxShown} more hotels not shown`);
      }

      if (!document.getElementById("hotel-tooltip")) {
        const tooltip = document.createElement("div");
        tooltip.id = "hotel-tooltip";
        tooltip.style.position = "absolute";
        tooltip.style.opacity = 0;
        tooltip.style.background = "#fff";
        tooltip.style.padding = "6px 10px";
        tooltip.style.border = "1px solid #ccc";
        tooltip.style.borderRadius = "6px";
        tooltip.style.fontSize = "12px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
        document.body.appendChild(tooltip);
      }

      const hotelG = g
        .append("g")
        .attr("class", "hotel-pack")
        .attr("transform", `translate(${-R}, ${-R})`);

      const circles = hotelG
        .selectAll("circle")
        .data(hotels)
        .enter()
        .append("circle")
        .attr("r", (d) => d.r)
        .attr("fill", "#339af0")
        .attr("opacity", 0.8)
        .on("mouseover", function (e, d) {
          console.log("Hovered over", d);
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", d.r * 1.4);

          const tooltip = d3.select("#hotel-tooltip");
          tooltip
            .style("opacity", 1)
            .style("left", `${e.pageX + 10}px`)
            .style("top", `${e.pageY}px`)
            .html(`<strong>${d.HotelName}</strong><br/>⭐ ${d.StarRating}`);
        })
        .on("mouseout", function (e, d) {
          d3.select(this).transition().duration(150).attr("r", d.r);
          d3.select("#hotel-tooltip").style("opacity", 0);
        });

      const sim = d3
        .forceSimulation(hotels)
        .alpha(1) // initial energy
        .alphaDecay(0.08) // faster decay (default is 0.0228)
        .force("center", d3.forceCenter(0, 0))
        .force("collide", d3.forceCollide(fixedRadius + 1))
        .force("x", d3.forceX(0).strength(0.05))
        .force("y", d3.forceY(0).strength(0.05))
        .on("tick", () => {
          for (const d of hotels) {
            const dist = Math.sqrt(d.x * d.x + d.y * d.y);
            const maxDist = R - d.r;
            if (dist > maxDist) {
              const angle = Math.atan2(d.y, d.x);
              d.x = Math.cos(angle) * maxDist;
              d.y = Math.sin(angle) * maxDist;
            }
          }
          circles.attr("cx", (d) => R + d.x).attr("cy", (d) => R + d.y);
        });
    } else {
      // Dim others
      g.transition()
        .duration(700)
        .attr("transform", `translate(${d.x}, ${d.y}) scale(0.8)`);

      g.select("circle").transition().duration(700).attr("opacity", 0.3);
      g.on("click", null);
    }
  });

  addAllHotels(focus.hotels, globalMap);
}

let hotelLayerGroup = null;
function addAllHotels(hotelsData, map) {
  if (hotelLayerGroup !== null) {
    map.removeLayer(hotelLayerGroup);
  }
  hotelLayerGroup = L.markerClusterGroup();
  if (!Array.isArray(hotelsData)) {
    console.error("Hotels data is invalid");
    return;
  }

  hotelsData.forEach((hotel) => {
    if (
      hotel.Latitude == null ||
      hotel.Longitude == null ||
      isNaN(Number(hotel.Latitude)) ||
      isNaN(Number(hotel.Longitude)) ||
      (selectedRating !== null && selectedRating !== hotel.StarRating)
    )
      return;
    const marker = L.marker([hotel.Latitude, hotel.Longitude], {
      title: hotel.HotelName,
    });

    const popupContent = `
          <b>${hotel.HotelName}</b><br/>
          ${hotel.StarRating ? `⭐ ${hotel.StarRating} stars` : ""}<br/>
          ${hotel.Address || ""}<br/>
          <a href="https://www.google.com/search?q=${encodeURIComponent(
            hotel.HotelName + " " + hotel.State
          )}" target="_blank" rel="noopener noreferrer">Website</a>
        `;

    marker.bindPopup(popupContent);
    hotelLayerGroup.addLayer(marker);
  });
  if (map) {
    console.log("Adding hotel layer to map");
  }
  hotelLayerGroup.addTo(map);
}

export function removeHotelOnMap(globalMap) {
  globalMap.removeLayer(hotelLayerGroup);
  hotelLayerGroup = null;
}

export function renderHotelOnMap(stateName, countyName, globalMap) {
  localStateName = stateName;
  localCountyName = countyName;
  const filename = `data/hotel/state_hotels/${stateName.replaceAll(
    " ",
    "_"
  )}_hotel.csv`;

  let countyLayer = null;
  console.log("globalMap check", globalMap);
  globalMap.eachLayer((layer) => {
    if (
      layer.feature &&
      layer.feature.properties &&
      layer.feature.properties._id === "map-highlight-layer"
    ) {
      countyLayer = layer.feature;
    }
  });

  console.log("countyLayer", countyLayer);

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

    // filter hotels inside the selected county
    const filteredHotels = hotelData.filter((hotel) => {
      if (
        hotel.lat == null ||
        hotel.lon == null ||
        isNaN(hotel.lat) ||
        isNaN(hotel.lon)
      )
        return false;

      const point = turf.point([hotel.lon, hotel.lat]);
      return turf.booleanPointInPolygon(point, countyLayer);
    });

    addAllHotels(filteredHotels, globalMap);

    const mapDiv = document.getElementById("vis-overall");
    createHotelVis(mapDiv, stateName, countyName, filteredHotels, globalMap);
  });
}
