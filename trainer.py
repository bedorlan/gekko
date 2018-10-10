import keras
import numpy as np

# return training data


def get_train():
    X = np.array([0, 1, 2, 3, 4]).reshape((5, 1, 1))
    y = np.array([1, 2, 3, 4, 5])
    return X, y


model = keras.models.Sequential()
model.add(keras.layers.LSTM(10, input_shape=(1, 1)))
model.add(keras.layers.Dense(1, activation='linear'))
model.compile(loss='mse', optimizer='adam')
X, y = get_train()
model.fit(X, y, epochs=5000)

yhat = model.predict(np.array([2, 4, 3]).reshape(3, 1, 1))
print(yhat)
