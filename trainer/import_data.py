import sqlite3
from datetime import datetime
import matplotlib.pyplot as plt


sql = '''
select start, open, high, low, close, volume, trades
from candles_USDT_XRP
where trades > 0
and start >= (1540907640 - 604800 * 2)
and start < (1540907640 - 604800 * 1)
order by start asc
--limit 1000
'''

# __import__('ipdb').set_trace()


def search_up(i, rows):
    start, close = rows[i]['start'], rows[i]['close']
    start_up = None
    j = i + 1
    while True:
        if j >= len(rows):
            start_up = None
            break

        (future_start, _, _, _, future_close, _, _) = rows[j]
        if future_start - start > 60 * 60:
            start_up = None
            break

        if start_up is not None and future_start - start_up > 60 * 5:
            break

        if future_close / close >= 1.013:
            if start_up is None:
                start_up = future_start
        else:
            start_up = None

        j += 1

    return start_up is not None


def create_windows(y, window_size):
    return [y[i:][:window_size] for i, _ in enumerate(y)][:-window_size+1]


def add_will_go_up(rows):
    for i, row in enumerate(rows):
        rows[i] = dict(row)
        will_go_up = search_up(i, rows)
        will_go_up = 1 if will_go_up else 0
        rows[i]['will_go_up'] = will_go_up


def normalize(rows):
    prev_close = None
    for i, row in enumerate(rows):
        start, open, high, low, close, volume, trades = row['start'], row['open'], row[
            'high'], row['low'], row['close'], row['volume'], row['trades']

        date = datetime.fromtimestamp(start)
        will_go_up = 0
        rows[i] = dict(row)
        rows[i]['will_go_up'] = will_go_up

        if prev_close is None:
            prev_close = close
            continue

        new_open = open / prev_close
        new_high = high / prev_close
        new_low = low / prev_close
        new_close = close / prev_close
        will_go_up = search_up(i, rows)
        prev_close = close

        if will_go_up:
            will_go_up = 1

        rows[i]['will_go_up'] = will_go_up


def main():
    conn = sqlite3.connect('../history/poloniex_0.1.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    rows = c.execute(sql).fetchall()
    add_will_go_up(rows)
    # print rows
    x = [row['start'] for row in rows]
    y = [row['close'] for row in rows]
    c = [('r' if row['will_go_up'] == 1 else 'b') for row in rows]
    plt.scatter(x, y, c=c)
    plt.plot(x, y)
    plt.show()


main()
