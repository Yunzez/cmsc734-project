import { getStateNameFromAbbr } from "../../utils.js";
import { getAssetPath } from "../../utils.js";
let globalHeatmapLayer = null;
let countyToLayerMap = {};
let highlighted_layer = null;

const crimeNameMapping = {
  ROBBERY: "Robbery",
  MVTHEFT: "Motor Vehicle Theft",
  LARCENY: "Larceny-Theft",
  ARSON: "Arson",
  AGASSLT: "Aggravated Assault",
  MURDER: "Murder",
  BURGLRY: "Burglary",
};

export function createSafetyVis(
  mapDiv,
  state,
  county,
  globalMap,
  heatmapLayer
) {
  globalHeatmapLayer = heatmapLayer;
  const container = document.createElement("div");
  const title = document.createElement("div");
  title.id = "safety-title";
  container.id = "safety-vis";
  mapDiv.appendChild(title);
  mapDiv.appendChild(container);

  const csvPath = getAssetPath("/data/crime/crime_data_county.csv");
  d3.csv(csvPath, d3.autoType).then((data) => {
    const isCountyLevel = county.length > 0;
    if (!isCountyLevel) {
      let heatmap = heatmapLayer;
      heatmap.eachLayer((layer) => {
        console.log("County:", layer._countyId); // now this will work
        countyToLayerMap[layer._countyId] = layer;
      });
    }
    console.log("state name", state);
    const matchedRows = data.filter((d) => {
      if (!d.county_name) return false;
      const [countyPart, stateAbbr] = d.county_name.split(",");
      if (!stateAbbr) return false;
      const cleanedState = getStateNameFromAbbr(stateAbbr.trim()).toLowerCase();

      if (isCountyLevel) {
        const cleanedCounty = countyPart
          .replace("County", "")
          .trim()
          .toLowerCase();
        console.log(
          county.toLowerCase().replace("County", "").trim(),
          state.toLowerCase()
        );
        console.log(cleanedCounty, cleanedState);
        return (
          cleanedCounty === county.replace("County", "").trim().toLowerCase() &&
          cleanedState === state.toLowerCase()
        );
      } else {
        console.log(cleanedState, stateAbbr);
        return cleanedState.toLowerCase() === state.toLowerCase();
      }
    });

    if (!matchedRows.length) {
      console.log("No crime data found for", county || state);
      return;
    }
    console.log("user has county: ", isCountyLevel);
    if (isCountyLevel) {
      renderCrimeChart(container, matchedRows[0], `${county}, ${state}`);
    } else {
      renderCrimeChart(container, matchedRows, state);
    }
  });
}

let topLevelNode = null;
let subLevelNode = null;
function renderCrimeChart(container, crimeInput, titleLabel) {
  const tooltip = document.createElement("div");
  if (!document.getElementById("safty-tooltip")) {
    tooltip.id = "safty-tooltip";
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

  const crimeCategories = [
    "MURDER",
    "ROBBERY",
    "AGASSLT",
    "BURGLRY",
    "LARCENY",
    "MVTHEFT",
    "ARSON",
  ];

  const isStateLevel = Array.isArray(crimeInput);

  const width = container.offsetWidth;
  const height = 800;
  const heightOffset = isStateLevel ? 0 : 10;
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };

  if (!isStateLevel) {
    const titleText = document.createElement("span");
    titleText.innerHTML = `<b class="vis-title">Aggregated Bar Chart of Crimes in ${titleLabel}</b>`;
    container.appendChild(titleText);
  }

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [0, heightOffset, width, height + heightOffset])
    .attr("width", width)
    .attr("height", height);

  if (!isStateLevel) {
    // 📊 Simple bar chart for county-level
    const data = crimeCategories.map((cat) => ({
      type: crimeNameMapping[cat],
      count: crimeInput[cat] || 0,
    }));

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.type))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.type))
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => y(0) - y(d.count))
      .attr("width", x.bandwidth())
      .attr("fill", "#4dabf7");
  } else {
    // 📊 Stacked bar chart for state-level
    const hierarchyData = {
      name: "Crime",
      children: crimeCategories.map((cat) => ({
        name: cat,
        children: crimeInput
          .map((row) => {
            const county = row.county_name.split(",")[0].trim();
            return {
              name: county,
              dataValue: row[cat] || 0,
              value: Math.log2(row[cat] || 1), // Taking log10 of actual value, using 1 as the floor to avoid log(0)
            };
          })
          .filter((d) => d.value > 0),
      })),
    };

    console.log("hierarchyData:", hierarchyData);
    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);

    const treemap = d3.treemap().size([width, height]).padding(2);
    treemap(root);

    let currentNode = root;
    let topLevelNode = root;
    const g = svg.append("g").attr("class", "treemap-group");
    const colorInterpolator = d3.piecewise(d3.interpolateRgb.gamma(2.2), [
      "#cccccc", "#808080", "#333333"
    ]);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(crimeCategories);
    const maxCountyValue = d3.max(root.leaves(), (d) => d.value);
    const colorScale = d3
      .scaleSequential()
      .domain([1, maxCountyValue]) // use 1 as the floor to avoid log(0)
      .interpolator(colorInterpolator);
    function render(node, sub = false) {
      const backBtn = document.getElementById("crime-back-btn");
      if (sub && backBtn) {
        console.log("set back button")
        backButton.innerText = "← Back";
        backButton.className = "btn btn-secondary btn-sm me-2";
        backButton.style = "display: block";
        backButton.onclick = () => {
          backButton.style = "display: none";
          render(topLevelNode, false);
         
        };
      } 
     
      console.log("rendering node", node);
      currentNode = node;

      // Apply treemap layout to current node
      treemap(node);

      const nodes = g
        .selectAll("g.treemap-node")
        .data(node.children || [], (d) => d.data.name);

      const nodeEnter = nodes.enter().append("g").attr("class", "treemap-node");

      nodeEnter
        .append("rect")
        .style("pointer-events", "all")
        .attr(
          "fill",
          (d) =>
            d.children
              ? color(d.data.name) // top-level category
              : colorScale(d.value) // county-level, consistent brightness
        )
        .attr("cursor", (d) => (d.children ? "pointer" : "default"))
        .on("click", (event, d) => {
          console.log("clicked", d);
          if (!d.children) return;
          const newRoot = d3
            .hierarchy(d.data)
            .eachBefore((d) => {
              d.dataValue = d.data.dataValue ?? 0; // bring dataValue to root if present
            })
            .sum((d) => d.value || 0)
            .sort((a, b) => b.value - a.value);

          treemap(newRoot);
          g.selectAll("*").remove();
          render(newRoot, true);
        })
        .on("mouseover", (event, d) => {
          highlightCounty(d.data.name);
          d3.select("#safty-tooltip")
            .style("opacity", d.children ? 0 : 1)
            .style("left", `${event.pageX - tooltip.offsetWidth}px`)
            .style("top", `${event.pageY - tooltip.offsetHeight}px`)
            .html(
              d.children
                ? `<strong>${crimeNameMapping[d.data.name]}</strong>`
                : `<strong>${
                    crimeNameMapping[d.parent.data.name]
                  }</strong><br/>${d.data.name}: ${d.dataValue}`
            );
        })
        .on("mouseout", () => {
          d3.select("#safty-tooltip").style("opacity", 0);
          removeHighlightCounty();
        });

      nodeEnter
        .append("text")
        .text((d) =>
          Object.keys(crimeNameMapping).includes(d.data.name)
            ? crimeNameMapping[d.data.name]
            : d.data.name
        )
        .style("font-size", "11px")
        .style("pointer-events", "none")
        .style("fill", "#fff")
        .style("text-shadow", "rgba(0, 0, 0, 1) 0px 1px 5px");

      const all = nodeEnter.merge(nodes);

      all
        .transition()
        .duration(600)
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

      all
        .select("rect")
        .transition()
        .duration(600)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0);

      all.select("text").attr("x", 4).attr("y", 14);

      nodes.exit().remove();
    }

    render(currentNode);
    let title = document.getElementById("safety-title");
    // title.innerHTML = `<b>Zoomable Treemap of Crimes in ${titleLabel}</b>`;

    let titleDiv = document.getElementById("safety-title");
    const titleContainer = document.createElement("div");
    titleContainer.style.display = "flex";
    titleContainer.style.justifyContent = "space-between";
    titleContainer.style.alignItems = "center";

    const titleText = document.createElement("span");
    titleText.innerHTML = `<b class="vis-title">Zoomable Treemap of Crimes in ${titleLabel}</b>`;
    titleContainer.appendChild(titleText);

    const backButton = document.createElement("button");
    backButton.id = "crime-back-btn"
    titleContainer.appendChild(backButton);
    titleDiv.innerHTML = "";
    titleDiv.appendChild(titleContainer);
  }
}

function highlightCounty(countyName) {
  countyName = countyName.toLowerCase().replace("county", "").trim();
  const countyId = countyName.trim().toLowerCase();
  const layer = countyToLayerMap[countyId];
  if (!layer) return;
  layer.setStyle({
    weight: 5,
    color: "#ffcc00",
    fillOpacity: 0.9,
  });
  highlighted_layer = layer;
}

function removeHighlightCounty() {
  globalHeatmapLayer.resetStyle(highlighted_layer);
}
