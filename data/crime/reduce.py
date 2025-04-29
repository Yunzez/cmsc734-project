import pandas as pd


def reduce():
    with open('../../aux_data/raw_crime.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f, thousands=',')
    attributes = {
        'Violent crime': 'ViolentCrime',
        'Murder and nonnegligent manslaughter': 'Murder',
        'Rape (revised definition)': 'RapeNew',
        'Rape (legacy definition)': 'RapeOld',
        'Robbery': 'Robbery',
        'Aggravated assault': 'Assault',
        'Property crime': 'PropertyCrime',
        'Burglary': 'Burglary',
        'Larceny-theft': 'LarcenyTheft',
        'Motor vehicle theft': 'VehicleTheft'
    }
    data = data.rename(columns=attributes)
    result_mask = data['Year'] == '%'
    result_value = data[~result_mask]
    result_value.loc[:, list(attributes.values()) + ['Population']] \
        = result_value[list(attributes.values()) + ['Population']].apply(pd.to_numeric)
    result_change = data[result_mask].drop(columns=['Year', 'Population'])
    result_change.loc[:, attributes.values()] = result_change[attributes.values()].apply(pd.to_numeric) / 100
    with open('min_crime_value.csv', 'w', encoding='utf-8') as f:
        f.write(result_value.to_csv(index=False, lineterminator='\n'))
    with open('min_crime_change.csv', 'w', encoding='utf-8') as f:
        f.write(result_change.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reduce()
