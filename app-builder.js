const level = require('level')
const ethers = require('ethers')
const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')

const indexRouterBuilder = require('./routes')
const apiRouterBuilder = require('./routes/api')
const disputeCallback = require('./events/dispute')
const evidenceCallback = require('./events/evidence')
const resolvedCallback = require('./events/resolved')
const appealableRulingCallback = require('./events/appeal-possible')
const appealCallback = require('./events/appeal-decision')
const paidFeesCallback = require('./events/paid-fees')
const {
  abi: _GTCRView
} = require('@kleros/tcr/build/contracts/GeneralizedTCRView.json')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const {
  abi: _IArbitrator
} = require('@kleros/tcr/build/contracts/IArbitrator.json')

module.exports = async function buildApp() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_URL
  )
  provider.pollingInterval = 60 * 1000

  const gtcrView = new ethers.Contract(
    process.env.GTCR_VIEW_ADDRESS,
    _GTCRView,
    provider
  )

  const { chainId } = await provider.getNetwork()

  const DB_KEY = `./db-${chainId}`
  if (!fs.existsSync(DB_KEY)) fs.mkdirSync(DB_KEY)

  const db = level(DB_KEY)
  const tcrInstances = {}
  const arbitratorInstances = {}

  const tcrEventToCallback = {
    Evidence: evidenceCallback,
    Dispute: disputeCallback,
    ItemStatusChange: resolvedCallback,
    HasPaidAppealFee: paidFeesCallback
  }
  const arbitratorEventToCallback = {
    AppealPossible: appealableRulingCallback,
    AppealDecision: appealCallback
  }

  const { TCRS, ARBITRATORS } = require('./utils/db-keys')

  // Setup listeners for each TCR being watched.
  let fromBlock
  try {
    fromBlock = await provider.getBlock()
  } catch (err) {
    console.error('Error fetching block.')
    throw err
  }
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
          db,
          provider
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

  const app = express()
  app.use('*', cors())
  app.options('*', cors())
  app.use(logger('dev'))
  app.use(bodyParser.json())
  app.use('/', indexRouterBuilder(provider))
  app.use(
    `${process.env.NETWORK_ID && `/${process.env.NETWORK_ID}`}/api`,
    apiRouterBuilder(db, gtcrView, provider, tcrInstances, arbitratorInstances)
  )

  return app
}
