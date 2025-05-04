const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const turf = require("@turf/turf");
const { toWgs84 } = require("@turf/projection");
const airportPath = path.join(__dirname, "airport/raw_airport.geojson");
const geojsonPath = path.join(__dirname, "map/county.geojson");
const citiesCSV = path.join(__dirname, "map/cities.csv");
const hotelDataDir = path.join(__dirname, "hotel/state_hotels");
const outputFilePath = path.join(__dirname, "radar_data.json");

const countyGeojson = JSON.parse(fs.readFileSync(geojsonPath));
const countyToData = {};

// STEP 1: Initialize county structure from geojson
// for (const feature of countyGeojson.features) {
//   // console.log("feature", feature);
//   const county = feature.properties.coty_name[0]?.trim();
//   const state = feature.properties.ste_name[0]?.trim();
//   if (!county || !state) continue;

//   const key = `${county}, ${state}`;
//   countyToData[key] = {
//     county,
//     state,
//     cities: new Set(),
//     hotels: [],
//     polygon: feature,
//   };

// }
// console.log("countyToData", countyToData);
// // STEP 2: Count cities from CSV
// fs.createReadStream(citiesCSV)
//   .pipe(csv())
//   .on('data', (row) => {
//     const county = row.county_name?.trim();
//     const state = row.state_name?.trim();
//     const city = row.city?.trim();
//     const key = `${county}, ${state}`;
//     if (countyToData[key]) {
//       countyToData[key].cities.add(city);
//     }
//   })
//   .on('end', async () => {
//     console.log("✅ Finished processing cities. Now processing hotels...");
//     console.log(countyToData)
//     await processHotels();
//   });

// // STEP 3: Count hotels using spatial match
// async function processHotels() {
//   const hotelFiles = fs.readdirSync(hotelDataDir).filter(f => f.endsWith("_hotel.csv"));

//   for (const file of hotelFiles) {
//     const filePath = path.join(hotelDataDir, file);
//     const hotels = await new Promise((resolve, reject) => {
//       const rows = [];
//       fs.createReadStream(filePath)
//         .pipe(csv())
//         .on("data", (row) => {
//           if (row.Latitude && row.Longitude) rows.push(row);
//         })
//         .on("end", () => resolve(rows))
//         .on("error", reject);
//     });

//     console.log(`✅ Loaded ${hotels.length} hotels from ${file}`);
//     const hotelPoints = hotels.map(row =>
//       turf.point([parseFloat(row.Longitude), parseFloat(row.Latitude)], row)
//     );

//     for (const point of hotelPoints) {
//       // console.log("hotelPoints", point);
//       for (const [key, entry] of Object.entries(countyToData)) {
//         if (turf.booleanPointInPolygon(point, entry.polygon)) {
//           entry.hotels.push(point);
//           break;
//         }
//       }
//     }
//   }

//   // Write to radar_data.json
//   const result = {};
//   for (const [key, entry] of Object.entries(countyToData)) {
//     result[key] = {
//       county: entry.county,
//       state: entry.state,
//       num_cities: entry.cities.size,
//       num_hotels: entry.hotels.length,
//     };
//   }

//   fs.writeFileSync(outputFilePath, JSON.stringify(result, null, 2));
//   console.log(`✅ Combined radar data written to ${outputFilePath}`);
// }

// add airport number
function normalizeKey(county, state) {
  // console.log("county", county);
  // console.log("state", state);
  return `${county.trim()}, ${state.trim()}`;
}

// ! we separate the airport data processing since hotel takes a long time
function addAirportScore() {
  const airports = JSON.parse(fs.readFileSync(airportPath));
  const radarData = JSON.parse(fs.readFileSync(outputFilePath));
  const countyGeojson = JSON.parse(fs.readFileSync(geojsonPath));

  // Precompute all airport points
  const airportPoints = airports.features.map((f) =>
    turf.point(f.geometry.coordinates, f.properties)
  );

  // Index counties by normalized key
  const countyPolygons = {};
  for (const feature of countyGeojson.features) {
    const county = feature.properties.coty_name[0]?.trim();
    const state = feature.properties.ste_name[0]?.trim();
    const key = normalizeKey(county, state);
    countyPolygons[key] = feature;
  }

  for (const [key, entry] of Object.entries(radarData)) {
    const polygonFeature = countyPolygons[key];
    if (!polygonFeature) {
      console.warn(`⚠️ No polygon found for ${key}`);
      continue;
    }

    const polygon =
      polygonFeature.geometry.type === "Polygon"
        ? turf.polygon(polygonFeature.geometry.coordinates)
        : turf.multiPolygon(polygonFeature.geometry.coordinates);

    const center = turf.centerOfMass(polygon);
    const buffer = turf.circle(center, 60, { units: "miles" });

    const localAirports = airportPoints.filter((pt) =>
      turf.booleanPointInPolygon(pt, polygon)
    );
    const nearbyAirports = airportPoints.filter((pt) =>
      turf.booleanPointInPolygon(pt, buffer)
    );

    entry.num_airports_local = localAirports.length;
    entry.num_airports_within_60_miles = nearbyAirports.length;
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(radarData, null, 2));
  console.log("✅ Airport scores added to radar_data.json");
}

// addAirportScore()

// ! we separate the airport data processing since hotel takes a long time

const stateNameToAbbr = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

const abbrToStateName = Object.fromEntries(
  Object.entries(stateNameToAbbr).map(([name, abbr]) => [abbr, name])
);

function getStateNameFromAbbr(abbr) {
  return abbrToStateName[abbr] || null;
}

const crimeCSVPath = path.join(__dirname, "crime/crime_data_county.csv");
// Clean "Crittenden County, AR" → { county: "Crittenden", state: "AR" }
function parseCrimeCountyName(str) {
  const [countyPart, statePart] = str.split(",");
  if (!countyPart || !statePart) return null;
  const county = countyPart.replace(/County/i, "").trim();
  const state = statePart.trim();
  return { county, state };
}
// const historicalDataPath = path.join(__dirname, 'history/USA_Historic_Sites.geojson');
// 🔍 Adds total crime counts per county into radar_data.json
function addCrimeScore() {
  const radarData = JSON.parse(fs.readFileSync(outputFilePath));
  const totalsByKey = {};

  fs.createReadStream(crimeCSVPath)
    .pipe(csv())
    .on("data", (row) => {
      const parsed = parseCrimeCountyName(row.county);
      if (!parsed) return;

      const key = normalizeKey(
        parsed.county,
        getStateNameFromAbbr(parsed.state)
      );
      const totalCrime = [
        row.MURDER,
        row.RAPE,
        row.ROBBERY,
        row.AGASSLT,
        row.BURGLRY,
        row.LARCENY,
        row.MVTHEFT,
        row.ARSON,
      ]
        .map((v) => parseInt(v) || 0)
        .reduce((sum, v) => sum + v, 0);

      const crimeRate = parseFloat(row.crime_rate_per_100000);
      totalsByKey[key] = {
        total: totalCrime,
        rate: isNaN(crimeRate) ? null : crimeRate,
      };
    })
    .on("end", () => {
      console.log(totalsByKey);
      for (const [key, entry] of Object.entries(radarData)) {
        if (totalsByKey[key]) {
          entry.total_crimes = totalsByKey[key].total;
          entry.crime_rate_per_100000 = totalsByKey[key].rate;
        } else {
          entry.total_crimes = null;
          entry.crime_rate_per_100000 = null;
        }
      }

      fs.writeFileSync(outputFilePath, JSON.stringify(radarData, null, 2));
      console.log("✅ Crime totals and rates added to radar_data.json");
    });
}

// addCrimeScore();

const povertyCSVPath = path.join(__dirname, "county/min_poverty_county.csv");

function addPovertyScore() {
  const radarData = JSON.parse(fs.readFileSync(outputFilePath));

  fs.createReadStream(povertyCSVPath)
    .pipe(csv())
    .on("data", (row) => {
      const county = row.County.replace("County", "").trim();
      const povertyRate = parseFloat(row["PovertyPopulation%"]);

      // Match any key that starts with the same county name
      for (const key of Object.keys(radarData)) {
        if (key.startsWith(county + ",")) {
          radarData[key].poverty_rate = isNaN(povertyRate) ? null : povertyRate;
        }
      }
    })
    .on("end", () => {
      fs.writeFileSync(outputFilePath, JSON.stringify(radarData, null, 2));
      console.log("✅ Poverty rates added to radar_data.json");
    });
}
// addPovertyScore()
function doBboxesIntersect(bboxA, bboxB) {
  return !(
    (
      bboxA[2] < bboxB[0] || // A.maxX < B.minX
      bboxA[0] > bboxB[2] || // A.minX > B.maxX
      bboxA[3] < bboxB[1] || // A.maxY < B.minY
      bboxA[1] > bboxB[3]
    ) // A.minY > B.maxY
  );
}


function toWGS84(feature) {
  return turf.transformConvert(feature, mercator, wgs84); // requires @turf/projection
}
const historicalSitesPath = path.join(
  __dirname,
  "history/USA_Historic_Sites.geojson"
);
const stateParkDir = path.join(__dirname, "park/state_parks");
function addAttractionScore() {
  const radarData = JSON.parse(fs.readFileSync(outputFilePath));
  const countyGeojson = JSON.parse(fs.readFileSync(geojsonPath));
  const historicSites = JSON.parse(fs.readFileSync(historicalSitesPath));

  // Index counties
  const countyPolygons = {};
  for (const feature of countyGeojson.features) {
    const county = feature.properties.coty_name?.[0]?.trim();
    const state = feature.properties.ste_name?.[0]?.trim();
    if (!county || !state) continue;

    const key = normalizeKey(county, state);
    countyPolygons[key] = feature;
  }
  console.log("starting to add historicSites");
  // Historic Sites Count (robust against malformed geometry)
  const sitePolygons = historicSites.features.filter(
    (f) => f.geometry && ["Polygon", "MultiPolygon"].includes(f.geometry.type)
  );

  console.log("Got all site polygons:", sitePolygons.length);
  console.log("First site polygon:", sitePolygons[0]);
  console.log("Second site polygon:", sitePolygons[1]);

  // Pre-group counties by state to reduce comparisons
  const countiesByState = {};
  for (const [key, feature] of Object.entries(countyPolygons)) {
    const state = feature.properties.ste_name?.[0]?.trim();
    if (!countiesByState[state]) countiesByState[state] = [];
    countiesByState[state].push([key, feature]);
  }
  // console.log("finished grouping counties by state");
  // // For each site, check which county it intersects (within same state)
  // for (const site of sitePolygons) {
  //   const siteStateAbbr = site.properties.State_Nm?.trim();
  //   const siteStateFull = getStateNameFromAbbr(siteStateAbbr);
  //   const counties = countiesByState[siteStateFull] || [];

  //   const siteGeom =
  //     site.geometry.type === "Polygon"
  //       ? turf.polygon(site.geometry.coordinates)
  //       : turf.multiPolygon(site.geometry.coordinates);

  //   for (const [key, countyFeature] of counties) {
  //     const countyPolygon =
  //       countyFeature.geometry.type === "Polygon"
  //         ? turf.polygon(countyFeature.geometry.coordinates)
  //         : turf.multiPolygon(countyFeature.geometry.coordinates);

  //     if (turf.booleanIntersects(siteGeom, countyPolygon)) {
  //       if (!radarData[key].num_historic_sites) {
  //         radarData[key].num_historic_sites = 0;
  //       }
  //       radarData[key].num_historic_sites += 1;
  //       break; // Avoid double-counting
  //     }
  //   }
  // }

  // State Park Counts and Area
  console.log("starting to add state parks");
  let uniqueName = new Set();
  const parkFiles = fs
    .readdirSync(stateParkDir)
    .filter((f) => f.endsWith("_park.geojson"));

  for (const file of parkFiles) {
    const filePath = path.join(stateParkDir, file);
    const parks = JSON.parse(fs.readFileSync(filePath));
    console.log(`✅ Loaded ${parks.features.length} parks from ${file}`);

    const stateFromFile = file
      .split(".")[0]
      .replace("_park", "")
      .replace("_", " ")
      .trim(); // e.g., Alabama from Alabama_park.geojson
    const stateFullName = stateFromFile.trim();

    const relevantCounties = countiesByState[stateFullName];
    if (!relevantCounties) {
      console.warn(`⚠️ No counties found for ${stateFullName}`);
      continue;
    }

    // Precompute county polygons and bounding boxes
    const countyPolygons = relevantCounties.map(([key, countyFeature]) => {
      const geom =
        countyFeature.geometry.type === "Polygon"
          ? turf.polygon(countyFeature.geometry.coordinates)
          : turf.multiPolygon(countyFeature.geometry.coordinates);

      return {
        key,
        polygon: geom,
        bbox: turf.bbox(geom),
      };
    });
    console.log("countyPolygons:", countyPolygons.length);
    for (const park of parks.features) {
      if (
        !park.geometry ||
        !park.properties ||
        park.properties.UNIT_TYPE == "Other Designation" ||
        park.properties.UNIT_TYPE == "International Historic Site" ||
        park.properties.UNIT_TYPE == "Parkway" ||
        park.properties.UNIT_TYPE == "National Preserve" ||
        park.properties.UNIT_TYPE == "National Historic Site"
      )
        continue;
      // console.log(park.properties);
      console.log("resolve poly");
      // const rawGeom =
      //   park.geometry.type === "Polygon"
      //     ? turf.polygon(park.geometry.coordinates)
      //     : turf.multiPolygon(park.geometry.coordinates);
      const rawGeom = toWgs84(park);
      // 1. Simplify the geometry first — reduce vertex count
      const simplifiedGeom = turf.simplify(rawGeom, {
        tolerance: 0.02, // more aggressive than 0.01
        highQuality: false,
        mutate: true, // avoids extra allocation
      });

      // const combined = turf.combine(turf.featureCollection(parks.features));
      // 2. Skip turf.buffer entirely — instead inflate bbox slightly
      const rawBbox = turf.bbox(simplifiedGeom); // [minX, minY, maxX, maxY]
      const bboxPolygon = turf.bboxPolygon(rawBbox);
      const inflatedBboxPolygon = turf.buffer(bboxPolygon, 10, {
        units: "miles",
      });
      const parkBbox = turf.bbox(inflatedBboxPolygon); // Use this for comparison
      const [minX, minY, maxX, maxY] = parkBbox;
      if (maxX - minX > 10 || maxY - minY > 10) {
        console.warn(
          `⚠️ Skipping park ${park.properties.UNIT_NAME}, suspiciously large bbox:`
        );
        continue;
      }

      for (const { key, polygon, bbox: countyBbox } of countyPolygons) {
        console.log("comparing", park.properties.UNIT_NAME, key);
        if (doBboxesIntersect(parkBbox, polygon)) {
          console.log("intersect box!", key, "with", stateFullName);
          console.log(parkBbox);
          if (!radarData[key]) continue;
          radarData[key].num_state_parks =
            (radarData[key].num_state_parks || 0) + 1;
          // radarData[key].total_park_area =
          //   (radarData[key].total_park_area || 0) + area;
          // break; // Avoid double-counting
        }
        // // Expensive check only if bboxes intersect
        // if (turf.booleanIntersects(inflatedBbox, polygon)) {
        //   console.log("intersect!", key, "with", stateFullName);
        //   if (!radarData[key]) continue;
        //   radarData[key].num_state_parks =
        //     (radarData[key].num_state_parks || 0) + 1;
        //   radarData[key].total_park_area =
        //     (radarData[key].total_park_area || 0) + area;
        //   // break; // Avoid double-counting
        // }
      }
    }
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(radarData, null, 2));
  console.log("✅ Attraction scores added to radar_data.json");
}

addAttractionScore();
