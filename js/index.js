import { clearCheckboxes, createMap } from "./component/map/index.js";
import { renderRadarChart } from "./component/visualization/radarVis.js";
import {
  removeHotelOnMap,
  renderHotelOnMap,
} from "./component/visualization/hotelVis.js";
// import { renderAirportOnMap } from "./component/visualization/index.js";
import { renderAirportOnMap } from "./component/visualization/airportVis.js";
import {
  renderSafetyHeatmap,
  removeSafetyHeatmap,
} from "./component/visualization/safetyHeatmap.js";

import {
  renderHistoryOnMap,
  removeHistoryFromMap,
} from "./component/visualization/historyVis.js";
import {
  fetchParkNames,
  removeParkFromMap,
  renderParkOnMap,
} from "./component/visualization/parkVis.js";

import {
  renderSocietyHeatmap,
  removeSocietyHeatmap,
} from "./component/visualization/societyHeatmap.js";
import { setupRadarChartContainer } from "./component/visualization/radarVis.js";

// import { setupRecommendationPanel } from "./component/visualization/recommendationPanel.js";

const parentContainer = document.getElementById("container");

// we add a search component here
const introSearch = document.getElementById("intro-search");

// this stores states and county
let visualizationTarget = [];
var globalMap = null;
window.onload = function () {
  console.log("window loaded");
  console.log(parentContainer);
  const visDiv = document.getElementById("visualization");
  prepareVisDiv(visDiv);
  globalMap = createMap(
    "map",
    { center: [40.7128, -94.006], zoom: 4 },
    parentContainer,
    visualizationTarget
  );

  // window.addEventListener("DOMContentLoaded", () => {
  //   const controlSection = document.querySelector(".controls");
  //   const recButton = document.createElement("button");
  //   recButton.id = "recommendation-button";
  //   recButton.className = "btn btn-outline-primary ms-3";
  //   recButton.textContent = "Recommendation";
  //   recButton.onclick = () => showTopRecommendations();
  //   controlSection.appendChild(recButton);
  // });

  // timeout needs to match `#container.showVis {transition}` in `index.css`
  visBack.onclick = function () {
    parentContainer.classList.remove("showVis");
    setTimeout(() => {
      clearCheckboxes();
      window.location.reload();
    }, 600);
  };

  prepareDropdown(globalMap);
};

function prepareVisDiv(visDiv) {
  const airportDiv = document.createElement("div");
  airportDiv.id = "vis-airport";
  visDiv.appendChild(airportDiv);

  const crimeDiv = document.createElement("div");
  crimeDiv.id = "vis-crime";
  visDiv.appendChild(crimeDiv);

  const attractionsDiv = document.createElement("div");
  attractionsDiv.id = "vis-attractions";
  visDiv.appendChild(attractionsDiv);
}
// map.onclick = function() {
//     console.log("map clicked");
//     if (parentContainer.classList.contains("showVis")) {
//         parentContainer.classList.remove("showVis");
//     } else {
//         parentContainer.classList.add("showVis");
//     }

// }
function prepareDropdown(globalMap) {
  setupRadarChartContainer();
  const dropdownItems = document.querySelectorAll(
    "#filterOptionsList .checkbox-input"
  );
  //   const dropdownButton = document.getElementById("filterDropdownButton");
  console.log("dropdownItems", dropdownItems);
  dropdownItems.forEach((item) => {
    item.addEventListener("change", function (e) {
      const selected = this.getAttribute("data-value");
      //   if (selected && dropdownButton) {
      //     dropdownButton.innerText = selected;
      //   }

      const visTitle = document.getElementById("visHeaderTitle");
      if (!visTitle) return;
      const stateInfo = visTitle.innerText
        .replace("Information for ", "")
        .trim();
      const state = stateInfo.includes(",")
        ? stateInfo.split(",")[1].trim()
        : stateInfo;
      const county = stateInfo.includes(",")
        ? stateInfo.split(",")[0].trim()
        : "";
      console.log("User selected:", selected, "in state:", state);

      if (selected === "Hotel") {
        if (this.classList.contains("active")) {
          this.classList.remove("active");
          removeHotelOnMap(globalMap);
          document.getElementById("hotel-vis").remove();
        } else {
          this.classList.add("active");
          renderHotelOnMap(state, county, globalMap);
        }
        console.log("Calling renderHotelOnMap for", state);
        // console.log("global map check: ", globalMap);
      }

      if (selected === "Society") {
        if (this.classList.contains("active")) {
          this.classList.remove("active");
          removeSocietyHeatmap(globalMap);
        } else {
          this.classList.add("active");
          renderSocietyHeatmap(globalMap, state);
        }
      }

      if (selected === "Attractions") {
        if (this.classList.contains("active")) {
          this.classList.remove("active");
          removeParkFromMap(globalMap);
          removeHistoryFromMap(globalMap);
          document.getElementById("vis-attractions").innerHTML = "";
        } else {
          this.classList.add("active");
          renderParkOnMap(state, globalMap);

          // 提取国家公园名称用于匹配历史景点
          fetchParkNames(state).then((parkNames) => {
            renderHistoryOnMap(state, globalMap, parkNames);
          });
        }
      }

      if (selected === "Safety") {
        const mapDiv = document.getElementById("vis-overall");
        if (this.classList.contains("active")) {
          if (document.getElementById("safety-vis")) {
            document.getElementById("safety-vis").remove();
            document.getElementById("safety-title").remove();
          }
          this.classList.remove("active");
          removeSafetyHeatmap(globalMap);
        } else {
          this.classList.add("active");
          renderSafetyHeatmap(globalMap, state, county);
        }
      }

      if (selected === "Transportation") {
        if (this.checked) {
          console.log("✅ Showing airports for", state);
          renderAirportOnMap(state, globalMap);
        } else {
          console.log("❌ Hiding airports");
          if (window._airportLayer) {
            globalMap.removeLayer(window._airportLayer);
            window._airportLayer = null;
          }
        }
      }
    });
  });
}

// index.js (modified)

import { calculateScore } from "./component/visualization/radarVis.js";
let currentRecommendationMode = null; // 'state' | 'county' | null

let recommendType = "county"; // default

export function toggleRecommendWidget() {
  console.log("showRecommendWidget called");
  const widget = document.getElementById("recommend-widget");
  const blur = document.getElementById("blur-overlay");
  if (widget.style.display === "block") {
    widget.style.display = "none";
    blur.style.display = "none";
  } else {
    widget.style.display = "block";
    blur.style.display = "block";
    renderRecommendations();

    document
      .querySelectorAll('input[name="recommendMode"]')
      .forEach((input) => {
        input.addEventListener("change", () => {
          renderRecommendations();
        });
      });
  }
}

async function getTopRecommendations(isStateMode = false) {
  const res = await fetch(
    isStateMode ? "data/radar_data_state.json" : "data/radar_data.json"
  );
  const data = await res.json();
  const entries = Object.entries(data);

  if (isStateMode) {
    // Normalize state-level score to 0–100
    const scored = entries.map(([state, val]) => {
      const attractions = val.avg_attractions_per_county ?? 0;
      const society = 1 - (val.avg_poverty_rate_per_county ?? 1);
      const transport = val.avg_airports_per_county ?? 0;
      const hotel = val.avg_hotels_per_county ?? 0;
      const safety = 1 - (val.avg_crime_rate_per_100000 ?? 1000) / 1000;

      // Normalize each component to 0–5 (you can adjust max values)
      const score = [
        Math.min(5, (attractions / 20) * 5),
        Math.max(0, Math.min(5, society * 5)),
        Math.min(5, (transport / 10) * 5),
        Math.min(5, (hotel / 20) * 5),
        Math.max(0, Math.min(5, safety * 5)),
      ];

      const totalScore = score.reduce((a, b) => a + b, 0); // out of 25
      return { key: state, score, scoreOutOf100: totalScore * 4 };
    });

    return scored
      .sort((a, b) => b.scoreOutOf100 - a.scoreOutOf100)
      .slice(0, 10);
  }

  // County mode logic (as before)
  const sample = entries.sort(() => 0.5 - Math.random()).slice(0, 100);
  const scored = await Promise.all(
    sample.map(async ([key, value]) => {
      const [county, state] = key.split(",").map((s) => s.trim());
      const score = await calculateScore(state, county);
      const totalScore = score.reduce((a, b) => a + b, 0);
      return { key, score, scoreOutOf100: totalScore * 4 };
    })
  );
  return scored.sort((a, b) => b.scoreOutOf100 - a.scoreOutOf100).slice(0, 10);
}

let latestRenderRequestId = 0;

export async function renderRecommendations() {
  const container = document.getElementById("recommend-widget-content");

  // 为当前调用分配唯一 ID
  const thisRequestId = ++latestRenderRequestId;

  // 清空旧内容
  container.innerHTML = "";

  const selected = document.querySelector(
    'input[name="recommendMode"]:checked'
  );
  const selectedMode = selected?.value;
  currentRecommendationMode = selectedMode == "shuffle" ? null : selectedMode;
  const title = document.createElement("h5");
  console.log("selectedMode", selectedMode);
  if (selectedMode === "state") {
    title.textContent = "Top 10 States in USA";
  } else if (selectedMode === "county") {
    title.textContent = "Top 10 Counties in USA";
  } else {
    title.textContent = "Top Picks from Shuffle";
  }
  title.style.marginTop = "10px";
  container.appendChild(title);

  const top = await getTopRecommendations(selectedMode == "state");

  // 如果在等待过程中用户点击了其他选项，就丢弃这次响应结果
  if (thisRequestId !== latestRenderRequestId) return;

  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.padding = "0";

  top.forEach(({ key, scoreOutOf100 }) => {
    const item = document.createElement("li");
    item.style.marginBottom = "6px";
    item.style.cursor = "pointer";
    item.style.transition = "background-color 0.3s ease";
    item.style.padding = "5px";
    item.style.fontSize = "16px";
    item.style.borderRadius = "8px";
    item.innerHTML = `
      <strong class="ps-3">${key}</strong> 
      <span style="color: #0a9396; font-weight: bold;">${Math.round(
        scoreOutOf100
      )} / 100</span>
      <span class="option-arrow" style="margin-right: 10px; float: right; opacity: 0; color: #0a9396; transition: opacity 0.3s ease;">GO ➔</span>
    `;

    item.onmouseover = () => {
      item.style.backgroundColor = "#f0f0f0";
      const arrow = item.querySelector(".option-arrow");
      if (arrow) arrow.style.opacity = "1";
    };

    item.onmouseout = () => {
      item.style.backgroundColor = "transparent";
      const arrow = item.querySelector(".option-arrow");
      if (arrow) arrow.style.opacity = "0";
    };

    list.appendChild(item);
  });

  container.appendChild(list);
}

window.toggleRecommendWidget = toggleRecommendWidget;

document.addEventListener("DOMContentLoaded", () => {
  const shuffleBtn = document.querySelector(".shuffle-buttn");
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      window.shuffleRecommendations();
    });
  }
});

window.shuffleRecommendations = async function () {
  document.querySelectorAll('input[name="recommendMode"]').forEach((el) => {
    el.checked = false;
    if (el.value === "shuffle") {
      el.checked = true;
    }
  });
 

  const top = await renderRecommendations(); // default county sampling
};
