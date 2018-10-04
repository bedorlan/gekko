require('isomorphic-fetch')
const fs = require('fs')
const { from } = require('rxjs')
const { filter, mergeMap, max, tap } = require('rxjs/operators')

const variables = [
  {
    name: 'short',
    start: 0,
    end: -0.0014,
    increment: 0.0002,
  },
  {
    name: 'long',
    start: 0,
    end: 0.0014,
    increment: 0.0002,
  },
  {
    name: 'weight',
    start: 1,
    end: 101,
    increment: 10,
  },
]

const algorithm = 'my'
// prettier-ignore
const testTpl = {"watch":{"exchange":"poloniex","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"my","candleSize":5,"historySize":288},"my":{"weight":71,"long":0.0012,"short":-0.0014},"backtest":{"daterange":{"from":"2018-09-25T00:00:00Z","to":"2018-10-02T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
// const algorithm = 'DEMA' // recuerda descomentar la primer linea de la funcion test
// const testTpl = {"watch":{"exchange":"kraken","currency":"USD","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":21,"thresholds":{"down":-0.001,"up":0.001}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
// prettier-ignore
// const testTpl = {"watch":{"exchange":"poloniex","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":5,"historySize":288},"DEMA":{"weight":21,"thresholds":{"down":-0.025,"up":0.025}},"backtest":{"daterange":{"from":"2018-09-24T00:00:00Z","to":"2018-10-02T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
// const testTpl = {"watch":{"exchange":"binance","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":21,"thresholds":{"down":-0.025,"up":0.025}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}

async function test(vars) {
//   vars = { ...vars, thresholds: vars } // for DEMA
  const tpl = { ...testTpl, [algorithm]: vars }
  const response = await fetch('http://localhost:3000/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tpl),
  })
  return await response.json()
}

function variableAggregator(childFn, variable) {
  return parent => {
    const { name, start, end, increment } = variable
    for (
      let i = Math.min(start, end);
      i <= Math.max(start, end);
      i += Math.abs(increment)
    ) {
      childFn({ ...parent, [name]: i })
    }
  }
}

function evalAlphaTrades(result) {
  return result.performanceReport.alpha * 1000 + result.performanceReport.trades
}

function evalBalanceTrades(result) {
  return result.performanceReport.balance
}

function evalPreferingRoundtrips(result) {
  return (
    result.roundtrips.reduce(
      (prev, next) => prev + (next.profit >= 0 ? 1 : next.profit),
      0,
    ) +
    result.performanceReport.trades / 2.0
  )
}

function prettierResult(x) {
  const y = { ...x }
  delete y.result
  return { ...y, result: { performanceReport: x.result.performanceReport } }
}

async function main() {
  try {
    const logFile = fs.createWriteStream('bruteforce.csv')

    const tests = []
    const aggregatorFn = variables.reduce(
      variableAggregator,
      tests.push.bind(tests),
    )

    aggregatorFn()

    const totalTests = tests.length
    let testsDone = 0
    const timeStarted = Date.now()

    from(tests)
      .pipe(
        // mergeMap(test)
        mergeMap(async vars => {
          let result = await test(vars)
          result.performanceReport = result.performanceReport || {
            balance: 100,
            alpha: 0,
            trades: 0,
          }
          return {
            ...vars,
            result,
            // performance: evalPreferingRoundtrips(result)
            performance: evalBalanceTrades(result),
            // performance: evalAlphaTrades(result)
          }
        }, 4),
        tap(() => {
          ++testsDone
          const timeSpend = Date.now() - timeStarted
          const testsLeft = totalTests - testsDone
          const timePerTest = timeSpend / testsDone
          const timeLeft = timePerTest * testsLeft
          const millisPerMinute = 1000 * 60
          const minutesLeft =
            Math.trunc((timeLeft * 100) / millisPerMinute) / 100
          console.log('timeLeft', minutesLeft)
        }),
        filter(x => x.result.performanceReport.trades >= 2),
        tap(x => {
          const y = prettierResult(x)
          logFile.write(
            `${y.weight},${y.up},${y.down},${y.long},${y.short},${
              y.performance
            }\n`,
          )
          console.log(y)
        }),
        max((x, y) => x.performance - y.performance),
      )
      .subscribe(vars => {
        const results = prettierResult(vars)
        const prettyOutput = Object.keys(results).reduce(
          (prev, curr) => `${prev}\n${curr}=${results[curr]}`,
          '',
        )
        console.log('max')
        console.log(prettyOutput)
        logFile.end()
      })

    aggregatorFn()
  } catch (err) {
    console.error(err)
  }
}

main()
