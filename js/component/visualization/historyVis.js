// visualization/historyVis.js
import { getStateAbbrFromName } from "../../utils.js";

let historyLayer = null;

async function loadAndMergeHistoryGeojson() {
    const paths = [
        "data/history/raw_history_a012.geojson",
        "data/history/raw_history_a014.geojson",
        "data/history/raw_history_a015.geojson",
        "data/history/raw_history_a016.geojson",
        "data/history/raw_history_a017.geojson",
        "data/history/raw_history_a018.geojson",
        "data/history/raw_history_a019.geojson",
        "data/history/raw_history_a01a.geojson",
        "data/history/raw_history_a01b.geojson",
        "data/history/raw_history_a01e.geojson",
        "data/history/raw_history_a022.geojson",
    ];

    const fragment0 = await fetch("data/history/raw_history_a013.geojson.frag0").then(res => res.text());
    const fragment1 = await fetch("data/history/raw_history_a013.geojson.frag1").then(res => res.text());
    const combined = fragment0.trim();
    const fixed = combined.endsWith('}') ? combined.slice(0, -1) + fragment1.trim().slice(1) : combined + fragment1.trim();

    let parsedFragment;
    try {
        parsedFragment = JSON.parse(fixed);
        console.log("✅ Parsed .frag0 + .frag1", parsedFragment.features.length);
    } catch (e) {
        console.error("❌ JSON parse error in combined .frag013:", e);
        throw e;
    }

    const otherTexts = await Promise.all(paths.map(async p => {
        const res = await fetch(p);
        const text = await res.text();
        console.log("📦 Fetched:", p);
        return text;
    }));

    const otherFeatures = otherTexts.flatMap(text => {
        try {
            const parsed = JSON.parse(text);
            console.log(`✅ Parsed: ${parsed.name || 'Unnamed'} (${parsed.features?.length || 0} features)`);
            return parsed.features || [];
        } catch (e) {
            console.warn("⚠️ Skipping invalid JSON in others:", e);
            return [];
        }
    });

    const allFeatures = [...parsedFragment.features, ...otherFeatures];
    console.log("🧩 Total merged history features:", allFeatures.length);

    return { type: "FeatureCollection", features: allFeatures };
}

function mercatorToLatLng([x, y]) {
    const R_MAJOR = 6378137.0;
    const lon = (x / R_MAJOR) * (180 / Math.PI);
    const lat = (2 * Math.atan(Math.exp(y / R_MAJOR)) - Math.PI / 2) * (180 / Math.PI);
    return [lat, lon];
}

function convertMultiPolygonFeature(feature) {
    const converted = feature.geometry.coordinates.map(polygon =>
        polygon.map(ring =>
            ring.map(([x, y]) => {
                const [lat, lon] = mercatorToLatLng([x, y]);
                return [lon, lat];
            })
        )
    );

    return {
        type: "Feature",
        properties: feature.properties,
        geometry: {
            type: "MultiPolygon",
            coordinates: converted,
        },
    };
}

function convertPointFeature(feature) {
    const [x, y] = feature.geometry.coordinates;
    const [lat, lon] = mercatorToLatLng([x, y]);
    return {
        type: "Feature",
        properties: feature.properties,
        geometry: {
            type: "Point",
            coordinates: [lon, lat],
        },
    };
}

function getFeatureStateAbbr(f) {
    const keys = Object.keys(f.properties || {});
    const stateKey = keys.find(k => k.toLowerCase() === "state");
    if (!stateKey) return null;

    const rawValue = f.properties[stateKey]?.trim();
    if (!rawValue) return null;

    const upper = rawValue.toUpperCase();

    if (/^[A-Z]{2}$/.test(upper)) {
        const validStates = new Set([
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
            "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
            "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
            "WI", "WY", "DC"
        ]);
        return validStates.has(upper) ? upper : null;
    }

    return getStateAbbrFromName(rawValue);
}

export async function renderHistoryOnMap(stateName, globalMap, parkNames = []) {
    const stateAbbr = getStateAbbrFromName(stateName);
    if (!stateAbbr) {
        console.warn(`⚠️ Unknown state name: ${stateName}`);
        return;
    }

    const geojson = await loadAndMergeHistoryGeojson();
    console.log("📦 Full history GeoJSON loaded", geojson);

    const filtered = geojson.features.filter(f => {
        const featureState = getFeatureStateAbbr(f);
        const matched = featureState?.toUpperCase() === stateAbbr;
        if (!matched && featureState) {
            console.log("❌ Mismatch:", featureState, "vs", stateAbbr);
        }
        return matched;
    });
    console.log(`🏛️ Found ${filtered.length} historical features in ${stateAbbr}`);

    if (!filtered.length) return;

    if (window._historyLayer) {
        globalMap.removeLayer(window._historyLayer);
    }

    const converted = filtered.map(f => {
        if (!f.geometry) return null;
        if (f.geometry.type === "MultiPolygon") return convertMultiPolygonFeature(f);
        if (f.geometry.type === "Point") return convertPointFeature(f);
        console.warn("⚠️ Skipped unsupported geometry", f.geometry.type);
        return null;
    }).filter(Boolean);
    console.log("🧭 Converted features:", converted.length);

    historyLayer = L.geoJSON({ type: "FeatureCollection", features: converted }, {
        style: (feature) => {
            if (feature.geometry.type === "Point") return null;
            const name = feature.properties.RES_NAME || feature.properties.UNIT_NAME || "";
            const isAlsoPark = parkNames.some(park => name.includes(park) || park.includes(name));
            return {
                color: isAlsoPark ? "#145A32" : "#B7950B",
                weight: 1.5,
                fillColor: isAlsoPark ? "#27ae60" : "#f1c40f",
                fillOpacity: 0.45,
            };
        },
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                icon: L.divIcon({
                    html: "🏛️",
                    className: "history-icon",
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            });
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const name = props.RES_NAME || props.UNIT_NAME || "Unnamed Historic Site";
            const tooltip = `<strong>${name}</strong><br/>State: ${getFeatureStateAbbr(feature) || stateAbbr}`;
            layer.bindTooltip(tooltip, {
                direction: "top",
                offset: [0, -8],
                className: "history-tooltip",
            });
        }
    });

    historyLayer.addTo(globalMap);
    historyLayer.bringToFront();
    window._historyLayer = historyLayer;
    console.log("✅ History layer added with", converted.length, "features.");
}

export function removeHistoryFromMap(globalMap) {
    if (window._historyLayer && globalMap.hasLayer(window._historyLayer)) {
        globalMap.removeLayer(window._historyLayer);
        console.log("🧹 Removed history layer");
    }
}
