def split(data, path):
    with open(data, 'rb') as i:
        part = 0
        while _ := i.read(100 * 1024 ** 2):
            with open(f'{path}/{data.split("/")[-1]}.frag{part}', 'wb') as o:
                o.write(_)
            part += 1


if __name__ == '__main__':
    for _ in {
        # '../aux_data/min_hotel.csv': 'hotel',
        '../aux_data/park/raw_park_a00b.geojson': 'park',
        '../aux_data/history/raw_history_a013.geojson': 'history'
    }.items():
        split(*_)
