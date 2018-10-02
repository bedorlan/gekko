// Source: https://raw.githubusercontent.com/imperator6/gekko/stable/strategies/EMA_OR_PRICE_DIV.js
// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// helpers
var _ = require('lodash')
var log = require('../core/log.js')
// log.debug = console.log

// configuration
var config = require('../core/util.js').getConfig()
var settings = config.my

// let's create our own method
var method = {}

// prepare everything our method needs
method.init = function() {
  this.name = 'my'

  this.requiredHistory = this.tradingAdvisor.historySize

  // define the indicators we need
  this.addIndicator('ema', 'EMA', settings.weight)
}

// what happens on every new candle?
method.update = function(candle) {
  const ema = this.indicators.ema.result
  this.prev = this.current || ema
  this.current = ema
  // log.debug(`${this.indicators.ema.age},${this.indicators.ema.result},${candle.close}`)
}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function() {}

method.check = function(candle) {
  const slope = this.current / this.prev
  const variation = slope - 1.0
  log.debug('slope', slope, 'variation', variation)

  if (variation > settings.long) {
    this.advice('long')
  } else if (variation < settings.short) {
    this.advice('short')
  }
}

module.exports = method
