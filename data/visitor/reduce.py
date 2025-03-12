import pandas as pd


def reduce():
    def _convert(col):
        if col.name.endswith('%'):
            return col.str.replace('%', '').astype(float) / 100
        else:
            return col.str.replace(',', '').astype(int)

    with open('../../aux_data/raw_visitor.csv', 'r', encoding='utf-8') as f:
        data = pd.read_csv(f, skiprows=3)
    col_mapping = {
        'Field1': 'Park',
        'Field2': 'RecreationVisitors',
        'Textbox22': 'RecreationVisitors%',
        'Field4': 'RecreationVisitorDays',
        'Textbox24': 'RecreationVisitorDays%',
        'TotalNonRecreationVisits': 'NonRecreationVisitors',
        'Textbox98': 'NonRecreationVisitors%',
        'TotalRecreationVisitorHours': 'RecreationVisitorHours',
        'Textbox103': 'RecreationVisitorHours%',
        'TotalNonRecreationVisitorHours': 'NonRecreationVisitorHours',
        'Textbox109': 'NonRecreationVisitorHours%'
    }
    data = data.rename(columns=col_mapping)[
        ['State'] + list(col_mapping.values())
    ]
    data[data.columns[2:]] = data[data.columns[2:]].apply(_convert)
    with open('min_visitor.csv', 'w', encoding='utf-8') as f:
        f.write(data.to_csv(index=False, lineterminator='\n'))


if __name__ == '__main__':
    reduce()
