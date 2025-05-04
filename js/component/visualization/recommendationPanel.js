// // recommendationPanel.js

// import { createRadarChartFromCountyName } from "./radarVis.js";

// export function setupRecommendationPanel(container) {
//   const btn = document.createElement("button");
//   btn.className = "fancyButton";
//   btn.textContent = "Recommendations";
//   btn.onclick = () => showRecommendationPopup();
//   container.appendChild(btn);
// }

// function showRecommendationPopup() {
//   let overlay = document.getElementById("recommendation-overlay");
//   if (overlay) overlay.remove();

//   overlay = document.createElement("div");
//   overlay.id = "recommendation-overlay";
//   overlay.style.cssText = `
//     position: fixed;
//     top: 0; left: 0; right: 0; bottom: 0;
//     background: rgba(0, 0, 0, 0.6);
//     display: flex;
//     justify-content: center;
//     align-items: center;
//     z-index: 10000;
//   `;

//   const panel = document.createElement("div");
//   panel.style.cssText = `
//     background: white;
//     border-radius: 8px;
//     padding: 20px;
//     width: 400px;
//     max-height: 80vh;
//     overflow-y: auto;
//     position: relative;
//   `;

//   const closeBtn = document.createElement("button");
//   closeBtn.textContent = "✕";
//   closeBtn.style.cssText = `
//     position: absolute;
//     top: 10px;
//     right: 20px;
//     background: transparent;
//     border: none;
//     font-size: 18px;
//     cursor: pointer;
//   `;
//   closeBtn.onclick = () => overlay.remove();
//   panel.appendChild(closeBtn);

//   const title = document.createElement("h5");
//   title.textContent = "Top 10 Recommendations";
//   panel.appendChild(title);

//   const toggle = document.createElement("select");
//   toggle.className = "form-select form-select-sm mb-3";
//   toggle.innerHTML = `
//     <option value="state">Top 10 States</option>
//     <option value="county">Top 10 Counties</option>
//   `;
//   panel.appendChild(toggle);

//   const list = document.createElement("ul");
//   list.style.listStyle = "none";
//   list.style.padding = 0;
//   panel.appendChild(list);

//   overlay.appendChild(panel);
//   document.body.appendChild(overlay);

//   toggle.onchange = () => populateList(toggle.value, list);
//   populateList("state", list); // default
// }

// async function populateList(type, list) {
//   list.innerHTML = "<li>Loading...</li>";

//   const res = await fetch(type === "state" ? "data/radar_data_state.json" : "data/radar_data.json");
//   const data = await res.json();

//   let entries = Object.entries(data).map(([k, v]) => {
//     const score = type === "state"
//       ? [
//           v.avg_attractions_per_county ?? 0,
//           1 - (v.avg_poverty_rate_per_county ?? 1),
//           v.avg_airports_per_county ?? 0,
//           v.avg_hotels_per_county ?? 0,
//           1 - (v.avg_crime_rate_per_100000 ?? 1000) / 1000
//         ].reduce((a, b) => a + b, 0)
//       : [
//           (v.num_historic_sites ?? 0) + (v.num_state_parks ?? 0),
//           1 - (v.poverty_rate ?? 1),
//           v.num_airports_within_60_miles ?? 0,
//           v.num_hotels ?? 0,
//           1 - (v.crime_rate_per_100000 ?? 1000) / 1000
//         ].reduce((a, b) => a + b, 0);
//     return { key: k, score: +score.toFixed(3) };
//   });

//   entries.sort((a, b) => b.score - a.score);
//   const top10 = entries.slice(0, 10);

//   list.innerHTML = "";
//   top10.forEach(({ key, score }) => {
//     const li = document.createElement("li");
//     li.style.padding = "6px 0";
//     li.style.cursor = "pointer";
//     li.textContent = `${key} — ${score.toFixed(2)}`;
//     li.onclick = () => {
//       if (type === "state") {
//         createRadarChartFromCountyName(key);
//         window.zoomToState && window.zoomToState(key);
//         document.getElementById("recommendation-overlay")?.remove();
//       } else {
//         const [county, state] = key.split(", ");
//         createRadarChartFromCountyName(state, county);
//         window.zoomToCounty && window.zoomToCounty(state, county);
//         document.getElementById("recommendation-overlay")?.remove();
//       }
//     };
//     list.appendChild(li);
//   });
// }
