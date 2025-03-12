import pandas as pd


def reduce():
    with open('../../aux_data/raw_crime.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    data = data.rename(columns={
        'Incident': 'CrimeIndex',
        'Crime Type': 'CrimeType',
        'Victim Count': 'VictimCount',
        'Perpetrator Count': 'PerpetratorCount',
        'Crime Solved': 'CrimeSolved'
    })[[
        'State', 'City', 'Year', 'Month', 'CrimeIndex',
        'CrimeType', 'VictimCount', 'PerpetratorCount',
        'Weapon', 'CrimeSolved'
    ]]
    data['CrimeSolved'] = data['CrimeSolved'].map({
        'Yes': True, 'No': False
    })
    with open('min_crime.csv', 'w', encoding='utf-8') as f:
        f.write(data.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reduce()
