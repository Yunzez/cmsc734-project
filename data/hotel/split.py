import re

import pandas as pd

# removed 'District of Columbia'
states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
    'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin',
    'Wyoming'
]


def split():
    def fill_state(row):
        possible_states = []
        address = row['Address']
        for _ in states:
            if _ in address:
                possible_states.append(_)
        if all(_ in possible_states for _ in ['West Virginia', 'Virginia']):
            possible_states.remove('Virginia')
        if len(possible_states) > 1:
            possible_states.sort(key=lambda _: address.find(_))
        if len(possible_states) > 0:
            row['State'] = possible_states[-1]
        return row

    def fill_zip(row):
        possible_zip = row['Address'].split()[-1]
        if re.match(r'^\d{3,5}$', possible_zip):
            row['ZipCode'] = int(possible_zip)
        return row

    with open('min_hotel.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    for _ in data['State'].dropna().unique():
        assert _ in states
    mask = data['State'].isna() & ~data['Address'].isna()
    data.loc[mask] = data.loc[mask].apply(fill_state, axis=1)
    mask = data['ZipCode'].isna() & ~data['Address'].isna()
    data.loc[mask] = data.loc[mask].apply(fill_zip, axis=1)
    data['ZipCode'] = data['ZipCode'].fillna(-1).astype(int).astype(str).str.zfill(5)
    for state in states:
        if len(state_data := data[data['State'] == state]) > 0:
            with open(f'state_hotels/{state.replace(" ", "_")}_hotel.csv', 'w', encoding='utf-8') as f:
                state_data.to_csv(f, index=False, lineterminator='\n')


if __name__ == '__main__':
    split()
