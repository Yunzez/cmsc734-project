let opennedNode = null;
export function createHotelVis(parentContainer, state, county) {

  parentContainer.innerHTML = "";
  const container = document.createElement("div");
  container.id = "hotel-vis-subdiv";
  parentContainer.appendChild(container);

  //   const container = parentContainer;
  console.log("Creating hotel visualization for", state);
  const data_state = String(state).replace(/\s+/g, "_");
  const csvPath = `../../../data/hotel/state_hotels/${data_state}_hotel.csv`;

  d3.csv(csvPath, d3.autoType).then((data) => {
    data = data.filter((d) => d.StarRating >= 1 && d.StarRating <= 5);

    const grouped = d3.rollups(
      data,
      (v) => v,
      (d) => d.StarRating
    );

    const starGroups = grouped
      .map(([rating, hotels]) => ({
        rating,
        hotels,
        count: hotels.length,
      }))
      .sort((a, b) => a.rating - b.rating);

    console.log(starGroups);
    // SVG setup
    const width = parentContainer.offsetWidth,
      height = 600;

    const svg = d3
      .select(container)
      .html("")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "hotel-vis-svg")
      .attr("width", width)
      .attr("height", height);

    // Add back button, we hide the button until user open up the view

    const pack = d3.pack().size([width, height]).padding(10);
    const root = d3
      .hierarchy({ children: starGroups })
      .sum((d) => Math.log(d.count + 1)); // log scale prevents domination by large counts
    pack(root);

    const countExtent = d3.extent(starGroups, (d) => d.count);

    const colorScale = d3
      .scaleSequential()
      .domain(countExtent) // now based on number of hotels
      .interpolator(d3.interpolateBlues); // or any other gradient

    console.log("Radii by rating:");
    console.log(root.children);

    // svg.selectAll("*").remove();

    const node = svg
      .selectAll("g")
      .data(root.children)
      .each((d) => console.log(`before entering ${d.data.rating}★`, d))
      .enter()
      .each((d) => console.log(`after entering ${d.data.rating}★`, d))
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("class", "hotel-bubble star-node")
      .style("z-index", 10000)
      .style("pointer-events", "visible")
      .style("cursor", "pointer");

    node
      .append("circle")
      .attr("r", (d) => d.r) // Apply square root transformation to radius
      .attr("fill", (d) => colorScale(d.data.count))
      .attr("opacity", 0.8)
      .attr("class", "hotel-count-bubble")
      .style("pointer-events", "visible")
      .style("cursor", "pointer");

    node
      .append("text")
      .text((d) => `${d.data.rating}★\n(${d.data.count})`)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .attr("id", (d) => "hotel-count-label" + d.data.rating)
      .attr("class", "hotel-count-label")
      .style("fill", (d) => {
        const bg = d3.rgb(colorScale(d.data.count));
        const brightness = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
        return brightness > 160 ? "#000" : "#fff"; // black if background is light
      });

    node.on("click", (e, d) => {
      e.preventDefault();
      node.on("click", null);
      e.preventDefault();
      opennedNode = node;
      showHotels(svg, starGroups, d.data.rating);
    });

    createBackBtn(svg, width, height, starGroups);
    svg.selectAll("g.back-button").style("display", "none");
  });
}

function createBackBtn(svg, width, height, starGroups) {
  const backButton = svg
    .append("g")
    .attr("class", "back-button")
    .attr("transform", `translate(${width - 100}, ${height - 30})`)
    .style("cursor", "pointer")
    .style("pointer-events", "visible");

  backButton
    .append("rect")
    .attr("width", 100)
    .attr("height", 30)
    .attr("rx", 6)
    .attr("fill", "#555");

  backButton
    .append("text")
    .text("← Back")
    .attr("x", 50)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .style("font-size", "14px");

  backButton.on("click", (e) => {
    e.preventDefault();
    opennedNode.on("click", (e, d) => {
      e.preventDefault();
      opennedNode.on("click", null);
      showHotels(svg, starGroups, d.data.rating);
    });
    resetView(svg, starGroups);
  });
}

function resetView(svg, starGroups) {
  svg.selectAll(".hotel-count-label").style("display", "block");
  console.log("Resetting view");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const pack = d3.pack().size([width, height]).padding(10);
  const root = d3.hierarchy({ children: starGroups }).sum((d) => d.count);
  pack(root);

  svg.selectAll("g.star-node").each(function (d, i) {
    const g = d3.select(this);
    g.transition()
      .duration(600)
      .attr("transform", `translate(${d.x}, ${d.y}) scale(1)`);

    g.select("circle").transition().duration(600).attr("opacity", 0.8);
    g.on("click", (e, d) => showHotels(svg, starGroups, d.data.rating));
  });

  svg.selectAll("g.hotel-pack").remove();
  // svg.selectAll("g.back-button").remove();
  svg.selectAll("g.back-button").style("display", "none");
}

// function showHotels(svg, starGroups, focusedRating) {
//   svg.selectAll("g.back-button").style("display", "block");
//   const width = +svg.attr("width");
//   const height = +svg.attr("height");

//   const pack = d3.pack().size([width, height]).padding(10);
//   const root = d3.hierarchy({ children: starGroups }).sum((d) => d.count);
//   pack(root);

//   const focus = starGroups.find((d) => d.rating === focusedRating);

//   svg.selectAll("g.star-node").each(function (d) {
//     const g = d3.select(this);
//     svg.select("#hotel-count-label" + d.data.rating).style("display", "none");
//     if (d.data.rating === focusedRating) {
//       // Expand and center the focused bubble
//       g.raise()
//         .transition()
//         .duration(600)
//         .attr("transform", `translate(${width / 2}, ${height / 2}) scale(2.5)`);

//       // Create hotel bubbles inside the focused bubble
//       const hotelPack = d3
//         .pack()
//         .size([d.r * 2, d.r * 2])
//         .padding(2.5);

//       const hotelRoot = d3
//         .hierarchy({ children: focus.hotels.map((h) => ({ ...h, value: 1 })) })
//         .sum((d) => d.value);

//       hotelPack(hotelRoot);

//       const hotelG = g
//         .append("g")
//         .attr("class", "hotel-pack")
//         .attr("transform", `translate(${-d.r}, ${-d.r})`);

//       hotelG
//         .selectAll("circle")
//         .data(hotelRoot.children)
//         .enter()
//         .append("circle")
//         .attr("cx", (d) => d.x)
//         .attr("cy", (d) => d.y)
//         .attr("r", (d) => d.r)
//         .attr("fill", "#339af0")
//         .attr("opacity", 0.8)
//         .on("click", (e, d) => {
//           e.stopPropagation();
//           alert(
//             `🏨 ${d.data.HotelName}\n⭐ ${d.data.StarRating}\n📍 ${
//               d.data.City
//             }, ${d.data.Address}\n\nFacilities:\n${
//               d.data.HotelFacilities || "N/A"
//             }\n\nAttractions:\n${d.data.Attractions || "None"}`
//           );
//         });
//     } else {
//       // Shrink & fade other bubbles
//       g.transition()
//         .duration(700)
//         .attr("transform", `translate(${d.x}, ${d.y}) scale(0.8)`);

//       g.select("circle").transition().duration(700).attr("opacity", 0.3);

//       g.on("click", null); // Disable click
//     }
//   });

// }

function showHotels(svg, starGroups, focusedRating) {
  svg.selectAll("g.back-button").style("display", "block");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const focus = starGroups.find((d) => d.rating === focusedRating);
  if (!focus) return;

  const fixedRadius = 2.5;

  // Locate & raise the focus node
  svg.selectAll("g.star-node").each(function (d) {
    const g = d3.select(this);
    svg.select(`#hotel-count-label${d.data.rating}`).style("display", "none");

    if (d.data.rating === focusedRating) {
      const R = d.r;

      g.raise()
        .transition()
        .duration(600)
        .attr("transform", `translate(${width / 2}, ${height / 2}) scale(2.5)`);

      const hotels = focus.hotels.map((h) => ({
        ...h,
        r: fixedRadius,
        x: 0,
        y: 0,
      }));

      const hotelG = g
        .append("g")
        .attr("class", "hotel-pack")
        .attr("transform", `translate(${-R}, ${-R})`);

      const circles = hotelG
        .selectAll("circle")
        .data(hotels)
        .enter()
        .append("circle")
        .attr("r", (d) => d.r)
        .attr("fill", "#339af0")
        .attr("opacity", 0.8)
        .on("mouseover", function (e, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", d.r * 1.4);
        })
        .on("mouseout", function (e, d) {
          d3.select(this).transition().duration(150).attr("r", d.r);
        });

      const sim = d3
        .forceSimulation(hotels)
        .alpha(1) // initial energy
        .alphaDecay(0.08) // faster decay (default is 0.0228)
        .force("center", d3.forceCenter(0, 0))
        .force("collide", d3.forceCollide(fixedRadius + 1))
        .force("x", d3.forceX(0).strength(0.05))
        .force("y", d3.forceY(0).strength(0.05))
        .on("tick", () => {
          for (const d of hotels) {
            const dist = Math.sqrt(d.x * d.x + d.y * d.y);
            const maxDist = R - d.r;
            if (dist > maxDist) {
              const angle = Math.atan2(d.y, d.x);
              d.x = Math.cos(angle) * maxDist;
              d.y = Math.sin(angle) * maxDist;
            }
          }
          circles.attr("cx", (d) => R + d.x).attr("cy", (d) => R + d.y);
        });
    } else {
      // Dim others
      g.transition()
        .duration(700)
        .attr("transform", `translate(${d.x}, ${d.y}) scale(0.8)`);

      g.select("circle").transition().duration(700).attr("opacity", 0.3);
      g.on("click", null);
    }
  });
}
