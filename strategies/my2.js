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
method.init = function() {
  this.name = 'my2'
  //   this.requiredHistory = this.tradingAdvisor.historySize
  this.requiredHistory = time_steps
  this.candles = []
  this.up_tendencies = 0
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

  candle.start = candle.start.unix()

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

    // console.log(JSON.stringify(scaledCandles[scaledCandles.length - 1]))
    // return
    fs.appendFileSync('./fifoin', JSON.stringify(this.candles))
    let result = fs.readFileSync('./fifoout')
    let prediction = JSON.parse(result)[0][1]
    // console.log('prediction', prediction)

    if (prediction >= 0.5) {
      console.log('up!')
      this.up_tendencies += 1
    } else {
      this.up_tendencies = 0
    }

    if (this.up_tendencies < 3) {
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
      this.up_tendencies = 0
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

module.exports = method
