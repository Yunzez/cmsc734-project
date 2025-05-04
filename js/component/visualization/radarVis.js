
let radarChartInstance = null;
function normalize(val, min, max) {
  if (val == null || isNaN(val)) return 0;
  return Math.max(0, Math.min(5, ((val - min) / (max - min)) * 5));
}

export function setupRadarChartContainer() {
  const container = document.getElementById("info-section");
  const cityRadarChart = document.createElement("div");
  cityRadarChart.id = "city-radar-chart";
  cityRadarChart.className = "d-flex justify-content-center";

  const innerDiv = document.createElement("div");
  innerDiv.style.maxWidth = "300px";
  innerDiv.style.width = "100%";

  const chartContainer = document.createElement("div");
  chartContainer.style.display = "flex";
  chartContainer.style.alignItems = "flex-start";

  const canvas = document.createElement("canvas");
  canvas.id = "radarChart";
  canvas.width = 240;
  canvas.height = 240;

  chartContainer.appendChild(canvas);
  innerDiv.appendChild(chartContainer);
  cityRadarChart.appendChild(innerDiv);
  container.appendChild(cityRadarChart);
}

export function renderRadarChart(data, state, county) {
  console.log("renderRadarChart", data, state, county);
  // data = calculateScore(state, county);
  // Start async score update
  let stateName = state ? state[0] : undefined;
  let countyName = county ? county[0] : undefined;
  calculateScore(stateName, countyName).then((scores) => {
    if (radarChartInstance) {
      radarChartInstance.data.datasets[0].data = scores;
      radarChartInstance.update();
    }
  });
  const ctx = document.getElementById("radarChart").getContext("2d");
  const radarData = {
    labels: ["Attractions", "Society", "Transportation", "Hotel", "Safety"],
    datasets: [
      {
        label: "Region Score",
        data,
        fill: true,
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgb(75, 192, 192)",
        pointBackgroundColor: "rgb(75, 192, 192)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgb(75, 192, 192)",
      },
    ],
  };

  if (radarChartInstance) {
    radarChartInstance.data.datasets[0].data = data;
    radarChartInstance.update();
  } else {
    radarChartInstance = new Chart(ctx, {
      type: "radar",
      data: radarData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 20, left: 10, right: 10 } },
        plugins: {
          legend: {
            display: false, // hide legend for minimal UI
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function (context) {
                return `${context.label}: ${context.formattedValue}/5`;
              },
            },
          },
          title: {
            display: true,
            text: `${county ? county + ", ": ""} ${state} - overall score`,
            font: { size: 14, weight: "bold" },
            padding: { top: 10, bottom: 10 },
          },
        },
        elements: {
          line: {
            borderWidth: 2,
          },
          point: {
            radius: 3,
            hoverRadius: 6,
          },
        },
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 5,
            ticks: {
              stepSize: 1,
              backdropColor: "transparent",
              color: "#888",
              font: { size: 10 },
            },
            pointLabels: {
              font: { size: 11 },
              color: "#333",
            },
            grid: {
              color: "#ddd",
            },
            angleLines: {
              color: "#ccc",
            },
          },
        },
      },
    });
    
  }
}

async function calculateScore(state, county) {
  const res = await fetch("data/radar_data.json");
  const radarRaw = await res.json();
  console.log(county)
  const key = `${county.trim()}, ${state.trim()}`;
  const data = radarRaw[key];
  if (!data) return [0, 0, 0, 0, 0];

  const {
    num_historic_sites,
    num_state_parks,
    poverty_rate,
    num_airports_within_60_miles,
    num_hotels,
    crime_rate_per_100000,
  } = data;

  function normalize(val, min, max) {
    if (val == null || isNaN(val)) return 0;
    return Math.max(0, Math.min(5, ((val - min) / (max - min)) * 5));
  }

  const attractionScore = normalize(
    (num_historic_sites || 0) + (num_state_parks || 0),
    0,
    20
  );
  const societyScore = poverty_rate != null ? (1 - poverty_rate) * 5 : 0;
  const transportationScore = normalize(num_airports_within_60_miles, 0, 300);
  const hotelScore = normalize(num_hotels, 0, 50);
  const safetyScore =
    crime_rate_per_100000 != null
      ? (1 - crime_rate_per_100000 / 1000) * 5
      : 0;

  return [
    +attractionScore.toFixed(2),
    +societyScore.toFixed(2),
    +transportationScore.toFixed(2),
    +hotelScore.toFixed(2),
    +safetyScore.toFixed(2),
  ];
}


export async function updateRadarChart(
  centerPoint,
  hotelData,
  airportData,
  povertyData,
  crimeData
) {
  console.log("update");
  const searchRadius = 30000; // 30km
  const center = turf.point(centerPoint);

  // Hotel score: weighted by stars
  let hotelScore = 0;
  if (hotelData.length) {
    const hotelsNearby = hotelData.filter(
      (h) => turf.distance(center, turf.point(h.coordinates)) <= 30
    );
    const scoreSum = hotelsNearby.reduce(
      (sum, h) => sum + Math.min(h.stars || 0, 5),
      0
    );
    hotelScore = Math.min(5, scoreSum / 10); // Normalize to 0-5
  }

  // Transportation score: inverse distance to nearest airport
  let transportationScore = 0;
  if (airportData.length) {
    const distances = airportData.map((a) =>
      turf.distance(center, turf.point(a.coordinates))
    );
    const avgDist = distances.length
      ? distances.reduce((a, b) => a + b, 0) / distances.length
      : 999;
    transportationScore = Math.max(0, 5 - avgDist / 30);
  }

  // Society score: 1 - poverty rate
  let societyScore = 0;
  if (typeof povertyData === "number") {
    societyScore = Math.max(0, 5 * (1 - povertyData));
  }

  // Safety score: 1 - crime rate (normalized)
  let safetyScore = 0;
  if (typeof crimeData === "number") {
    safety_score = 5 * (1 - (avgCrimeScore - minScore) / (maxScore - minScore));
  }

  // Attractions: TBD
  const attractionScore = 2.5; // placeholder until further data

  renderRadarChart([
    attractionScore,
    societyScore,
    transportationScore,
    hotelScore,
    safetyScore,
  ]);
}
