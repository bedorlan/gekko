import keras
import numpy
import sqlite3
import datetime
import time


def toUnix(dt):
    return int(dt.strftime("%s"))


conn = sqlite3.connect('history/poloniex_0.1.db')

sql = '''
select open
from candles_USDT_XRP
where start >= ?
and start < ?
order by start asc
'''

start = toUnix(datetime.datetime(2018, 10, 1))
end = toUnix(datetime.datetime(2018, 10, 1, 1))
raw_data = [row[0] for row in conn.execute(sql, (start, end))]
data = numpy.array(raw_data).reshape((6, 10, 1))
print data
x = data[:, :-1]
y = data[:, -1]


model = keras.models.Sequential()
# stateful=True means that the states computed for the samples in one batch will be reused as initial states for the samples in the next batch.
model.add(keras.layers.LSTM(10, input_shape=(9, 1)))
model.add(keras.layers.Dense(1, activation='linear'))
model.compile(loss='mse', optimizer='adam')
model.fit(x, y, epochs=2000)

test_data = [0.58195611,
             0.58042025,
             0.58042025,
             0.58042025,
             0.58042025,
             0.58299986,
             0.58023276,
             0.58289949,
             0.58202503,
             0.58202503]
test_data = test_data[:-1]

yhat = model.predict(numpy.array(test_data).reshape(1, 9, 1))
print(yhat)

'''
reshape(samples, time_steps, features)
>>> np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).reshape((2, 3, 2))
array([[[ 1,  2],
        [ 3,  4],
        [ 5,  6]],

       [[ 7,  8],
        [ 9, 10],
        [11, 12]]])
>>> a = np.array([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]]).reshape((3, 4, 1))
>>> a
array([[[ 1],
        [ 2],
        [ 3],
        [ 4]],

       [[ 5],
        [ 6],
        [ 7],
        [ 8]],

       [[ 9],
        [10],
        [11],
        [12]]])
>>> a[:,:-1]
array([[[ 1],
        [ 2],
        [ 3]],

       [[ 5],
        [ 6],
        [ 7]],

       [[ 9],
        [10],
        [11]]])
>>> a[:,-1]
array([[ 4],
       [ 8],
       [12]])
>>>
'''
