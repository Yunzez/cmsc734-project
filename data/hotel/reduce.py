import pandas as pd


def extract():
    with open('../../aux_data/raw_hotel_full.csv', 'r', encoding='iso-8859-1') as f:
        data = pd.read_csv(f)
    data = data.rename(columns={
        _: _.strip() for _ in data.columns if _ != _.strip()
    }).rename(columns={
        'countyCode': 'CountryCode',
        'countyName': 'CountryName',
        'cityCode': 'CityCode',
        'cityName': 'CityName',
        'PinCode': 'ZipCode'
    })  # [1010033, 16]
    data = data[data['CountryCode'] == 'US']  # [139868, 16]
    with open('../../aux_data/raw_hotel.csv', 'w', encoding='utf-8') as f:
        f.write(data.to_csv(index=False, lineterminator='\n'))


def reduce():
    with open('../../aux_data/raw_hotel.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f)
    data = data[[
        'CityName', 'HotelName', 'HotelRating', 'Address',
        'Attractions', 'Description', 'HotelFacilities',
        'Map', 'PhoneNumber', 'ZipCode', 'HotelWebsiteUrl'
    ]]
    data = data.join(
        data['CityName'].str.extract(r'^(\w+), +(\w+)$')
    ).rename(columns={0: 'City', 1: 'State'})
    data = data.join(
        data['Map'].str.split('|', expand=True).astype(float)
    ).rename(columns={0: 'Latitude', 1: 'Longitude'})
    data['StarRating'] = data['HotelRating'].map({
        'OneStar': 1, 'TwoStar': 2, 'ThreeStar': 3,
        'FourStar': 4, 'All': 5
    })
    data['ZipCode'] = data['ZipCode'].str.extract(
        r'^(?:\w{2} )?(\d{5})(?:-\d{4})?$'
    )
    data['PhoneNumber'] = data['PhoneNumber'].str.split(
        '|', n=1, expand=True
    )[0].replace(r'[ ()+\-/]', '', regex=True).str.lstrip('01')
    data = data[[
        'State', 'City', 'Latitude', 'Longitude', 'HotelName',
        'StarRating', 'Description', 'HotelFacilities', 'Attractions',
        'Address', 'ZipCode', 'PhoneNumber', 'HotelWebsiteUrl'
    ]]  # [139868, 13]
    with open('../../aux_data/min_hotel.csv', 'w', encoding='utf-8') as f:
        f.write(data.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    # extract()
    reduce()
