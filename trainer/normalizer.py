from datetime import datetime


def normalize_values(rows):
    prev = rows[0]
    rows = rows[1:]

    for row in rows:
        start, open, high, low, close = row['start'], row['open'], row['high'], row['low'], row['close']
        prev_close = prev['close']

        new_start = start / prev['start']
        new_open = open / prev_close
        new_high = high / prev_close
        new_low = low / prev_close
        new_close = close / prev_close

        prev = dict(row)

        row['start'] = new_start
        row['open'] = new_open
        row['high'] = new_high
        row['low'] = new_low
        row['close'] = new_close

    return rows


def normalize_dates(rows):
    for row in rows:
        start = row['start']
        date = datetime.fromtimestamp(start)

        time = date.hour * 60 + date.minute
        weekday = date.isoweekday()

        row['time'] = time
        row['weekday'] = weekday

    return rows


features = 7


def to_array(rows):
    return [[
        r['start'],
        r['open'], r['close'], r['high'],
        r['low'], r['volume'], r['trades']] for r in rows]
