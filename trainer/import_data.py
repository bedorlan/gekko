import os
import json
import sqlite3
import numpy
import keras
import sklearn
from sklearn.preprocessing import RobustScaler, MinMaxScaler
import matplotlib.pyplot as plt
import normalizer
import talos


sql = '''
select start, open, high, low, close, volume, trades
from candles_USDT_XRP
where 1 = 1
and trades > 0

-- julio
--and start >= 1530421200
--and start <= 1530421200 + (60 * 60 * 24 * 92)

-- agosto
--and start >= 1533099600
--and start <= 1533099600 + (60 * 60 * 24 * 92)

-- octubre
and start >= 1538370000
and start <= 1538370000 + (60 * 60 * 24 * 31)

-- 1 day
--and start >= 1538370000 + (60 * 60 * 24 * 10)
--and start <= 1538370000 + (60 * 60 * 24 * 11)

order by start asc
'''

up_search_interval = 60
up_duration = 10
expected_profit = 1.013


def search_up(i, rows):
    start, close = rows[i]['start'], rows[i]['close']
    start_up = None
    j = i + 1
    while True:
        if j >= len(rows):
            start_up = None
            break

        future_start, future_close = rows[j]['start'], rows[j]['close']
        if future_start - start > 60 * up_search_interval:
            start_up = None
            break

        if start_up is not None and future_start - start_up > 60 * up_duration:
            break

        if future_close / close >= expected_profit:
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
    input_size = features * window_size
    model = keras.Sequential()
    model.add(keras.layers.Dense(2,
                                 input_dim=input_size,
                                 #  activation='relu'
                                 ))
    model.add(keras.layers.Dense(2))
    model.add(keras.layers.Dense(input_size, activation='sigmoid'))
    model.compile(loss='mse',
                  optimizer='adam',
                  #   optimizer='sgd',
                  metrics=[
                      #   'acc',
                      'mape',
                  ],
                  )
    return model


def get_model():
    model = None
    if os.path.isfile(MODEL_FILE):
        model = keras.models.load_model(MODEL_FILE)
    else:
        model = create_model()
    model.summary()
    return model


def draw_will_go_up(rows):
    x = [row['start'] for row in rows]
    y = [row['close'] for row in rows]
    c = [('r' if row['will_go_up'] == 1 else 'b') for row in rows]
    plt.scatter(x, y, c=c)
    plt.plot(x, y)
    plt.show()


def talos_model(X, y, X_val, y_val, params):
    input_size = features * window_size
    model = keras.Sequential()
    model.add(keras.layers.Dense(params['dense'],
                                 input_dim=input_size,
                                 #  activation='relu'
                                 ))
    model.add(keras.layers.Dense(params['dense']))
    model.add(keras.layers.Dense(input_size, activation='sigmoid'))
    model.compile(loss='mse', optimizer='adam')

    early_stopper = keras.callbacks.EarlyStopping(monitor='val_loss',
                                                  patience=100,
                                                  restore_best_weights=True)

    epochs = 1000000
    history = model.fit(X, y,
                        epochs=epochs,
                        validation_data=[X_val, y_val],
                        verbose=0,
                        callbacks=[early_stopper]
                        )
    return history, model


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
    data = raw_data

    scaler = RobustScaler()
    scaler.fit(data)
    data = scaler.transform(data)
    scaler = MinMaxScaler()
    scaler.fit(data)
    data = scaler.transform(data)
    # sklearn.externals.joblib.dump(scaler, SCALER_FILE)

    data = numpy.insert(
        data, features, [r['will_go_up'] for r in rows], axis=1)

    data_windows = create_windows(data, window_size)
    data_windows = filter(lambda row: row[-1][-1] == 1, data_windows)
    data_windows = numpy.array(data_windows)
    data_windows = data_windows[:, :, :-1]
    data_windows = data_windows.reshape(-1, window_size * features)

    # X = data_windows[:12]
    X = data_windows
    y = X

    params = {
        "dense": (1, 101, 10),
    }
    talos.Scan(X, y, params, talos_model,
               dataset_name='201810', print_params=True)

    # y = model.predict(X)
    # for i, _ in enumerate(X):
    #     print i
    #     print X[i].tolist()
    #     print y[i].tolist()
    # return


main()
