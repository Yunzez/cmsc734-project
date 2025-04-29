import {
  startRenderVisualization,
  renderAirportOnMap,
} from "../visualization/index.js";
import { createDropDown } from "../dropdown/index.js";
export function createMap(
  containerId,
  options = {},
  parentContainer,
  visualizationTarget
) {
  function handleSearchSelection(selectedItem) {
    const { city, county, state } = selectedItem;

    console.log(
      "Searching for state/county feature for selection:",
      state,
      county
    );

    let matchedFeature = null;

    // Priority: county layer first if available
    if (countyLayer) {
      countyLayer.eachLayer((l) => {
        const props = l.feature?.properties;
        if (!props) return;

        const matchState =
          props.ste_name?.join("") || props.ste_name || props.state_name;
        const matchCounty =
          props.coty_name?.join("") || props.coty_name || props.county_name;

        if (
          matchState?.toLowerCase() === state.toLowerCase() &&
          matchCounty?.toLowerCase().includes(county.toLowerCase())
        ) {
          matchedFeature = l.feature;
        }
      });
    }

    if (matchedFeature) {
      parentContainerToggle([matchedFeature, state, county]);
    } else {
      console.warn("No matching feature found for", selectedItem);
    }
  }

  createDropDown(
    "mainSearchInput",
    "mainSearchDropdown",
    handleSearchSelection
  );

  const map = L.map(containerId, {
    maxZoom: 16,
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
    zoomInMapToThislayer(target[0]);
    startRenderVisualization(visualizationTarget, map);
  }

  function zoomInMapToThislayer(matchedFeature) {
    let dynamicCountyLayerGroup = null;
    const tempLayer = L.geoJSON(matchedFeature);
    let attachCounties = false;
    console.log(
      "matchedFeature",
      matchedFeature,
      matchedFeature.properties.coty_name
    );
    if (matchedFeature.properties.coty_name === undefined) {
      attachCounties = true;
      console.log("state layer is active");
    }
    // Remove old abstract layer if exists
    if (activeLayer) {
      map.removeLayer(activeLayer);
      activeLayer = null;
    }
    activeLayer = L.geoJSON(matchedFeature, {
      style: {
        color: "#38a1db", // blue-green border
        weight: 4,
        fillOpacity: 0.2,
      },
    }).addTo(map);
    matchedFeature.properties._id = "map-highlight-layer";
    map.fitBounds(tempLayer.getBounds(), {
      padding: [20, 20],
    });

    if (attachCounties) {
      console.log("state name:", matchedFeature);
      const selectedState = matchedFeature.properties.NAME.toLowerCase();

      const matchingCountyFeatures = [];

      countyLayer.eachLayer((l) => {
        const props = l.feature?.properties;
        const steName = props?.ste_name;

        let stateName = "";
        if (Array.isArray(steName)) {
          stateName = steName[0];
        } else {
          stateName = steName;
        }

        if (stateName && stateName.toLowerCase() === selectedState) {
          matchingCountyFeatures.push(l.feature);
        }
      });
      console.log("filtered counties", matchingCountyFeatures);

      // ✅ Now add these counties to the map
      if (matchingCountyFeatures.length > 0) {
        dynamicCountyLayerGroup = L.geoJSON(matchingCountyFeatures, {
          style: {
            color: "#4dabf7", // calm blue
            weight: 2,
            fillOpacity: 0.2,
          },
          onEachFeature: function (feature, layer) {
            // Highlight style on hover
            layer.on({
              mouseover: function (e) {
                e.target.setStyle({
                  weight: 3,
                  color: "#ffd43b", // bright yellow on hover
                  fillOpacity: 0.4,
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  e.target.bringToFront(); // bring hovered county to front
                }
              },
              mouseout: function (e) {
                dynamicCountyLayerGroup.resetStyle(e.target); // Reset back to default style
              },
              click: function (e) {
                console.log("Clicked on county:", feature.properties.coty_name);

                map.removeLayer(dynamicCountyLayerGroup);
                dynamicCountyLayerGroup = null;
               

                parentContainerToggle([
                  feature,
                  feature.properties.ste_name,
                  feature.properties.coty_name,
                ]);
              },
            });
          },
        }).addTo(map);
      }
    }
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
