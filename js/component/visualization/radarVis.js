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
  cityRadarChart.style.minWidth = "300px";

  const innerDiv = document.createElement("div");
  innerDiv.style.minWidth = "300px";
  innerDiv.style.width = "100%";
  innerDiv.style.padding = "5px";

  // Header with title and info icon
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "8px";

  const title = document.createElement("span");
  title.innerText = "Radar Score";
  title.style.fontWeight = "bold";

  const infoIcon = document.createElement("span");
  infoIcon.innerText = "ℹ️";
  infoIcon.style.cursor = "pointer";
  infoIcon.style.fontSize = "14px";
  infoIcon.style.marginLeft = "8px";
  infoIcon.title = `Scoring criteria:
- Attractions: # of historic sites + state parks (max 20)
- Society: Inverse of poverty rate
- Transportation: Airports within 60 miles (max 300)
- Hotel: Total hotels in the county (max 50)
- Safety: Inverse of crime rate per 100,000`;

  header.appendChild(title);
  header.appendChild(infoIcon);

  const canvas = document.createElement("canvas");
  canvas.id = "radarChart";
  canvas.width = "15vw";
  canvas.height = "15vw";

  // Assemble
  innerDiv.appendChild(header);
  innerDiv.appendChild(canvas);
  cityRadarChart.appendChild(innerDiv);
  container.appendChild(cityRadarChart);
}

export function renderRadarChart(data, state, county) {
  console.log("renderRadarChart", data, state, county);
  // data = calculateScore(state, county);
  // Start async score update
  let stateName = Array.isArray(state) ? state[0] : state;
  let countyName = Array.isArray(county) ? county[0] : county;
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
            text: `${county ? county + ", " : ""} ${state} - overall score`,
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
  console.log("calculateScore", state, county);

  function normalize(val, min, max) {
    if (val == null || isNaN(val)) return 0;
    return Math.max(0, Math.min(5, ((val - min) / (max - min)) * 5));
  }

  if (!county) {
    console.log("No county provided, using state data");
    const res = await fetch("data/radar_data_state.json");
    const radarRaw = await res.json();
    const key = `${state.trim()}`;
    const data = radarRaw[key];
    if (!data) return [0, 0, 0, 0, 0];

    const {
      avg_hotels_per_county,
      avg_airports_per_county,
      avg_crime_rate_per_100000,
      avg_attractions_per_county,
      avg_poverty_rate_per_county,
    } = data;

    const attractionScore = normalize(avg_attractions_per_county, 0, 20);
    const societyScore =
      avg_poverty_rate_per_county != null
        ? Math.max(0, 5 * (1 - avg_poverty_rate_per_county))
        : 0;
    const transportationScore = normalize(avg_airports_per_county, 0, 300);
    const hotelScore = normalize(avg_hotels_per_county, 0, 50);
    const safetyScore =
      avg_crime_rate_per_100000 != null
        ? Math.max(0, 5 * (1 - avg_crime_rate_per_100000 / 1000))
        : 0;

    console.log(
      "scores",
      +attractionScore.toFixed(2),
      +societyScore.toFixed(2),
      +transportationScore.toFixed(2),
      +hotelScore.toFixed(2),
      +safetyScore.toFixed(2)
    );
    return [
      +attractionScore.toFixed(2),
      +societyScore.toFixed(2),
      +transportationScore.toFixed(2),
      +hotelScore.toFixed(2),
      +safetyScore.toFixed(2),
    ];
  }

  // County-specific version
  const res = await fetch("data/radar_data.json");
  const radarRaw = await res.json();
  const key = `${county.trim()}, ${state.trim()}`;
  const data = radarRaw[key];
  if (!data) return [0, 0, 0, 0, 0];

  const {
    num_historic_sites,
    num_state_parks,
    poverty_rate,
    num_airports_local,
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

  return [
    +attractionScore.toFixed(2),
    +societyScore.toFixed(2),
    +transportationScore.toFixed(2),
    +hotelScore.toFixed(2),
    +safetyScore.toFixed(2),
  ];
}
