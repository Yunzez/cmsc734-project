// visualization/attractionVis.js
// visualization/attractionVis.js

import { getStateNameFromAbbr } from "../../utils.js";

let globalMapRef = null;
let siteNameToLayerMap = {};
let highlightedLayer = null;
let previousRoot = null;
let previousLabel = "";
let currentTooltipLevel = null;

const interpolator = t => d3.interpolateGreens(1 - 0.8 * t)

export function createAttractionVis(containerDiv, stateName, globalMap) {
    globalMapRef = globalMap;
    containerDiv.innerHTML = "";

    const title = document.createElement("div");
    title.id = "attraction-title";
    containerDiv.appendChild(title);

    const visDiv = document.createElement("div");
    visDiv.id = "attraction-vis";
    containerDiv.appendChild(visDiv);

    const csvPath = "../../../data/visitor/min_visitor.csv";
    d3.csv(csvPath, d3.autoType).then((data) => {
        const filtered = data.filter(
            (d) => d.State?.trim().toLowerCase() === stateName.trim().toLowerCase()
        );

        if (!filtered.length) {
            console.warn("No attraction data for", stateName);
            return;
        }

        siteNameToLayerMap = {};
        if (window._parkLayer) {
            window._parkLayer.eachLayer((layer) => {
                const name = layer.feature.properties?.PARKNAME?.toLowerCase();
                if (name) siteNameToLayerMap[name] = layer;
            });
        }
        if (window._historyLayer) {
            window._historyLayer.eachLayer((layer) => {
                const name = layer.feature.properties?.Loc_Nm?.toLowerCase();
                if (name) siteNameToLayerMap[name] = layer;
            });
        }

        const topParks = filtered
            .filter((d) => d.RecreationVisitors > 0)
            .map((d) => ({
                ...d,
                name: d.Park
            }))
            .sort((a, b) => b.RecreationVisitors - a.RecreationVisitors);

        const root = d3
            .hierarchy({ name: "Total", children: topParks })
            .sum((d) => (d.RecreationVisitors || 0) + (d.NonRecreationVisitors || 0))
            .sort((a, b) => b.value - a.value);

        previousRoot = root;
        previousLabel = stateName;

        renderTreemap(root, visDiv, title, stateName, true);
    });
}



function renderTreemap(root, visDiv, titleDiv, label, isStateLevel = true) {
    hideAttractionTooltip();
    currentTooltipLevel = isStateLevel ? 'primary' : 'secondary';

    visDiv.innerHTML = "";

    const width = visDiv.offsetWidth;
    const height = isStateLevel ? 700 : 650;

    // 
    const backButton = document.createElement("button");
    backButton.textContent = "← Back";
    backButton.className = "btn btn-secondary btn-sm";
    backButton.style.position = "absolute";
    backButton.style.top = "10px";
    backButton.style.right = "10px"; // 
    backButton.style.zIndex = "100";
    backButton.onclick = () => {
        renderTreemap(previousRoot, visDiv, titleDiv, previousLabel, true);
    };

    // 
    if (!isStateLevel) {
        visDiv.appendChild(backButton);

        // 
        const recreationPercentValue = root.data["RecreationVisitors%"] || 0;
        titleDiv.innerHTML = `<b>Zoomable Treemap of Visitors in ${label}</b>`;

        // 
        const container = d3.select(visDiv)
            .style("position", "relative")
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "20px")
            .style("height", "calc(100% - 40px)")
            .style("margin-top", "40px");

        //
        const recreationPercent = (recreationPercentValue >= 0 ? "+" : "") + (
            recreationPercentValue * 100
        ).toFixed(1).toString() + "%";
        renderSubTreemap(
            createSubTreeData(root, ["RecreationVisitors", "NonRecreationVisitors"]),
            container.append("div").node(),
            `Visitors (${recreationPercent} since last year)`
        );
        renderSubTreemap(
            createSubTreeData(root, ["RecreationVisitorHours", "NonRecreationVisitorHours"]),
            container.append("div").node(),
            "Visitor Hours"
        );
        return;
    }


    // 
    const svg = d3.select(visDiv)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height);

    const treemap = d3.treemap()
        .tile(d3.treemapResquarify.ratio(1.5))
        .size([width, height])
        .round(true)
        .padding(1);

    let currentNode = root;
    const g = svg.append("g").attr("class", "treemap-group");

    // 
    const currentValues = root.children?.map(d => d.value) || [];
    const maxValue = currentValues.length ? d3.max(currentValues) : 0;
    const minValue = currentValues.length ? d3.min(currentValues) : 0;

    const colorScale = d3.scaleSequential()
        .domain([maxValue, minValue])
        .interpolator(interpolator);

    // 
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newWidth = visDiv.offsetWidth;
            svg.attr("viewBox", [0, 0, newWidth, height])
                .attr("width", newWidth);
            render(currentNode);
        }, 200);
    });

    function render(node) {
        treemap(node);
        g.selectAll("*").remove();

        const nodes = g.selectAll("g.treemap-node")
            .data(node.children || [], d => d.data.name);

        const nodeEnter = nodes.enter().append("g").attr("class", "treemap-node");

        // 
        nodeEnter.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.value))
            .attr("cursor", d => d.children ? "pointer" : "default")
            .style("pointer-events", "all")
            .on("click", (event, d) => {
                if (!d.children && isStateLevel) {
                    const metrics = [
                        "RecreationVisitors", "RecreationVisitors%",
                        "RecreationVisitorDays", "RecreationVisitorDays%",
                        "NonRecreationVisitors", "NonRecreationVisitors%",
                        "RecreationVisitorHours", "RecreationVisitorHours%",
                        "NonRecreationVisitorHours", "NonRecreationVisitorHours%"
                    ];

                    const children = metrics.map(key => ({
                        name: key.replace(/([A-Z])/g, ' $1').trim(),
                        dataValue: d.data[key] || 0,
                        value: Math.max(Math.abs(d.data[key] || 0), 1)
                    }));

                    const newRoot = d3.hierarchy({
                        name: d.data.Park || d.data.name,
                        ...d.data,
                        children
                    })
                        .sum(d => d.value)
                        .sort((a, b) => b.value - a.value);

                    previousRoot = root;
                    previousLabel = label;

                    renderTreemap(newRoot, visDiv, titleDiv, d.data.Park || d.data.name, false);
                }
            })
            .on("mouseover", (event, d) => {
                const total = (d.data.RecreationVisitors || 0) + (d.data.NonRecreationVisitors || 0);
                showAttractionTooltip(event, {
                  name: d.data.name,
                  value: total.toLocaleString()
                }, 'primary'); 
                highlightFeatureByName(d.data.Park || d.data.name);
              })
            .on("mouseout", () => {
                removeHighlight();
                hideAttractionTooltip();
            });

        // 
        nodeEnter.append("text")
            .attr("x", 3)
            .attr("y", 3)
            .attr("dominant-baseline", "hanging")
            .style("font-size", d => {
                const boxWidth = d.x1 - d.x0;
                return boxWidth > 120 ? "12px" :
                    boxWidth > 80 ? "10px" :
                        boxWidth > 40 ? "8px" : "6px";
            })
            .style("text-shadow", "rgba(0, 0, 0, 1) 0px 1px 5px")
            .text(d => {
                const boxWidth = d.x1 - d.x0;
                const maxChars = Math.floor(boxWidth / 7);
                return d.data.name.length > maxChars ?
                    d.data.name.substring(0, maxChars - 1) + "..." :
                    d.data.name;
            })
            .style("fill", "white")
            .style("pointer-events", "none");

        // 
        const all = nodeEnter.merge(nodes);
        all.transition().duration(600)
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        all.select("rect").transition().duration(600)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0);

        nodes.exit().remove();

        titleDiv.innerHTML = `<b>Zoomable Treemap of Visitors in ${label}</b>`;
    }

    render(currentNode);
}

function createSubTreeData(originalRoot, metrics) {
    return d3.hierarchy({
      children: metrics.map(key => {
        const rawValue = originalRoot.data[key] || 0;
        return {
          name: key.replace(/([A-Z])/g, ' $1').trim(),
          value: Math.abs(rawValue),
          rawValue: rawValue, 
          isPercentage: key.includes("%") 
        };
      })
    })
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  }


function renderSubTreemap(data, container, title) {
   
    container.innerHTML = "";
    container.style.minHeight = "300px";
    container.style.position = "relative";

    const width = container.offsetWidth;
    const height = 300; 

    
    const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .style("background", "#f8f9fa")
        .style("border-radius", "8px");

   
    svg.append("text")
        .attr("x", 15)
        .attr("y", 25)
        .text(title)
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50");

    
    const treemap = d3.treemap()
        .tile(d3.treemapResquarify.ratio(1.5)) 
        .size([width, height - 40]) 
        .round(true)
        .padding(1);

     
    const values = data.leaves().map(d => d.value);
    const colorScale = d3.scaleSequential()
        .domain([d3.max(values), 0])  
        .interpolator(interpolator);

    
    treemap(data);

    
    const g = svg.append("g")
        .attr("transform", `translate(0,40)`);  

     
        g.selectAll("rect")
        .data(data.leaves())
        .enter()
        .append("rect")  
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.value))
        .style("stroke", "#fff")
        .style("stroke-width", 0.5)
        .style("pointer-events", "all") 
        .on("mouseover", function(event, d) {
          const name = d.data.name;
          const rawValue = d.data.rawValue;
          const isPercentage = d.data.name.includes("%");
          console.log('Hover Data:', d.data); 
          console.log('Rect Dimensions:', {
            width: d.x1 - d.x0,
            height: d.y1 - d.y0
          });

          let displayValue;
          if (isPercentage) {
            displayValue = `${(rawValue * 100).toFixed(1)}%`;  
          } else {
            displayValue = rawValue.toLocaleString();
          }
    
          showAttractionTooltip(event, {
            name: d.data.name,
            value: displayValue
          }, 'secondary');  
          console.log('Sub Treemap Hover:', {
            name: d.data.name,
            rawValue: d.data.rawValue,
            displayValue: displayValue
          });
        })
        .on("mousemove", function (event) {
            const tooltip = document.getElementById("attraction-tooltip");
            if (tooltip) {
                if (event.pageX + tooltip.offsetWidth + 50 > window.innerWidth) {
                    tooltip.style.left = `${event.pageX - tooltip.offsetWidth - 15}px`;
                } else {
                    tooltip.style.left = `${event.pageX + 15}px`;
                }
                tooltip.style.top = `${event.pageY + 15}px`;
            }
        })
        .on("mouseout", function () {
            hideAttractionTooltip();
            d3.select(this)
                .style("stroke", "#fff")
                .style("stroke-width", 0.5);
        });

    
    g.selectAll("text")
        .data(data.leaves())
        .enter()
        .append("text")
        .attr("x", d => d.x0 + 4)
        .attr("y", d => d.y0 + 4)
        .attr("dominant-baseline", "hanging")
        .style("font-size", d => {
             
            const boxWidth = d.x1 - d.x0;
            if (boxWidth > 100) return "12px";
            if (boxWidth > 60) return "10px";
            return "8px";
        })
        .style("fill", "white")
        .style("text-shadow", "rgba(0, 0, 0, 1) 0px 1px 5px")
        .text(d => {
            const maxWidth = d.x1 - d.x0;
            const maxChars = Math.floor(maxWidth / 7);  
            return d.data.name.length > maxChars ?
                d.data.name.substring(0, maxChars - 1) + "..." :
                d.data.name;
        });

    
    if (values.length > 0) {
        const legend = svg.append("g")
            .attr("transform", `translate(15, ${height - 20})`);

        legend.append("rect")
            .attr("x", -15)
            .attr("y", -20)
            .attr("width", 180)
            .attr("height", 40)
            .style("fill", "white")
            .style("opacity", 0.8);

        const gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        const colorScaleDomain = colorScale.domain()
        const gradientRange = [
            colorScale(colorScaleDomain[0]),
            colorScale(d3.sum(colorScaleDomain) / 2),
            colorScale(colorScaleDomain[1])
        ]
        gradient.selectAll("stop")
            .data(gradientRange)
            .enter()
            .append("stop")
            .attr("offset", (d, i) => i / (gradientRange.length - 1))
            .attr("stop-color", d => d);

        legend.append("rect")
            .attr("width", 150)
            .attr("height", 10)
            .style("fill", "url(#gradient)");

         
        legend.append("text")
            .attr("x", 0)
            .attr("y", -5)
            .text("High %")
            .style("font-size", "10px")
            .style("fill", "#2c3e50");

        legend.append("text")
            .attr("x", 118)
            .attr("y", -5)
            .text("Low %")
            .style("font-size", "10px")
            .style("fill", "#2c3e50");
    }
}


function highlightFeatureByName(name) {
    const key = name?.toLowerCase();
    const layer = siteNameToLayerMap[key];
    if (!layer) return;

    layer.setStyle({
        weight: 4,
        color: "#f39c12",
        fillOpacity: 0.9,
    });

    if (!layer._map) {
        layer.addTo(globalMapRef);
    }

    highlightedLayer = layer;
}

function removeHighlight() {
    if (highlightedLayer) {
        highlightedLayer.setStyle({
            weight: 1.5,
            color: "#145A32",
            fillOpacity: 0.45,
        });
        highlightedLayer = null;
    }
}


 
function showAttractionTooltip(event, data, level) {
    const tooltipHTML = `
      <div style="color:#f39c12!important;font-weight:500;">${data.name}</div>
      <div style="color:white!important;">${data.value}</div>
    `;
  
    let tooltip = document.getElementById("attraction-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "attraction-tooltip";
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0,0,0,0.9)!important;  
        color: white!important;  
        padding: 10px;
        border-radius: 6px;
        font-size: 14px;
        pointer-events: none;
        z-index: 99999; 
        min-width: 120px;
        max-width: 240px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.2s;
        word-wrap: break-word;
      `;
      document.body.appendChild(tooltip);
    }
  
    tooltip.innerHTML = tooltipHTML;
    tooltip.style.opacity = "1";
  
    requestAnimationFrame(() => {
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const margin = 15;
  
      
      let left = event.pageX + margin;
  
     
      if (left + tooltipWidth > window.innerWidth) {
        left = event.pageX - tooltipWidth - margin;
        
        if (left < 0) left = margin;
      }
  
      let top = event.pageY + margin;
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - margin;
      }
  
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
  }
  

function hideAttractionTooltip() {
    const tooltip = document.getElementById("attraction-tooltip");
    if (tooltip) tooltip.style.opacity = 0;
}

export function removeAttractionVis() {
    const title = document.getElementById("attraction-title");
    const vis = document.getElementById("attraction-vis");
    if (title) title.remove();
    if (vis) vis.remove();
    removeHighlight();
}