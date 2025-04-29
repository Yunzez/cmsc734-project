export function createSafetyVis(mapDiv, state, county, globalMap) {
  console.log(mapDiv);
  let safetyVis = document.createElement("div");
  safetyVis.id = "safety-vis";
  mapDiv.appendChild(safetyVis);

  const csvPath = "../../../data/crime/crime_data_county.csv";

  d3.csv(csvPath, d3.autoType).then((data) => {
    // Find matching county
    const fullCountyName = `${county}, ${state}`.trim();
    console.log("Full county name:", fullCountyName);
    const match = data.find((d) => {
      if (!d.county_name) return false;

      const [fullCountyPart, statePart] = d.county_name.split(",");
      if (!fullCountyPart || !statePart) return false;

      // Remove "County", trim spaces
      const cleanedCounty = fullCountyPart.replace("County", "").trim();
      const cleanedState = statePart.trim();
        // console.log("Cleaned county:", cleanedCounty);
      return (
        cleanedCounty.toLowerCase() === county.toLowerCase()
      );

    });
    console.log("Match found:", match);
    if (!match) {
      console.log("No crime data found for", fullCountyName);
      return;
    }

    // Extract crime categories you want to visualize
    const crimeCategories = [
      "MURDER",
      "ROBBERY",
      "AGASSLT",
      "BURGLRY",
      "LARCENY",
      "MVTHEFT",
      "ARSON",
    ];

    const crimeData = crimeCategories.map((cat) => ({
      type: cat,
      count: match[cat] || 0,
    }));

    console.log("Crime data for visualization:", crimeData);

    // D3 setup
    const width = mapDiv.offsetWidth;
    const height = 400;
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };

    const svg = d3
      .select("#safety-vis")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);

    const x = d3
      .scaleBand()
      .domain(crimeData.map((d) => d.type))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(crimeData, (d) => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .selectAll(".bar")
      .data(crimeData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.type))
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => y(0) - y(d.count))
      .attr("width", x.bandwidth())
      .attr("fill", "#4dabf7"); // Calm blue color

    // Optional: title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(`Crime Breakdown: ${fullCountyName}`);
  });
}
