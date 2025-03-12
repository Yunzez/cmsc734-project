import { createMap } from "./component/map/index.js";

const map = document.getElementById("map");
const intro = document.getElementById("intro");
const visual = document.getElementById("visualisation");
const parentContainer = document.getElementById("container");

// we add a search component here
const introSearch = document.getElementById("intro-search");
window.onload = function() {
   console.log("window loaded");
   createMap("map",  { center: [40.7128, -94.006], zoom: 4 });
};

// map.onclick = function() {
//     console.log("map clicked");
//     if (parentContainer.classList.contains("showVis")) {
//         parentContainer.classList.remove("showVis");
//     } else {
//         parentContainer.classList.add("showVis");
//     }

// }
