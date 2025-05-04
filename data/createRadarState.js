const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'radar_data.json');
const outputPath = path.join(__dirname, 'radar_data_state.json');

const raw = JSON.parse(fs.readFileSync(inputPath));
const stateAggregates = {};

for (const entry of Object.values(raw)) {
  const {
    state,
    num_hotels,
    num_airports_local,
    num_state_parks,
    crime_rate_per_100000,
    num_historic_sites,
    poverty_rate
  } = entry;
  if (!state) continue;

  if (!stateAggregates[state]) {
    stateAggregates[state] = {
      num_counties: 0,
      total_hotels: 0,
      total_airports_local: 0,
      total_state_parks: 0,
      total_crime_rate: 0,
      total_attractions: 0,
      total_poverty_rate: 0,
    };
  }

  const agg = stateAggregates[state];
  agg.num_counties += 1;
  agg.total_hotels += num_hotels || 0;
  agg.total_airports_local += num_airports_local || 0;
  agg.total_state_parks += num_state_parks || 0;
  agg.total_crime_rate += crime_rate_per_100000 || 0;
  agg.total_poverty_rate += poverty_rate || 0;
  const parks = num_state_parks || 0;
  const sites = num_historic_sites || 0;
  agg.total_attractions += (parks + sites);
}

const result = {};
for (const [state, agg] of Object.entries(stateAggregates)) {
  result[state] = {
    num_counties: agg.num_counties,
    total_hotels: agg.total_hotels,
    avg_hotels_per_county: +(agg.total_hotels / agg.num_counties).toFixed(2),
    avg_airports_per_county: +(agg.total_airports_local / agg.num_counties).toFixed(2),
    avg_state_parks_per_county: +(agg.total_state_parks / agg.num_counties).toFixed(2),
    avg_crime_rate_per_100000: +(agg.total_crime_rate / agg.num_counties).toFixed(2),
    avg_attractions_per_county: +(agg.total_attractions / agg.num_counties).toFixed(2),
    avg_poverty_rate_per_county: +(agg.total_poverty_rate / agg.num_counties).toFixed(2),
  };
}

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`✅ Aggregated state-level radar data with attractions written to ${outputPath}`);
