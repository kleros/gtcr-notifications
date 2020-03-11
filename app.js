if (!process.env.PROVIDER_URL)
  throw new Error(
    'No web3 provider set. Please set the PROVIDER_URL environment variable'
  )

if (!process.env.GTCR_VIEW_ADDRESS)
  throw new Error('Missing GTCR View contract address set.')

const level = require('level')
const ethers = require('ethers')

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL)
provider.pollingInterval = 60 * 1000

const {
  abi: _GTCRView
} = require('@kleros/tcr/build/contracts/GeneralizedTCRView.json')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const {
  abi: _IArbitrator
} = require('@kleros/tcr/build/contracts/IArbitrator.json')

const gtcrView = new ethers.Contract(
  process.env.GTCR_VIEW_ADDRESS,
  _GTCRView,
  provider
)
const db = level('./db')

const tcrInstances = {}
const arbitratorInstances = {}

;(async () => {
  const disputeCallback = require('./events/dispute')
  const evidenceCallback = require('./events/evidence')
  const resolvedCallback = require('./events/resolved')
  const appealableRulingCallback = require('./events/appeal-possible')
  const appealCallback = require('./events/appeal-decision')
  const tcrEventToCallback = {
    Evidence: evidenceCallback,
    Dispute: disputeCallback,
    ItemStatusChange: resolvedCallback
  }
  const arbitratorEventToCallback = {
    AppealPossible: appealableRulingCallback,
    AppealDecision: appealCallback
  }

  const { TCRS, ARBITRATORS } = require('./utils/db-keys')

  // Setup listeners for each TCR being watched.
  const fromBlock = await provider.getBlock()
  let tcrs = {}
  try {
    tcrs = JSON.parse(await db.get(TCRS))
  } catch (err) {
    if (err.type !== 'NotFoundError') throw new Error(err)
  }

  // Iterate through every user subscribed to events for each tcr and
  // add event handlers for each one.
  Object.keys(tcrs).forEach(tcrAddr => {
    tcrInstances[tcrAddr] = new ethers.Contract(tcrAddr, _GTCR, provider)
    Object.keys(tcrEventToCallback).forEach(eventName =>
      tcrInstances[tcrAddr].on(
        { ...tcrInstances[tcrAddr].filters[eventName](), fromBlock },
        tcrEventToCallback[eventName]({
          tcrInstance: tcrInstances[tcrAddr],
          gtcrView,
          db
        })
      )
    )
  })

  let arbitrators = {}
  try {
    arbitrators = await db.get(ARBITRATORS)
    arbitrators = JSON.parse(arbitrators)
  } catch (err) {
    if (err.type !== 'NotFoundError') throw new Error(err)
  }

  // Iterate through every user subscribed to events for each arbitrator and
  // add event handlers for each one.
  Object.keys(arbitrators).forEach(arbitratorAddr => {
    arbitratorInstances[arbitratorAddr] = new ethers.Contract(
      arbitratorAddr,
      _IArbitrator,
      provider
    )
    Object.keys(arbitratorEventToCallback).forEach(eventName =>
      arbitratorInstances[arbitratorAddr].on(
        {
          ...arbitratorInstances[arbitratorAddr].filters[eventName](),
          fromBlock
        },
        arbitratorEventToCallback[eventName]({
          arbitratorInstance: arbitratorInstances[arbitratorAddr],
          db,
          provider
        })
      )
    )
  })
})()

const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const indexRouter = require('./routes')
const apiRouter = require('./routes/api')(
  db,
  gtcrView,
  provider,
  tcrInstances,
  arbitratorInstances
)

const app = express()
app.use('*', cors())
app.options('*', cors())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use('/', indexRouter)
app.use(
  `${process.env.NETWORK_ID && `/${process.env.NETWORK_ID}`}/api`,
  apiRouter
)

module.exports = app
