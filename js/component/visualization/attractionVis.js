// visualization/attractionVis.js

import { getStateNameFromAbbr } from "../../utils.js";

let globalMapRef = null;
let siteNameToLayerMap = {};
let highlightedLayer = null;
let previousRoot = null;
let previousLabel = "";

export function createAttractionVis(containerDiv, stateName, globalMap) {
  globalMapRef = globalMap;
  containerDiv.innerHTML = "";

  const title = document.createElement("div");
  title.id = "attraction-title";
  containerDiv.appendChild(title);

  const visDiv = document.createElement("div");
  visDiv.id = "attraction-vis";
  containerDiv.appendChild(visDiv);

  const csvPath = "../../../data/visitor/min_visitor.csv";
  d3.csv(csvPath, d3.autoType).then((data) => {
    const filtered = data.filter(
      (d) => d.State?.trim().toLowerCase() === stateName.trim().toLowerCase()
    );

    if (!filtered.length) {
      console.warn("No attraction data for", stateName);
      return;
    }

    siteNameToLayerMap = {};
    if (window._parkLayer) {
      window._parkLayer.eachLayer((layer) => {
        const name = layer.feature.properties?.PARKNAME?.toLowerCase();
        if (name) siteNameToLayerMap[name] = layer;
      });
    }
    if (window._historyLayer) {
      window._historyLayer.eachLayer((layer) => {
        const name = layer.feature.properties?.Loc_Nm?.toLowerCase();
        if (name) siteNameToLayerMap[name] = layer;
      });
    }

    const totalVisitors = d3.sum(filtered, (d) => d.RecreationVisitors || 0);
    const topParks = filtered
      .filter((d) => d.RecreationVisitors > 0)
      .sort((a, b) => b.RecreationVisitors - a.RecreationVisitors);

    const root = d3
      .hierarchy({ name: "Total", children: topParks })
      .sum((d) => d.RecreationVisitors)
      .sort((a, b) => b.value - a.value);

    previousRoot = root;
    previousLabel = stateName;

    renderTreemap(root, visDiv, title, stateName, true);
  });
}

function renderTreemap(root, visDiv, titleDiv, label, isStateLevel = true) {
  visDiv.innerHTML = "";

  const width = visDiv.offsetWidth;
  const height = 500;

  const svg = d3
    .select(visDiv)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height);

  const treemap = d3.treemap().size([width, height]).padding(2);
  treemap(root);

  const colorScale = d3
    .scaleSequential(d3.interpolateYlGnBu)
    .domain([0, d3.max(root.leaves(), (d) => d.value)]);

  const g = svg.append("g").attr("class", "treemap-group");
  const nodes = g
    .selectAll("g.treemap-node")
    .data(root.leaves())
    .enter()
    .append("g")
    .attr("class", "treemap-node")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  nodes
    .append("rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => colorScale(d.value))
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      if (!isStateLevel) return;

      const metrics = [
        "RecreationVisitors",
        "RecreationVisitors%",
        "RecreationVisitorDays",
        "RecreationVisitorDays%",
        "NonRecreationVisitors",
        "NonRecreationVisitors%",
        "RecreationVisitorHours",
        "RecreationVisitorHours%",
        "NonRecreationVisitorHours",
        "NonRecreationVisitorHours%",
      ];

      const children = metrics
        .map((key) => ({
          name: key,
          value: Math.abs(d.data[key]) || 0,
        }))
        .filter((e) => e.value > 0);

      const newRoot = d3
        .hierarchy({ name: d.data.Park, children })
        .sum((d) => d.value || 0);

      highlightFeatureByName(d.data.Park);
      renderTreemap(newRoot, visDiv, titleDiv, d.data.Park, false);
    })
    .on("mouseover", (event, d) => {
      highlightFeatureByName(d.data.Park);
      showAttractionTooltip(event, d);
    })
    .on("mouseout", () => {
      removeHighlight();
      hideAttractionTooltip();
    });

  nodes
    .append("text")
    .attr("x", 4)
    .attr("y", 14)
    .text((d) => d.data.name || d.data.Park)
    .style("font-size", "10px")
    .style("fill", "#fff")
    .style("pointer-events", "none");

  titleDiv.innerHTML = `<b>Total Visitors in ${label}: ${root.value.toLocaleString()}</b>`;

  if (!isStateLevel) {
    const backButton = document.createElement("button");
    backButton.textContent = "← Back";
    backButton.className = "btn btn-secondary btn-sm mt-2";
    backButton.onclick = () => {
      renderTreemap(previousRoot, visDiv, titleDiv, previousLabel, true);
    };
    visDiv.prepend(backButton);
  }
}

function highlightFeatureByName(name) {
  const key = name?.toLowerCase();
  const layer = siteNameToLayerMap[key];
  if (!layer) return;

  layer.setStyle({
    weight: 4,
    color: "#f39c12",
    fillOpacity: 0.9,
  });

  if (!layer._map) {
    layer.addTo(globalMapRef);
  }

  highlightedLayer = layer;
}

function removeHighlight() {
  if (highlightedLayer) {
    highlightedLayer.setStyle({
      weight: 1.5,
      color: "#145A32",
      fillOpacity: 0.45,
    });
    highlightedLayer = null;
  }
}

function showAttractionTooltip(event, d) {
  let tooltip = document.getElementById("attraction-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "attraction-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.background = "white";
    tooltip.style.border = "1px solid gray";
    tooltip.style.padding = "6px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.fontSize = "12px";
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = `<b>${d.data.name || d.data.Park}</b><br/>Value: ${d.value.toLocaleString()}`;
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY}px`;
  tooltip.style.opacity = 1;
}

function hideAttractionTooltip() {
  const tooltip = document.getElementById("attraction-tooltip");
  if (tooltip) tooltip.style.opacity = 0;
}

export function removeAttractionVis() {
  const title = document.getElementById("attraction-title");
  const vis = document.getElementById("attraction-vis");
  if (title) title.remove();
  if (vis) vis.remove();
  removeHighlight();
}
