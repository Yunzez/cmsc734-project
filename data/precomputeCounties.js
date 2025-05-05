import fs from "fs";
import path from "path";

// Load radar_data.json (you may need to adjust path)
const rawData = JSON.parse(fs.readFileSync("radar_data.json", "utf-8"));

function normalize(val, min, max) {
  if (val == null || isNaN(val)) return 0;
  return Math.max(0, Math.min(5, ((val - min) / (max - min)) * 5));
}

function calculateScore(data) {
  const {
    num_historic_sites,
    num_state_parks,
    poverty_rate,
    num_airports_within_60_miles,
    num_hotels,
    crime_rate_per_100000,
  } = data;

  const attractionScore = normalize(
    (num_historic_sites || 0) + (num_state_parks || 0),
    0,
    20
  );
  const societyScore =
    poverty_rate != null ? Math.max(0, 5 * (1 - poverty_rate)) : 0;
  const transportationScore = normalize(num_airports_within_60_miles, 0, 300);
  const hotelScore = normalize(num_hotels, 0, 50);
  const safetyScore =
    crime_rate_per_100000 != null
      ? Math.max(0, 5 * (1 - crime_rate_per_100000 / 1000))
      : 0;

  const allScores = [
    +safetyScore.toFixed(2),
    +societyScore.toFixed(2),
    +transportationScore.toFixed(2),
    +hotelScore.toFixed(2),
    +attractionScore.toFixed(2),
  ];
  const total = allScores.reduce((a, b) => a + b, 0);
  return { score: allScores, scoreOutOf100: +(total * 4).toFixed(2) };
}

// Compute and export scores
const result = {};

for (const [key, data] of Object.entries(rawData)) {
  result[key] = {
    ...calculateScore(data),
  };
}

fs.writeFileSync(
  "county_scores.json",
  JSON.stringify(result, null, 2)
);

console.log("✅ Precomputed scores saved to data/scored_radar_data.json");
