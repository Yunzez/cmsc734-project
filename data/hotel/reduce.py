import pandas as pd


def reduce():
    with open('../../aux_data/raw-hotel-full.csv', 'r', encoding='iso-8859-1') as f:
        data = pd.read_csv(f)
    data = data.rename(columns={
        _: _.strip() for _ in data.columns if _ != _.strip()
    }).rename(columns={
        'countyCode': 'countryCode',
        'countyName': 'countryName'
    })  # [1010033, 16]
    data = data[data['countryCode'] == 'US']  # [139868, 16]
    with open('raw-hotel.csv', 'w', encoding='utf-8') as f:
        f.write(data.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reduce()
