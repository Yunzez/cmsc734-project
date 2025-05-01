// visualization/parkVis.js
import { getStateAbbrFromName } from "../../utils.js";

let parkLayer = null;

function fetchAndMergeParkGeojson() {
    return Promise.all([
        fetch("data/park/raw_park_a00b.geojson.frag0").then(res => res.text()),
        fetch("data/park/raw_park_a00b.geojson.frag1").then(res => res.text())
    ]).then(([part0, part1]) => {
        const fullText = part0 + part1;
        try {
            const parsed = JSON.parse(fullText);
            console.log("✅ Successfully parsed merged GeoJSON", parsed);
            return parsed;
        } catch (e) {
            console.error("❌ Failed to parse merged park geojson:", e);
            throw e;
        }
    });
}

function mercatorToLatLng([x, y]) {
    const R_MAJOR = 6378137.0;
    const lon = (x / R_MAJOR) * (180 / Math.PI);
    const lat = (2 * Math.atan(Math.exp(y / R_MAJOR)) - Math.PI / 2) * (180 / Math.PI);
    return [lat, lon];
}

function convertFeatureToLatLng(feature) {
    if (feature.geometry.type !== "MultiPolygon") return null;

    const converted = feature.geometry.coordinates.map(polygon =>
        polygon.map(ring =>
            ring.map(([x, y]) => {
                const [lat, lon] = mercatorToLatLng([x, y]);
                return [lon, lat]; // Leaflet expects [lng, lat]
            })
        )
    );

    return {
        type: "Feature",
        properties: feature.properties,
        geometry: {
            type: "MultiPolygon",
            coordinates: converted
        }
    };
}

export function renderParkOnMap(stateName, globalMap) {
    fetchAndMergeParkGeojson()
        .then((geojson) => {
            console.log("📦 Raw park geojson loaded", geojson);
            const allStates = [...new Set(geojson.features.map(f => f.properties.STATE))];
            console.log("✅ Available park states:", allStates);

            const stateAbbr = getStateAbbrFromName(stateName);
            if (!stateAbbr) {
                console.warn(`⚠️ Unknown state name: ${stateName}`);
                return;
            }

            const filtered = geojson.features.filter(f => {
                const stateCode = f.properties.STATE?.toUpperCase();
                return stateCode === stateAbbr;
            });

            console.log("🎯 Filtered park features:", filtered.map(f => f.properties.PARKNAME || f.properties.UNIT_NAME));
            console.log("🧩 Filtered geometry types:", [...new Set(filtered.map(f => f.geometry.type))]);

            if (!filtered.length) {
                console.warn(`⚠️ No park data found for ${stateName} (${stateAbbr})`);
                return;
            }

            // ✅ Create custom pane if not yet created
            if (!globalMap.getPane("parksPane")) {
                globalMap.createPane("parksPane");
                globalMap.getPane("parksPane").style.zIndex = 650;
            }

            // Remove old layer
            if (window._parkLayer) {
                globalMap.removeLayer(window._parkLayer);
            }

            const convertedFeatures = filtered.map(convertFeatureToLatLng).filter(Boolean);

            parkLayer = L.geoJSON(
                { type: "FeatureCollection", features: convertedFeatures },
                {
                    pane: "parksPane",  // 🟢 Use custom pane
                    style: {
                        color: "#145A32",
                        weight: 1.5,
                        fillColor: "#27ae60",
                        fillOpacity: 0.45,
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const name = props.PARKNAME || props.UNIT_NAME || props.name || "Unnamed Park";
                        const tooltipContent = `
                            <strong>${name}</strong><br/>
                            Type: ${props.UNIT_TYPE || "Unknown"}<br/>
                            State: ${props.STATE || stateAbbr}
                        `;
                        layer.bindTooltip(tooltipContent, {
                            direction: "top",
                            offset: [0, -8],
                            className: "park-tooltip",
                        });
                    }
                }
            );

            parkLayer.addTo(globalMap);
            window._parkLayer = parkLayer;

            console.log("✅ Park layer added with", filtered.length, "features.");
            console.log("🗺️ Current layers on map:", Object.keys(globalMap._layers));
        })
        .catch(err => {
            console.error("❌ Failed to load park geojson:", err);
        });
}

export function removeParkFromMap(globalMap) {
    if (window._parkLayer && globalMap.hasLayer(window._parkLayer)) {
        globalMap.removeLayer(window._parkLayer);
        console.log("🧹 Removed park layer from map");
    }
}
