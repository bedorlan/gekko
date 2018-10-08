const brain = require('brain.js')
const sqlite3 = require('sqlite3')
const { promisify } = require('util')

const db = new sqlite3.Database('history/poloniex_0.1.db')
db.all = promisify(db.all)

async function main() {
  try {
    // const sql = 'select * from candles_USDT_XRP limit 10'
    // const rows = (await db.all(sql)).map(row => [row.id, row.id % 2])
    // console.log(rows)

    const rows = [
      [1, 0, 1, 1, 1, 2],
      [1, 0, 1, 1, 1, 2],
      [1, 0, 1, 1, 1, 2],
      [1, 1, 1, 2, 1, 0],
      [1, 1, 1, 2, 1, 0],
      [1, 1, 1, 2, 1, 0],
      [1, 2, 1, 0, 1, 1],
      [1, 2, 1, 0, 1, 1],
      [1, 2, 1, 0, 1, 1],
    ]

    const net = new brain.recurrent.LSTMTimeStep()
    net.train(rows, { log: true })

    console.log(net.run([1, 1, 1, 2, 1]))
    console.log(net.run([1, 2, 1, 0, 1]))
    console.log(net.run([1, 0, 1, 1, 1]))
  } catch (err) {
    console.error(err)
  }
}

main()

// net.train([[1, 2, 3]])

// var output = net.run([2, 3]) // 3
// console.log(output)
