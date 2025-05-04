import {clearCheckboxes, createMap} from "./component/map/index.js";
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
import {setupRadarChartContainer} from "./component/visualization/radarVis.js";

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

  // timeout needs to match `#container.showVis {transition}` in `index.css`
  visBack.onclick = function () {
    parentContainer.classList.remove("showVis");
    setTimeout(() => {
      clearCheckboxes()
      window.location.reload()
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
    setupRadarChartContainer()
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
            document.getElementById("safety-vis").remove()
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
