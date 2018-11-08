const { spawn } = require('child_process')
const fs = require('fs')
const log = require('../core/log.js')
log.debug = console.log

const time_steps = 1440

// configuration
// var config = require('../core/util.js').getConfig()
// var settings = config.my

// let's create our own method
var method = {}

// prepare everything our method needs
method.init = async function() {
  this.name = 'my2'
  //   this.requiredHistory = this.tradingAdvisor.historySize
  this.requiredHistory = time_steps
  this.candles = []
  // const predictor = spawn('python', ['./trainer/predict.py'])
  // this.predictor = predictor
  // this.predictor.stderr.on('data', data => console.error(data.toString()))
}

// what happens on every new candle?
method.update = function() {
  let candle = { ...this.candle }
  if (candle.trades < 1.0) {
    return
  }

  candle.weekday = candle.start.isoWeekday()
  candle.time = candle.start.hours() * 60 + candle.start.minutes()

  this.candles.push(candle)
  if (this.candles.length > time_steps + 1) {
    this.candles = this.candles.slice(1)
  }
}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function() {}

method.check = function(candle) {
  if (this.investment == null) {
    if (candle.trades < 1.0 || this.candles.length != time_steps + 1) {
      // console.log('not ready', this.candles.length)
      return
    }

    const normalizedCandles = normalizeCandles(this.candles)
    const scaledCandles = toCandlesArray(normalizedCandles)

    // console.log(JSON.stringify(scaledCandles[scaledCandles.length - 1]))
    // return
    fs.appendFileSync('./fifoin', JSON.stringify(scaledCandles))
    let result = fs.readFileSync('./fifoout')
    let prediction = JSON.parse(result)[0][1]
    // console.log('prediction', prediction)

    if (prediction < 0.5) {
      return
    }
    this.investment = {
      price: candle.close,
      start: candle.start,
    }
    console.log('long!')
    this.advice('long')
  } else {
    console.log(
      this.investment.price,
      this.investment.price * 1.013,
      candle.close,
      'remaining',
      3600 * 1000 - (candle.start - this.investment.start),
    )
    if (
      candle.close >= this.investment.price * 1.013 ||
      candle.start - this.investment.start > 1000 * 3600
    ) {
      this.investment = null
      console.log('short!')
      this.advice('short')
    }
  }
}

method.end = function() {
  if (this.predictor != null) {
    this.predictor.kill()
    this.predictor = null
  }
}

function normalizeCandles(candles) {
  let prev = candles[0]
  return candles.slice(1).map(candle => {
    const newCandle = {
      ...candle,
      open: candle.open / prev.close,
      high: candle.high / prev.close,
      low: candle.low / prev.close,
      close: candle.close / prev.close,
    }
    prev = candle
    return newCandle
  })
}

function toCandlesArray(candles) {
  return candles.map(candle => {
    return [
      candle.weekday,
      candle.time,
      candle.open,
      candle.close,
      candle.high,
      candle.low,
      candle.volume,
      candle.trades,
    ]
    // return scaler.min.map((min, i) => scale(min, scaler.max[i], candle[i]))
  })
}

function scale(min, max, x) {
  const scaled = (x - min) / (max - min)
  const ranged = scaled * 2.0 - 1.0
  return ranged
}

module.exports = method
