const brain = require('brain.js')
const tf = require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')

async function main() {
  try {
    const model = await tf.loadModel('file://models/model.json')

    const shape = [1, 9, 1]
    const result = model.predict(
      tf.tensor([11, 12, 13, 14, 15, 16, 17, 18, 19].map(x => x + 0), shape),
    )
    result.print()
  } catch (err) {
    console.error(err)
  }
}

main()

// net.train([[1, 2, 3]])

// var output = net.run([2, 3]) // 3
// console.log(output)
