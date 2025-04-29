import { createMap } from "./component/map/index.js";
import {renderHotelOnMap} from "./component/visualization/hotelVis.js";
import { renderAirportOnMap } from "./component/visualization/index.js";

import { createSafetyVis } from "./component/visualization/safetyVis.js";

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

  visBack.onclick = function () {
    parentContainer.classList.remove("showVis");
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

  const historyDiv = document.createElement("div");
  historyDiv.id = "vis-history";
  visDiv.appendChild(historyDiv);

  const hotelDiv = document.createElement("div");
  hotelDiv.id = "vis-hotel";
  visDiv.appendChild(hotelDiv);
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
  const dropdownItems = document.querySelectorAll(
    "#filterOptionsList .checkbox-input"
  );
  //   const dropdownButton = document.getElementById("filterDropdownButton");
  console.log("dropdownItems", dropdownItems);
  dropdownItems.forEach((item) => {
    item.addEventListener("click", function (e) {
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
        console.log("Calling renderHotelOnMap for", state);
        // console.log("global map check: ", globalMap);
        renderHotelOnMap(state, county, globalMap);
      }

      if (selected === "Safety") {
        const mapDiv = document.getElementById("vis-overall");
        createSafetyVis(mapDiv, state, county, globalMap);
      }
      if (selected === "Transportation") {
        console.log("Calling renderAirportOnMap for", state);
        renderAirportOnMap(state, globalMap);
      }
    });
  });
}
