def merge(data):
    with open('.'.join(data[0].split('.')[:-1]), 'wb') as o:
        for _ in data:
            with open(_, 'rb') as i:
                o.write(i.read())


if __name__ == '__main__':
    for _ in [
        # [f'hotel/min_hotel.csv.frag{_}' for _ in range(4)],
        # [f'park/raw_park_a00b.geojson.frag{_}' for _ in range(2)],
        [f'history/raw_history_a013.geojson.frag{_}' for _ in range(2)]
    ]:
        merge(_)
