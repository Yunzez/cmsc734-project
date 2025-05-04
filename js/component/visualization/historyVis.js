// visualization/historyVis.js
import { getStateAbbrFromName } from "../../utils.js";
import { createAttractionVis, removeAttractionVis } from "./attractionVis.js";


let historyLayer = null;

async function loadAndMergeHistoryGeojson() {
    const path = "data/history/USA_Historic_Sites.geojson";

    const res = await fetch(path);
    const text = await res.text();
    try {
        const parsed = JSON.parse(text);
        console.log(`✅ Parsed: ${parsed.name || 'Unnamed'} (${parsed.features?.length || 0} features)`);
        return parsed;
    } catch (e) {
        console.warn("❌ Failed to parse USA_Historic_Sites.geojson:", e);
        return { type: "FeatureCollection", features: [] };
    }
}

function getFeatureStateAbbr(f) {
    const props = f.properties || {};
    const stateValue = props.STATE || props.State || props.state || props.State_Nm || null;
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

    if (!globalMap.getPane("historyPane")) {
        globalMap.createPane("historyPane");
        globalMap.getPane("historyPane").style.zIndex = 700;
    }

    const geojson = await loadAndMergeHistoryGeojson();

    const filtered = geojson.features.filter(f => {
        const featureState = getFeatureStateAbbr(f);
        return featureState === stateAbbr;
    });
    console.log(`🏛️ Found ${filtered.length} historical features in ${stateAbbr}`);

    if (!filtered.length) return;

    if (window._historyLayer) {
        globalMap.removeLayer(window._historyLayer);
    }

    const converted = filtered.map(f => {
        if (!f.geometry) {
            console.warn("⚠️ Feature with null geometry skipped", f);
            return null;
        }

        const type = f.geometry.type;
        if (type === "Point" || type === "MultiPolygon" || type === "Polygon") return f;

        console.warn("⚠️ Unsupported geometry type skipped:", type);
        return null;
    }).filter(Boolean);

    console.log("🧭 Converted features:", converted.length);

    historyLayer = L.geoJSON({ type: "FeatureCollection", features: converted }, {
        pane: "historyPane",
        style: (feature) => {
            if (feature.geometry.type === "Point") return null;
            const name = feature.properties.RES_NAME || feature.properties.UNIT_NAME || feature.properties.Unit_Nm || "";
            const isAlsoPark = parkNames.some(park => name.includes(park) || park.includes(name));
            return {
                color: isAlsoPark ? "#145A32" : "#B7950B",
                weight: 1.5,
                fillColor: isAlsoPark ? "#27ae60" : "#f1c40f",
                fillOpacity: 0.45
            };
        },
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                pane: "historyPane",
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
            const name = props.RES_NAME || props.UNIT_NAME || props.Unit_Nm || "Unnamed Historic Site";
            const comment = props.Comments;
            const commentHTML = comment && comment.startsWith("http") ? `<br/><a href="${comment}" target="_blank">Visit Website</a>` : "";
            const tooltip = `<strong>${name}</strong><br/>Type: Historic Site<br/>State: ${getFeatureStateAbbr(feature) || stateAbbr}${commentHTML}`;
            layer.bindTooltip(tooltip, {
                direction: "top",
                offset: [0, -8],
                className: "history-tooltip",
            });
        }
    });

    historyLayer.addTo(globalMap);
    window._historyLayer = historyLayer;
    console.log("✅ History layer added with", converted.length, "features.");

    const mapDiv = document.getElementById("vis-overall");
    createAttractionVis(mapDiv, stateName, globalMap);

}

export function removeHistoryFromMap(globalMap) {
    if (window._historyLayer && globalMap.hasLayer(window._historyLayer)) {
        globalMap.removeLayer(window._historyLayer);
        console.log("🧹 Removed history layer");
        removeAttractionVis();
    }
}



