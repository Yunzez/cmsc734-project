import pandas as pd
from pathlib import Path
import csv
import re

# Load the merged hotel CSV
df = pd.read_csv("min_hotel.csv", quoting=csv.QUOTE_NONE, on_bad_lines="skip")

# Clean state names
valid_states = {
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
}

# Strip and filter
df["State"] = df["State"].astype(str).str.strip().str.title()
# Fill in missing or empty State using Address field
def infer_state_from_address(row):
    if row["State"] and row["State"] in valid_states:
        return row["State"]
    addr = str(row.get("Address", "")).lower()
    for state in valid_states:
        if state.lower() in addr:
            return state
    return None  # couldn't infer

df["State"] = df.apply(infer_state_from_address, axis=1)

exported_states = set(df["State"].unique())
missing_states = valid_states - exported_states

print("Missing states:", missing_states)
# Drop rows we still can't identify
df = df[df["State"].isin(valid_states)]
# Create output directory
output_dir = Path("state_hotels")
output_dir.mkdir(exist_ok=True)

# Sanitize filename function
def safe_filename(state):
    return re.sub(r"[^\w\-]", "_", state)

# Export each state's hotels to a separate CSV
for state, group in df.groupby("State"):
    print(f"Exporting {state} hotels...")
    safe_name = safe_filename(state)
    filename = output_dir / f"{safe_name}_hotel.csv"
    group.to_csv(filename, index=False)

print(f"Exported {len(df['State'].unique())} / {len(valid_states)} state hotel files to {output_dir}/")