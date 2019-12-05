if (!process.env.PROVIDER_URL) {
  console.error(
    'No web3 provider set. Please set the PROVIDER_URL environment variable'
  )
  return
}

const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')

const indexRouter = require('./routes/index')
const apiRouter = require('./routes/api')

const app = express()
app.use(cors())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use('/', indexRouter)
app.use('/api', apiRouter)

const { abi } = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')

module.exports = app
