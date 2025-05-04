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
  innerDiv.style.width = "100%";
  innerDiv.style.padding = "5px";

  // Header with title and info icon
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";

  const infoDiv = document.createElement("div");
  infoDiv.style =
    "display: flex; align-items: center; justify-content: end; width: 100%;";


    const infoTitle = document.createElement("span");
  infoTitle.innerText = `Region overall score`;
  infoDiv.appendChild(infoTitle);
  const infoIcon = document.createElement("span");
  infoDiv.appendChild(infoIcon);
  // <!-- From Uiverse.io by vinodjangid07 -->
  infoIcon.innerHTML = `
  <button class="faq-button">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
      <path
        d="M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"
      ></path>
    </svg>
    <div class="tooltip" data-position="left-bottom">
      <strong>Scoring Criteria:</strong>
      <ul style="margin: 8px 0; padding-left: 16px; list-style-type: disc;">
        <li><strong>Attractions:</strong> # of historic sites + state parks (max 20)</li>
        <li><strong>Society:</strong> Inverse of poverty rate</li>
        <li><strong>Transportation:</strong> Airports within 60 miles (max 300)</li>
        <li><strong>Hotel:</strong> Total hotels in the county (max 50)</li>
        <li><strong>Safety:</strong> Inverse of crime rate per 100,000</li>
      </ul>
    </div>
  </button>
  `;

  infoIcon.style.cursor = "pointer";
  infoIcon.style.fontSize = "14px";
  infoIcon.style.marginLeft = "8px";
  infoIcon.title = `Scoring criteria:
- Attractions: # of historic sites + state parks (max 20)
- Society: Inverse of poverty rate
- Transportation: Airports within 60 miles (max 300)
- Hotel: Total hotels in the county (max 50)
- Safety: Inverse of crime rate per 100,000`;

  header.appendChild(infoDiv);

  const canvas = document.createElement("canvas");
  canvas.id = "radarChart";

  canvas.style.width = "100%";
  canvas.style.maxWidth = "880px";
  canvas.style.height = "auto";
  canvas.style.aspectRatio = "1"; // ensures it's a square
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";

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
        maintainAspectRatio: true,
        layout: { padding: { top: 5, bottom: 5, left: 5, right: 5 } },
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
          }
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
            radius: '100%', // ← this makes the chart take more space
          },
        }
        
      },
    });
  }
}

export async function calculateScore(state, county) {
  // console.log("calculateScore", state, county);

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



export async function createRadarChartFromCountyName(state, county) {
  if (!state) {
    console.warn("State is missing");
    return;
  }

  if (!county) {
    // 👉 Use state-level data if county not provided
    const res = await fetch("data/radar_data_state.json");
    const radarRaw = await res.json();
    const data = radarRaw[state.trim()];
    if (!data) {
      console.warn("No radar score found for state", state);
      return;
    }

    function normalize(val, min, max) {
      if (val == null || isNaN(val)) return 0;
      return Math.max(0, Math.min(5, ((val - min) / (max - min)) * 5));
    }

    const attractionScore = normalize(data.avg_attractions_per_county, 0, 20);
    const societyScore = data.avg_poverty_rate_per_county != null ? (1 - data.avg_poverty_rate_per_county) * 5 : 0;
    const transportationScore = normalize(data.avg_airports_per_county, 0, 300);
    const hotelScore = normalize(data.avg_hotels_per_county, 0, 50);
    const safetyScore = data.avg_crime_rate_per_100000 != null
      ? (1 - data.avg_crime_rate_per_100000 / 1000) * 5
      : 0;

    const scoreArray = [
      +attractionScore.toFixed(2),
      +societyScore.toFixed(2),
      +transportationScore.toFixed(2),
      +hotelScore.toFixed(2),
      +safetyScore.toFixed(2),
    ];

    renderRadarChart(scoreArray, state, null);
    return;
  }

  // county-level fallback
  const res = await fetch("data/radar_data.json");
  const radarRaw = await res.json();
  const key = `${county.trim()}, ${state.trim()}`;
  const data = radarRaw[key];

  if (!data) {
    console.warn("No radar score found for", key);
    return;
  }

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

  const attractionScore = normalize((num_historic_sites || 0) + (num_state_parks || 0), 0, 20);
  const societyScore = poverty_rate != null ? (1 - poverty_rate) * 5 : 0;
  const transportationScore = normalize(num_airports_within_60_miles, 0, 300);
  const hotelScore = normalize(num_hotels, 0, 50);
  const safetyScore = crime_rate_per_100000 != null
    ? (1 - crime_rate_per_100000 / 1000) * 5
    : 0;

  const scoreArray = [
    +attractionScore.toFixed(2),
    +societyScore.toFixed(2),
    +transportationScore.toFixed(2),
    +hotelScore.toFixed(2),
    +safetyScore.toFixed(2),
  ];

  renderRadarChart(scoreArray, state, county);
}
