import { createMap } from "./component/map/index.js";

const map = document.getElementById("map");
const intro = document.getElementById("intro");
const visual = document.getElementById("visualisation");
const parentContainer = document.getElementById("container");

// we add a search component here
const introSearch = document.getElementById("intro-search");

// this stores states and county
let visualizationTarget = [];
window.onload = function () {
  console.log("window loaded");
  console.log(parentContainer);
  const visDiv = document.getElementById("visualization");
  prepareVisDiv(visDiv);
  createMap(
    "map",
    { center: [40.7128, -94.006], zoom: 4 },
    parentContainer,
    visualizationTarget
  );

  visBack.onclick = function () {
    parentContainer.classList.remove("showVis");
  };
};

function prepareVisDiv(visDiv) {
  const overallDiv = document.createElement("div");
  overallDiv.id = "vis-overall";
  visDiv.appendChild(overallDiv);

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
