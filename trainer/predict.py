import sys
import os
import ast
import sqlite3
from datetime import datetime
import numpy
import keras
import sklearn
from sklearn.preprocessing import MinMaxScaler
import matplotlib.pyplot as plt


window_size = 1440
features = 8
MODEL_FILE = 'models/out.model'
SCALER_FILE = 'models/out.scaler'


def get_model(path):
    return keras.models.load_model(path + '/' + MODEL_FILE)


def get_scaler(path):
    return sklearn.externals.joblib.load(path + '/' + SCALER_FILE)


def main():
    mypathname = os.path.dirname(sys.argv[0])
    model = get_model(mypathname)
    scaler = get_scaler(mypathname)
    while True:
        sys.stderr.write('waiting from fifoin\n')
        with open(mypathname + '/../fifoin', 'r') as fifoin:
            line = fifoin.read()

        sys.stderr.write('new data arrived!\n')
        data = ast.literal_eval(line)
        data = scaler.transform(data)
        data = numpy.array(data).reshape(1, 1440, 8)
        result = model.predict(data)
        sys.stderr.write('writing to fifoout\n')
        with open(mypathname + '/../fifoout', 'a') as fifoout:
            fifoout.write(str(result.tolist()))


main()
