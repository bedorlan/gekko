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
  this.scaler = {
    max: [
      6.0, // weekday
      1439.0, // time
      1.015393945472186, // open
      1.0293323265306125, // close
      1.0293323265306125, // high
      1.015393945472186, // low
      534925.0501319598, // volume
      179.0, // trades
    ],
    min: [
      0.0,
      0.0,
      0.9866715722845655,
      0.9709941227278409,
      0.9866715722845655,
      0.9622640075179876,
      2.82e-6,
      1.0,
    ],
  }
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

  candle.weekday = (candle.start.weekday() + 6) % 7 // FIXME
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
  if (this.candles.length != time_steps + 1) {
    // console.log('not ready', this.candles.length)
    return
  }

  if (this.investment == null) {
    const normalizedCandles = normalizeCandles(this.candles)
    const scaledCandles = scaleCandles(this.scaler, normalizedCandles)

    fs.appendFileSync('./fifoin', JSON.stringify(scaledCandles))
    let result = fs.readFileSync('./fifoout')
    let prediction = JSON.parse(result)[0][0]
    console.log('prediction')

    if (prediction < 0) {
      return
    }
    this.investment = {
      price: candle.close,
      start: Date.now(),
    }
    console.log('long!')
    this.advice('long')
  } else {
    console.log(
      this.investment.price,
      this.investment.price * 1.013,
      candle.close,
    )
    if (candle.close >= this.investment.price * 1.013) {
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

function scaleCandles(scaler, candles) {
  return candles.map(candle => {
    candle = [
      candle.weekday,
      candle.time,
      candle.open,
      candle.close,
      candle.high,
      candle.low,
      candle.volume,
      candle.trades,
    ]
    return scaler.min.map((min, i) => scale(min, scaler.max[i], candle[i]))
  })
}

function scale(min, max, x) {
  const scaled = (x - min) / (max - min)
  const ranged = scaled * 2.0 - 1.0
  return ranged
}

module.exports = method
