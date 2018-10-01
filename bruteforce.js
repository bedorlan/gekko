require('isomorphic-fetch')
const fs = require('fs')
const { of, from, Subject } = require('rxjs')
const { mergeMap, max, tap } = require('rxjs/operators')

const variables = [{
    name: 'down',
    start: 0,
    end: -0.1,
    increment: 0.01,
},{
    name: 'up',
    start: 0,
    end: 0.1,
    increment: 0.01,
},{
    name: 'weight',
    start: 1,
    end: 101,
    increment: 10,
}]

// const algorithm = "my"
// const testTpl = {"watch":{"exchange":"kraken","currency":"USD","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"my","candleSize":12,"historySize":10},"my":{"weight":25,"long":0.0005,"short":0},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
const algorithm = "DEMA"
// const testTpl = {"watch":{"exchange":"kraken","currency":"USD","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":21,"thresholds":{"down":-0.001,"up":0.001}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
// const testTpl = {"watch":{"exchange":"poloniex","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":31,"thresholds":{"down":-0.006,"up":0.01}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
// const testTpl = {"watch":{"exchange":"binance","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":10},"DEMA":{"weight":21,"thresholds":{"down":-0.025,"up":0.025}},"backtest":{"daterange":{"from":"2018-08-05T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}
const testTpl = {"watch":{"exchange":"poloniex","currency":"USDT","asset":"XRP"},"paperTrader":{"feeMaker":0.25,"feeTaker":0.25,"feeUsing":"maker","slippage":0.05,"simulationBalance":{"asset":1,"currency":100},"reportRoundtrips":true,"enabled":true},"tradingAdvisor":{"enabled":true,"method":"DEMA","candleSize":12,"historySize":100},"DEMA":{"weight":73,"thresholds":{"down":-0.0024,"up":0.0168}},"backtest":{"daterange":{"from":"2018-08-04T00:00:00Z","to":"2018-08-17T00:00:00Z"}},"backtestResultExporter":{"enabled":true,"writeToDisk":false,"data":{"stratUpdates":false,"roundtrips":true,"stratCandles":true,"stratCandleProps":["open"],"trades":true}},"performanceAnalyzer":{"riskFreeReturn":2,"enabled":true},"valid":true}

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

function evalAlphaTrades(result) {
    return result.performanceReport.alpha * 1000 + result.performanceReport.trades
}

function evalBalanceTrades(result) {
    return result.performanceReport.balance * 1000 + result.performanceReport.trades
}

function evalPreferingRoundtrips(result) {
    return result.roundtrips.reduce((prev, next) => prev + (next.profit >= 0 ? 1 : next.profit), 0)
        + result.performanceReport.trades / 2.0
}

function prettierResult(x) {
    const y = {...x}
    delete y.result
    return {...y, result: x.result.performanceReport}
}

async function main() {
    try {
        const logFile = fs.createWriteStream('bruteforce.csv')
        const subject = new Subject()
        const aggregatorFn = variables.reduce(variableAggregator, subject.next.bind(subject))

        from(subject).pipe(
            // mergeMap(test)
            mergeMap(async vars => {
                let result = await test(vars)
                result.performanceReport = result.performanceReport || {balance: 100, alpha: 0, trades: 0}
                return {
                    ...vars, 
                    result,
                    // performance: evalPreferingRoundtrips(result)
                    performance: evalBalanceTrades(result)
                    // performance: evalAlphaTrades(result)
                }
            }, 4),
            tap(x => {
                const y = prettierResult(x)
                logFile.write(`${y.weight},${y.up},${y.down},${y.performance}\n`)
                console.log(y)
            }),
            max((x, y) => x.performance - y.performance)
        )
        .subscribe(vars => {
            const results = prettierResult(vars)
            const prettyOutput = Object.keys(results).reduce((prev, curr) => `${prev}\n${curr}=${results[curr]}`, '')
            console.log('max')
            console.log(prettyOutput)
            logFile.end()
        })
        
        aggregatorFn()
        subject.complete()

    } catch(err) {
        console.error(err)

    }
}

main()
