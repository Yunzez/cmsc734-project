import pandas as pd
from pandas import DataFrame


def reshape():
    with open('min_poverty_state.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    data['NonPovertyPopulation'] = (
            data['PovertyPopulation'] * (1 / data['PovertyPopulation%'] - 1)
    ).astype(int)
    data['TotalPopulation'] = (
            data['PovertyPopulation'] / data['PovertyPopulation%']
    ).astype(int)
    result = DataFrame(data['State']).merge(DataFrame({
        'Type': ['poverty', 'non-poverty']
    }), how='cross')
    result['Value'] = 0
    for state in list(data['State'].unique()):
        result.loc[
            (result['State'] == state) & (result['Type'] == 'poverty'), 'Value'
        ] = data[data['State'] == state]['PovertyPopulation'].values[0]
        result.loc[
            (result['State'] == state) & (result['Type'] == 'non-poverty'), 'Value'
        ] = data[data['State'] == state]['NonPovertyPopulation'].values[0]
    result = result.merge(
        data[['State', 'TotalPopulation', 'PovertyPopulation%']],
        how='left'
    ).rename(columns={
        'TotalPopulation': 'Total', 'PovertyPopulation%': 'Percentage'
    })
    with open('../../aux_data/min_alt_poverty_state.csv', 'w', encoding='utf-8') as f:
        f.write(result.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reshape()
