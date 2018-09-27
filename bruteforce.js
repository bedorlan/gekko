require('isomorphic-fetch')
const { of, from, Subject } = require('rxjs')
const { mergeMap, max, tap } = require('rxjs/operators')

const variables = [{
    name: 'down',
    start: 0.0,
    end: -0.01,
    increment: 0.001,
    // increment: 0.01,
},{
    name: 'up',
    start: 0.0,
    end: 0.01,
    increment: 0.001,
    // increment: 0.01,
},{
    name: 'weight',
    start: 1,
    end: 99,
    increment: 10,
    // increment: 100,
}]

// const algorithm = "my"
// const testTpl = {"watch":{"exchange":"kraken","currency":"USD","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"my","candleSize":12,"historySize":10},"my":{"weight":25,"long":0.0005,"short":0},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
const algorithm = "DEMA"
const testTpl = {"watch":{"exchange":"kraken","currency":"USD","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":21,"thresholds":{"down":-0.001,"up":0.001}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}

async function test(vars) {
    vars = {...vars, thresholds: vars} // for DEMA
    const tpl = {...testTpl, [algorithm]: vars}
    const response = await fetch('http://localhost:3000/api/backtest', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(tpl)
    })
    return await response.json()
}

function variableAggregator(childFn, variable) {
    return (parent) => {
        const {name, start, end, increment} = variable
        for (let i = Math.min(start, end); i <= Math.max(start, end); i += Math.abs(increment)) {
            childFn({...parent, [name]: i})
        }
    }
}

async function main() {
    try {
        const subject = new Subject()
        const aggregatorFn = variables.reduce(variableAggregator, subject.next.bind(subject))

        from(subject).pipe(
            // mergeMap(test)
            mergeMap(async vars => {
                let result = await test(vars)
                result = result.performanceReport || {balance: 100, trades: 0}
                return {...vars, result}
            }, 4),
            tap(console.log),
            max((x, y) => {
                let comp = x.result.balance - y.result.balance
                if (comp != 0.0) {
                    return comp
                }
                return x.result.trades - y.result.trades
            })
        )
        .subscribe(vars => {
            console.log('max', vars)
        })
        
        aggregatorFn()
        subject.complete()

    } catch(err) {
        console.error(err)
    }
}

main()

/*
my 12 minutes 10 periods
max { weight: 21, short: 0.003, long: 0.006, result: 102.12270177 }
dema 12minutes 10
weight = 31
[thresholds]
down = -0.006
up = 0.01
  result: 
     balance: 107.99624172,
     trades: 6,
*/