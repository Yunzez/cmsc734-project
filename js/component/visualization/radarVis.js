let radarChartInstance = null;

export function setupRadarChartContainer() {
  const container = document.getElementById("info-section");
  container.innerHTML = `
    <div id="city-radar-chart" class="d-flex justify-content-center">
      <div style="max-width: 300px; width: 100%">
        <h6 class="text-center" style="font-size: 0.75rem; margin-bottom: 4px">Points</h6>
        <div style="display: flex; align-items: flex-start">
          <canvas id="radarChart" width="240" height="240"></canvas>
        </div>
      </div>
    </div>`;
}

export function renderRadarChart(data) {
  const countyName = document.getElementById('info-county')
  if (!countyName) return 
  if (countyName.length == 0) return;

  setupRadarChartContainer()
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
        layout: { padding: { top: 0, bottom: 20 } },
        plugins: {
          legend: {
            position: "right",
            labels: { font: { size: 10 }, boxWidth: 14, padding: 12 },
          },
        },
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 5,
            ticks: { stepSize: 1, font: { size: 10 } },
            pointLabels: { font: { size: 11 } },
          },
        },
      },
    });
  }
}

export async function updateRadarChart(centerPoint, hotelData, airportData, povertyData, crimeData) {
  console.log("update")
  const searchRadius = 30000; // 30km
  const center = turf.point(centerPoint);

  // Hotel score: weighted by stars
  let hotelScore = 0;
  if (hotelData.length) {
    const hotelsNearby = hotelData.filter(h => turf.distance(center, turf.point(h.coordinates)) <= 30);
    const scoreSum = hotelsNearby.reduce((sum, h) => sum + Math.min(h.stars || 0, 5), 0);
    hotelScore = Math.min(5, scoreSum / 10); // Normalize to 0-5
  }

  // Transportation score: inverse distance to nearest airport
  let transportationScore = 0;
  if (airportData.length) {
    const distances = airportData.map(a => turf.distance(center, turf.point(a.coordinates)));
    const avgDist = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 999;
    transportationScore = Math.max(0, 5 - avgDist / 30);
  }

  // Society score: 1 - poverty rate
  let societyScore = 0;
  if (typeof povertyData === 'number') {
    societyScore = Math.max(0, 5 * (1 - povertyData));
  }

  // Safety score: 1 - crime rate (normalized)
  let safetyScore = 0;
  if (typeof crimeData === 'number') {
    safety_score = 5 * (1 - (avgCrimeScore - minScore) / (maxScore - minScore))
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
