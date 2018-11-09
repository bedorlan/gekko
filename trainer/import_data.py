import os
import json
import sqlite3
import numpy
import keras
import sklearn
from sklearn.preprocessing import MinMaxScaler
import matplotlib.pyplot as plt
import normalizer

# import ipdb


sql = '''
select start, open, high, low, close, volume, trades
from candles_USDT_XRP
where 1 = 1

and trades > 0
and start >= 1538370000
and start <= 1538370000 + (60 * 60 * 24 * 28)
order by start asc

--and start >= 1539648000 - 1440
--and start <= 1539648000
'''


def search_up(i, rows):
    start, close = rows[i]['start'], rows[i]['close']
    start_up = None
    j = i + 1
    while True:
        if j >= len(rows):
            start_up = None
            break

        future_start, future_close = rows[j]['start'], rows[j]['close']
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
    for i, _ in enumerate(rows):
        will_go_up = search_up(i, rows)
        will_go_up = 1 if will_go_up else 0
        rows[i]['will_go_up'] = will_go_up

    return rows


window_size = 1440
features = normalizer.features
MODEL_FILE = 'models/out.model'
SCALER_FILE = 'models/out.scaler'


def create_model():
    model = keras.Sequential()
    model.add(keras.layers.LSTM(10, input_shape=(
        window_size, features), return_sequences=True))
    model.add(keras.layers.Flatten())
    model.add(keras.layers.Dropout(0.2))
    model.add(keras.layers.Dense(2, activation='softmax'))
    model.compile(loss='sparse_categorical_crossentropy',
                  optimizer='adam',
                  metrics=['sparse_categorical_accuracy'])
    model.summary()
    return model


def get_model():
    if os.path.isfile(MODEL_FILE):
        return keras.models.load_model(MODEL_FILE)

    return create_model()


def draw_will_go_up(rows):
    x = [row['start'] for row in rows]
    y = [row['close'] for row in rows]
    c = [('r' if row['will_go_up'] == 1 else 'b') for row in rows]
    plt.scatter(x, y, c=c)
    plt.plot(x, y)
    plt.show()


def main():
    conn = sqlite3.connect('../history/poloniex_0.1.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    rows = c.execute(sql).fetchall()

    rows = [dict(row) for row in rows]
    rows = add_will_go_up(rows)
    rows = normalizer.normalize_dates(rows)
    rows = normalizer.normalize_values(rows)

    # draw_will_go_up(rows)
    # return

    raw_data = normalizer.to_array(rows)

    scaler = MinMaxScaler(feature_range=(-1, 1))
    scaler.fit(raw_data)
    sklearn.externals.joblib.dump(scaler, SCALER_FILE)
    # scaler = sklearn.externals.joblib.load(SCALER_FILE)
    data = scaler.transform(raw_data)

    data = numpy.insert(
        data, features, [r['will_go_up'] for r in rows], axis=1)
    data_windows = create_windows(data, window_size)
    # data_windows = data_windows[:10]  # DELETE_ME
    data_windows = numpy.array(data_windows)
    X = data_windows[:, :, :-1]
    y = data_windows[:, -1, -1]
    # ipdb.set_trace()
    # y = keras.utils.to_categorical(y, num_classes=2)

    # data_windows = numpy.array(data_windows).reshape(-1, window_size, features)

    model = get_model()
    while True:
        epochs = 1
        model.fit(X, y, epochs=epochs, verbose=1, validation_split=0.25)
        model.save(MODEL_FILE)

        # keras.callbacks.EarlyStopping(
        #     monitor='val_loss', min_delta=0, patience=2, verbose=0, mode='auto')


main()
