// visualization/historyVis.js
import { getStateAbbrFromName } from "../../utils.js";

let historyLayer = null;

const GOOGLE_API_KEY = "API"; // Replace with your key

async function fetchLatLngFromGoogle(city, county, state) {
    const query = `${city}, ${county} County, ${state}, USA`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return [loc.lat, loc.lng];
        } else {
            console.warn("⚠️ Google Maps Geocoding failed:", data.status);
        }
    } catch (err) {
        console.warn("🌐 Google Maps request error:", err);
    }
    return null;
}

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
    const fullFragment = fragment0.trim().slice(0, -1) + "," + fragment1.trim().slice(1);

    let parsedFragment;
    try {
        parsedFragment = JSON.parse(fullFragment);
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

function convertPolygonLikeFeature(feature) {
    const coords = feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

    const converted = coords.map(polygon =>
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
    const props = f.properties || {};
    const stateValue = props.STATE || props.State || props.state || null;
    if (!stateValue) return null;

    const raw = stateValue.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(raw)) return raw;

    const nameToAbbr = {
        "ALABAMA": "AL", "ALASKA": "AK", "AMERICAN SAMOA": "AS", "ARIZONA": "AZ", "ARKANSAS": "AR",
        "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE", "DISTRICT OF COLUMBIA": "DC",
        "FLORIDA": "FL", "GEORGIA": "GA", "GUAM": "GU", "HAWAII": "HI", "IDAHO": "ID",
        "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS", "KENTUCKY": "KY",
        "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD", "MASSACHUSETTS": "MA", "MICHIGAN": "MI",
        "MINNESOTA": "MN", "MISSISSIPPI": "MS", "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE",
        "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
        "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "NORTHERN MARIANA ISLANDS": "MP", "OHIO": "OH",
        "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA", "PUERTO RICO": "PR", "RHODE ISLAND": "RI",
        "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
        "VERMONT": "VT", "VIRGIN ISLANDS": "VI", "VIRGINIA": "VA", "WASHINGTON": "WA",
        "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY"
    };

    return nameToAbbr[raw] || null;
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
        return featureState === stateAbbr;
    });
    console.log(`🏛️ Found ${filtered.length} historical features in ${stateAbbr}`);

    if (!filtered.length) return;

    if (window._historyLayer) {
        globalMap.removeLayer(window._historyLayer);
    }

    const converted = await Promise.all(filtered.map(async f => {
        if (!f.geometry) {
            const city = f.properties.City || f.properties.CITY;
            const county = f.properties.County || f.properties.COUNTY;
            const state = f.properties.State || f.properties.STATE;

            if (city && county && state) {
                const latlng = await fetchLatLngFromGoogle(city, county, state);
                if (latlng) {
                    return {
                        type: "Feature",
                        properties: f.properties,
                        geometry: {
                            type: "Point",
                            coordinates: [latlng[1], latlng[0]]
                        }
                    };
                }
            }
            console.warn("⚠️ Feature with null geometry skipped", f);
            return null;
        }

        const type = f.geometry.type;
        if (type === "Point") return convertPointFeature(f);
        if (type === "MultiPolygon" || type === "Polygon") return convertPolygonLikeFeature(f);
        console.warn("⚠️ Unsupported geometry type skipped:", type);
        return null;
    }));

    console.log("🧭 Converted features:", converted.filter(Boolean).length);

    historyLayer = L.geoJSON({ type: "FeatureCollection", features: converted.filter(Boolean) }, {
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
    console.log("✅ History layer added with", converted.filter(Boolean).length, "features.");
}

export function removeHistoryFromMap(globalMap) {
    if (window._historyLayer && globalMap.hasLayer(window._historyLayer)) {
        globalMap.removeLayer(window._historyLayer);
        console.log("🧹 Removed history layer");
    }
}
