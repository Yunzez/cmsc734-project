import pandas as pd

# Load the CSV file
file_path = '/Users/yunzezhao/Code/CMSC734/project/cmsc734-project/data/map/clean.csv'
data = pd.read_csv(file_path)

# Remove the specified columns
columns_to_remove = ['zips', 'ranking']
cleaned_data = data.drop(columns=columns_to_remove)

# Save the cleaned data back to the same directory
output_path = '/Users/yunzezhao/Code/CMSC734/project/cmsc734-project/data/map/clean2.csv'
cleaned_data.to_csv(output_path, index=False)