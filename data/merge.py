def merge(data):
    filename = '.'.join(data[0].split('.')[:-1])
    with open(filename, 'wb') as o:
        for _ in data:
            with open(_, 'rb') as i:
                o.write(i.read())


if __name__ == '__main__':
    merge([f'crime/raw_crime.csv.frag{_}' for _ in range(2)])
    merge([f'hotel/raw_hotel.csv.frag{_}' for _ in range(4)])
