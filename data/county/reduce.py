import pandas as pd
from pandas import DataFrame

states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
    'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin',
    'Wyoming', 'United States'
]


def reduce():
    with open('../../aux_data/county/raw_poverty.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    unique_key = 'Area_Name'
    attributes = {
        'POVALL_2023': 'PovertyPopulation',
        'PCTPOVALL_2023': 'PovertyPopulation%'
    }
    data = data[data['Attribute'].isin(attributes)][[
        unique_key, 'Attribute', 'Value'
    ]].drop_duplicates([unique_key, 'Attribute'])
    result = DataFrame(data[unique_key].unique(), columns=[unique_key])
    for attribute in attributes:
        result = result.merge(
            data[data['Attribute'] == attribute][[unique_key, 'Value']],
            on=unique_key, how='left'
        ).rename(columns={'Value': attribute})
    result['POVALL_2023'] = result['POVALL_2023'].astype(int)
    result['PCTPOVALL_2023'] /= 100
    result = result.rename(columns=attributes)
    state_filter = result[unique_key].isin(states)
    with open('min_poverty_state.csv', 'w', encoding='utf-8') as f:
        f.write(
            result[state_filter].rename(columns={
                unique_key: 'State'
            }).to_csv(index=False, lineterminator='\n')
        )
    with open('min_poverty_county.csv', 'w', encoding='utf-8') as f:
        f.write(
            result[~state_filter].rename(columns={
                unique_key: 'County'
            }).to_csv(index=False, lineterminator='\n')
        )


if __name__ == '__main__':
    reduce()
