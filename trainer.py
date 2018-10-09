import tensorflow as tf
import tensorflow.contrib as tfcontrib
import numpy as np

columns = [tfcontrib.feature_column.sequence_numeric_column('value')]

# contrib.estimator.feature_column_lib._SequenceDenseColumn()
# contrib.feature_column.sequence_numeric_column

estimator = tfcontrib.estimator.RNNEstimator(
    head=tfcontrib.estimator.regression_head(),
    sequence_feature_columns=columns,
    cell_type='lstm',
    num_units=[4]
)

# dense_value_tensor = tf.constant([0, 2, 4, 6])
# value_tensor = tfcontrib.layers.dense_to_sparse(dense_value_tensor)
# value_tensor = tf.IndexedSlices(tf.constant(
#     [2, 4, 6, 8]), tf.constant([1, 2, 3, 4]), tf.constant([4]))
value_tensor = tf.SparseTensor(
    [[1, 1], [2, 1], [3, 1], [4, 1]], [2, 4, 6, 8], [2, 4])
print value_tensor
print "yes"
# tf.data.Dataset.from_tensor_slices
# input_fn_2 = tf.estimator.inputs.numpy_input_fn(
#     {'value': np.array([0, 2, 4, 6])}, shuffle=True, num_epochs=1)


def input_fn():
    features = {
        'value': value_tensor
    }
    labels = [4, 1]
    return features, labels


estimator.train(input_fn=input_fn)
