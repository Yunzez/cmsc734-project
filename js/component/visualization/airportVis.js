// visualization/airportVis.js

export function renderAirportOnMap(stateName, globalMap) {
    const geojsonPath = `data/airport/raw_airport.geojson`;
  
    fetch(geojsonPath)
      .then(res => res.json())
      .then(data => {
        const filtered = data.features.filter(f =>
          f.properties.state_name?.toLowerCase() === stateName.toLowerCase()
        );
        console.log(`✈️ ${filtered.length} airports found in ${stateName}`);
  
        if (!filtered.length) {
          console.warn(`No airport data found for ${stateName}`);
          return;
        }
  
        // Clear previous layer if any
        if (window._airportLayer) {
          globalMap.removeLayer(window._airportLayer);
        }
  
        const airportLayer = L.layerGroup();
  
        const airplaneIcon = L.divIcon({
          html: "✈️",
          className: "airport-icon",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
  
        filtered.forEach(f => {
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties;
  
          const marker = L.marker([lat, lng], { icon: airplaneIcon });
  
          const tooltipContent = `
            <strong>${props.fac_name || props.name}</strong><br/>
            Type: ${props.fac_type || "N/A"}<br/>
            State: ${props.state_name || "N/A"}<br/>
            Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}
          `;
  
          marker.bindTooltip(tooltipContent, {
            direction: "top",
            offset: [0, -10],
            className: "airport-tooltip",
          });
  
          airportLayer.addLayer(marker);
        });
  
        airportLayer.addTo(globalMap);
        window._airportLayer = airportLayer;
      })
      .catch(err => {
        console.error("❌ Failed to load airport geojson:", err);
      });
  }
  