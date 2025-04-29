
export async function createDropDown(inputID, dropdownID, handleSearchSelection) {
  const input = document.getElementById(inputID);
  const dropdown = document.getElementById(dropdownID);
  // Pre-process cities into a flat array
   // Load cities.csv dynamically
   const cities = await d3.csv("../../../data/map/cities.csv"); 

  // Pre-process CSV rows into a flat array
  const cityData = cities.map((row) => {
    return {
      city: row.city_ascii || row.city,
      county: row.county_name,
      state: row.state_name,
    };
  });

  // Listen to input changes
 input.addEventListener("input", function (e) {
    const query = e.target.value.trim().toLowerCase();

    if (query.length === 0) {
      closeDropdown();
      return;
    }

    const results = cityData.filter((item) =>
        (item.city && item.city.toLowerCase().includes(query)) ||
        (item.county && item.county.toLowerCase().includes(query))
      ).slice(0, 10);  // <-- add slice to limit to first 10 matches
    
      console.log("Results:", results);

    openDropdown(results);
  });

  function openDropdown(results) {
    dropdown.innerHTML = "";

    if (results.length === 0) {
      const noResult = document.createElement("div");
      noResult.className = "item";
      noResult.textContent = "No results found";
      dropdown.appendChild(noResult);
    } else {
      results.forEach((result) => {
        const div = document.createElement("div");
        div.className = "searchDropdownItem";
        const text = result.city + ", " + result.county + ", " + result.state;
        div.textContent = text;
        div.addEventListener("click", () => {
            input.value = result.county + " County";
            closeDropdown();
            handleSelection(result);  // <- important
          });
        dropdown.appendChild(div);
      });
    }

    dropdown.classList.remove("hidden");
  }

  function closeDropdown() {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
  }

  // Optional: Close dropdown if clicking outside
  document.addEventListener("click", function (event) {
    if (!input.contains(event.target) && !dropdown.contains(event.target)) {
      closeDropdown();
    }
  });

  function handleSelection(selectedItem) {
    console.log("User selected:", selectedItem);
    console.log("State to load:", selectedItem.state);
    if (handleSearchSelection) {
        handleSearchSelection(selectedItem);
    }
  }
}
