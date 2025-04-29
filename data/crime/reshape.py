import pandas as pd
from pandas import DataFrame


def reshape():
    with open('min_crime_value.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    attributes = [
        'ViolentCrime', 'Murder', 'RapeNew', 'RapeOld', 'Robbery', 'Assault',
        'PropertyCrime', 'Burglary', 'LarcenyTheft', 'VehicleTheft'
    ]
    result = DataFrame(data[['State', 'Year']]).merge(
        DataFrame({'Type': attributes}), how='cross'
    )
    result['Value'] = 0
    for state in list(data['State'].unique()):
        for year in [2015, 2016]:
            for _ in attributes:
                result.loc[
                    (result['State'] == state) & (result['Year'] == year) &
                    (result['Type'] == _), 'Value'
                ] = data[
                    (data['State'] == state) & (data['Year'] == year)
                ][_].values[0]
    result = result.merge(
        data[['State', 'Year', 'Population']], how='left'
    )
    with open('../../aux_data/min_alt_crime_value.csv', 'w', encoding='utf-8') as f:
        f.write(result.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reshape()
