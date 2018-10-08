const brain = require('brain.js')
const tf = require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')

const db = new sqlite3.Database('history/poloniex_0.1.db')
db.all = promisify(db.all)

const groupsQuantity = 101

async function main() {
  try {
    // el mes arranca en zero :/
    const startDate = new Date(2018, 10 - 1, 1).getTime() / 1000
    const endDate = new Date(2018, 10 - 1, 2).getTime() / 1000

    const sql = `
      select *
      from candles_USDT_XRP
      where start >= ?
      and start < ?
      order by start asc
    `
    let result = await db.all(sql, [startDate, endDate])
    let rows = result.map(r => r.open)
    rows = normalizeRows(rows)
    // rows = chunkRows(rows, 60)

    // const inputShape = tf.util.inferShape(rows)
    const inputShape = [24, 60]
    const model = tf.sequential()
    model.add(
      tf.layers.lstm({
        units: groupsQuantity,
        inputShape,
        returnSequences: true,
      }),
    )

    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' })
    const tensor = tf.tensor3d(rows, [1, 24, 60])
    tensor.print()
    // await model.fit(tensor)

    // console.log(JSON.stringify(rows))

    // const net = new brain.recurrent.LSTMTimeStep()
    // net.train(rows, { log: true })
    // console.log(JSON.stringify(net.toJSON(), null, 2))
  } catch (err) {
    console.error(err)
  }
}

function normalizeRows(rows) {
  let uniqueRows = new Set(rows)
  uniqueRows = Array.from(uniqueRows).sort()

  const groupSize = Math.trunc(uniqueRows.length / groupsQuantity)
  const groups = Array(groupsQuantity - 1)
    .fill()
    .map((value, i) => uniqueRows[(i + 1) * groupSize])
    .sort()
  groups.push(Number.MAX_SAFE_INTEGER)

  const groupZero = Math.trunc(groupsQuantity / 2)
  const normalizedRows = rows.map(r => groups.findIndex(g => r < g) - groupZero)

  return normalizedRows
}

function chunkRows(rows, size) {
  return Array(Math.ceil(rows.length / size))
    .fill()
    .map((v, i) => rows.slice(i * size, (i + 1) * size))
}

main()

// net.train([[1, 2, 3]])

// var output = net.run([2, 3]) // 3
// console.log(output)
