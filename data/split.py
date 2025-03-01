def split(data, path):
    filename = data.split('/')[-1]
    with open(data, 'rb') as i:
        part = 0
        while _ := i.read(100 * 1024 ** 2):
            with open(f'{path}/{filename}.frag{part}', 'wb') as o:
                o.write(_)
            part += 1


if __name__ == '__main__':
    split('../aux_data/raw_crime.csv', 'crime')
    split('../aux_data/raw_hotel.csv', 'hotel')
