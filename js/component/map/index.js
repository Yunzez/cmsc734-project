export function createMap(containerId, options = {}) {
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

    // Function to create a GeoJSON layer
    function loadGeoJSON(url, color) {
        return fetch(url)
            .then((response) => response.json())
            .then((geojson) => {
                return L.geoJSON(geojson, {
                    style: { color: color, weight: 1, fillOpacity: 0.2 },
                    onEachFeature: function (feature, layer) {
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(feature.properties.name, {
                                closeButton: false,
                                autoClose: false,
                            });

                            layer.on("mouseover", function (e) {
                                e.target.openPopup();
                            });

                            layer.on("mouseout", function (e) {
                                e.target.closePopup();
                            });
                        }
                    },
                });
            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
                return null;
            });
    }

    let stateHighlightStyle = {
        weight: 3,
        color: "yellow",
    };

    let countyHighlightStyle = {
        weight: 3,
        color: "yellow",
    };

    // Load county and state layers
    Promise.all([
        loadGeoJSON("../../../data/map/county.geojson", "blue"),
        loadGeoJSON("../../../data/map/state.geojson", "red"),
    ]).then(([loadedCountyLayer, loadedStateLayer]) => {
        countyLayer = loadedCountyLayer;
        stateLayer = loadedStateLayer;

        if (countyLayer) {
            countyLayer.addTo(map); // Show county by default
            countyLayer.setStyle({ opacity: 0, fillOpacity: 0 });
        }

        if (stateLayer) {
            stateLayer.addTo(map); // Keep it on the map but hide initially
            activeLayer = stateLayer;
        }

        if (countyLayer && activeLayer === countyLayer) {
            console.log("Attaching events to countyLayer");
            countyLayer.eachLayer(function (layer) {
                layer.on("mouseover", function (e) {
                    e.target.setStyle(countyHighlightStyle);
                });

                layer.on("mouseout", function (e) {
                    countyLayer.resetStyle(e.target);
                });
            });
        }

        if (stateLayer && activeLayer === stateLayer) {
            console.log("Attaching events to stateLayer");
            stateLayer.eachLayer(function (layer) {
                layer.on("mouseover", function (e) {
                    e.target.setStyle(stateHighlightStyle);
                });

                layer.on("mouseout", function (e) {
                    stateLayer.resetStyle(e.target);
                });
            });
        }
    });

    // Function to switch layers manually
    function switchLayer(layerType) {
        if (!countyLayer || !stateLayer) return; // Ensure layers are loaded

        let targetLayer = layerType === "state" ? stateLayer : countyLayer;

        if (activeLayer === targetLayer) return; // Prevent redundant switching

        console.log(`Switching to ${layerType}`);

        // Fade out the current layer
        activeLayer.setStyle({ opacity: 0, fillOpacity: 0 });

        // Switch active layer
        activeLayer = targetLayer;

        // Fade in the new layer
        activeLayer.setStyle({ opacity: 0.8, fillOpacity: 0.1 });
        activeLayer.bringToFront();

        if (countyLayer && activeLayer === countyLayer) {
            console.log("Attaching events to countyLayer");
            countyLayer.eachLayer(function (layer) {
                layer.on("mouseover", function (e) {
                    e.target.setStyle(countyHighlightStyle);
                });

                layer.on("mouseout", function (e) {
                    countyLayer.resetStyle(e.target);
                });
            });
        }

        if (stateLayer && activeLayer === stateLayer) {
            console.log("Attaching events to stateLayer");
            stateLayer.eachLayer(function (layer) {
                layer.on("mouseover", function (e) {
                    e.target.setStyle(stateHighlightStyle);
                });

                layer.on("mouseout", function (e) {
                    stateLayer.resetStyle(e.target);
                });
            });
        }
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
