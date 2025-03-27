import {startRenderVisualization} from "../visualization/index.js";
export function createMap(
  containerId,
  options = {},
  parentContainer,
  visualizationTarget
) {
  const map = L.map(containerId, {
    maxZoom: 11,
    minZoom: 4,
    maxBounds: [
      [24.396308, -125.0], // Southwest coordinates
      [49.384358, -66.93457], // Northeast coordinates
    ],
    maxBoundsViscosity: 1.0,
  }).setView(options.center || [40.868, -110.955], options.zoom || 11);

  // Base tile layers
  const baseLayers = {
    OpenStreetMap: L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map),

    Satellite: L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      }
    ),

    StamenToner: L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      }
    ),
  };

  let countyLayer = null;
  let stateLayer = null;
  let activeLayer = null; // Track the currently displayed layer
  function parentContainerToggle(target) {
    if (!target) return;
    if (!parentContainer.classList.contains("showVis")) {
      parentContainer.classList.add("showVis");
    }

    console.log("setting visualization target", target);
    visualizationTarget = target;
    startRenderVisualization(visualizationTarget);
  }
  // Function to create a GeoJSON layer
  function loadGeoJSON(url, type) {
    return fetch(url)
      .then((response) => response.json())
      .then((geojson) => {
        return L.geoJSON(geojson, {
          style: type === "state" ? stateLayerStyle : countyLayerStyle,
        });
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
        return null;
      });
  }

  let stateLayerStyle = {
    color: "#ff6b6b", // soft red
    weight: 1.5,
    fillOpacity: 0.2,
  };

  let stateHighlightStyle = {
    weight: 3,
    color: "#ffd43b", // bright yellow
    fillOpacity: 0.4,
  };

  let countyLayerStyle = {
    color: "#4dabf7", // calm blue
    weight: 1,
    fillOpacity: 0.15,
  };

  let countyHighlightStyle = {
    weight: 2.5,
    color: "#74c0fc", // lighter blue
    fillOpacity: 0.3,
  };

  // Load county and state layers
  Promise.all([
    loadGeoJSON("../../../data/map/county.geojson", "county"),
    loadGeoJSON("../../../data/map/state.geojson", "state"),
  ]).then(([loadedCountyLayer, loadedStateLayer]) => {
    countyLayer = loadedCountyLayer;
    stateLayer = loadedStateLayer;

    if (countyLayer) {
      attachLayerEvents(countyLayer, "county");
    }

    if (stateLayer) {
      attachLayerEvents(stateLayer, "state");
      stateLayer.addTo(map);
      activeLayer = stateLayer;
    }
  });

  // Function to switch layers manually
  function switchLayer(layerType) {
    if (!countyLayer || !stateLayer) return;
    console.log("switch layers to ", layerType);
    const targetLayer = layerType === "state" ? stateLayer : countyLayer;

    if (activeLayer === targetLayer) return;

    map.removeLayer(activeLayer);
    activeLayer = targetLayer;
    attachLayerEvents(activeLayer, layerType);
    activeLayer.addTo(map);
    // activeLayer.setStyle({ opacity: 0.8, fillOpacity: 0.1 });
    activeLayer.bringToFront();
  }

  function attachLayerEvents(layer, type) {
    const highlightStyle =
      type === "state" ? stateHighlightStyle : countyHighlightStyle;

    layer.eachLayer((l) => {
      if (l.feature?.properties?.coty_name || l.feature?.properties?.NAME) {
        let label =
          type === "state"
            ? l.feature.properties.NAME
            : l.feature.properties.coty_name_long.join(", ") +
              ", " +
              l.feature.properties.ste_name.join("");

        l.bindTooltip(label, {
          sticky: true,
          direction: "top",
          offset: [0, -10],
          opacity: 0.95,
          className: "custom-tooltip-map ",
        });

        l.on("mouseover", (e) => {
          e.target.setStyle(highlightStyle);
          e.target.openPopup();
        });

        l.on("mouseout", (e) => {
          layer.resetStyle(e.target);
          e.target.closePopup();
        });

        l.on("click", (e) => {
          const props = e.target.feature?.properties;
          console.log("Clicked on", type, ":", props.name || props.NAME);
          if (!props) return;

          if (type === "county") {
            parentContainerToggle([l.feature, props.ste_name, props.coty_name]);
          } else {
            parentContainerToggle([l.feature, props.NAME]);
          }
        });
      }
    });
  }

  // Add event listeners for custom buttons
  document
    .getElementById("groupByState")
    .addEventListener("click", () => switchLayer("state"));
  document
    .getElementById("groupByCounty")
    .addEventListener("click", () => switchLayer("county"));

  // Add layer control to switch between base layers
  L.control.layers(baseLayers).addTo(map);

  return map;
}
