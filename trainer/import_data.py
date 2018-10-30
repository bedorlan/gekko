import sqlite3
from datetime import datetime
import matplotlib.pyplot as plt

conn = sqlite3.connect('../history/poloniex_0.1.db')
c = conn.cursor()

sql = '''
select start, open, high, low, close, volume, trades
from candles_USDT_XRP
where trades > 0
and start >= (1540907640 - 604800 * 2)
and start < (1540907640 - 604800 * 1)
order by start asc
--limit 1000
'''

rows = c.execute(sql).fetchall()
# __import__('ipdb').set_trace()


def search_up(i):
    (start, _, _, _, close, _, _) = rows[i]
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


prev_close = None
x = [None] * len(rows)
y = [None] * len(rows)
c = [None] * len(rows)
for i, (start, open, high, low, close, volume, trades) in enumerate(rows):
    date = datetime.fromtimestamp(start)
    x[i] = start
    y[i] = close
    c[i] = 'b'

    if prev_close is None:
        prev_close = close
        continue

    new_open = open / prev_close
    new_high = high / prev_close
    new_low = low / prev_close
    new_close = close / prev_close
    will_go_up = search_up(i)
    prev_close = close

    if will_go_up:
        c[i] = 'r'

# print x, y, c
plt.scatter(x, y, c=c)
plt.plot(x, y)
plt.show()
