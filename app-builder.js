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
const lightResolvedCallback = require('./events/light-resolved')
const appealableRulingCallback = require('./events/appeal-possible')
const appealCallback = require('./events/appeal-decision')
const paidFeesCallback = require('./events/paid-fees')

const _GTCRView = require('./abis/GeneralizedTCRView.json')
const _GTCR = require('./abis/GeneralizedTCR.json')
const _LightGTCRView = require('./abis/LightGeneralizedTCRView.json')
const _LightGTCR = require('./abis/LightGeneralizedTCR.json')

const _IArbitrator = require('./abis/IArbitrator.json')

module.exports = async function buildApp() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_URL
  )
  provider.pollingInterval = 60 * 1000

  const { chainId } = await provider.getNetwork()

  const DB_KEY = `./db-${chainId}`
  if (!fs.existsSync(DB_KEY)) fs.mkdirSync(DB_KEY)

  const db = level(DB_KEY)

  const tcrEventToCallback = {
    Evidence: evidenceCallback,
    Dispute: disputeCallback,
    ItemStatusChange: resolvedCallback,
    HasPaidAppealFee: paidFeesCallback
  }
  const lightTcrEventToCallback = {
    Evidence: evidenceCallback,
    Dispute: disputeCallback,
    ItemStatusChange: lightResolvedCallback
  }
  const arbitratorEventToCallback = {
    AppealPossible: appealableRulingCallback,
    AppealDecision: appealCallback
  }

  const { TCRS, LGTCRS, ARBITRATORS } = require('./utils/db-keys')

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
  const tcrInstances = {}
  const gtcrView = new ethers.Contract(
    process.env.GTCR_VIEW_ADDRESS,
    _GTCRView,
    provider
  )
  Object.keys(tcrs).forEach(tcrAddr => {
    tcrInstances[tcrAddr] = new ethers.Contract(tcrAddr, _GTCR, provider)
    Object.keys(tcrEventToCallback).forEach(eventName =>
      tcrInstances[tcrAddr].on(
        { ...tcrInstances[tcrAddr].filters[eventName](), fromBlock },
        tcrEventToCallback[eventName]({
          tcrInstance: tcrInstances[tcrAddr],
          gtcrView,
          db,
          provider,
          chainId
        })
      )
    )
  })

  let ltcrs = {}
  try {
    ltcrs = JSON.parse(await db.get(LGTCRS))
  } catch (err) {
    if (err.type !== 'NotFoundError') throw new Error(err)
  }

  // Iterate through every user subscribed to events for each tcr and
  // add event handlers for each one.
  const lightTcrInstances = {}
  const lightGtcrView = new ethers.Contract(
    process.env.LIGHT_GTCR_VIEW_ADDRESS,
    _LightGTCRView,
    provider
  )
  Object.keys(ltcrs).forEach(tcrAddr => {
    lightTcrInstances[tcrAddr] = new ethers.Contract(
      tcrAddr,
      _LightGTCR,
      provider
    )
    Object.keys(lightTcrEventToCallback).forEach(eventName =>
      lightTcrInstances[tcrAddr].on(
        { ...lightTcrInstances[tcrAddr].filters[eventName](), fromBlock },
        lightTcrEventToCallback[eventName]({
          tcrInstance: lightTcrInstances[tcrAddr],
          gtcrView: lightGtcrView,
          db,
          provider,
          chainId
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
  const arbitratorInstances = {}
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
          provider,
          chainId
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
    apiRouterBuilder(
      db,
      gtcrView,
      provider,
      tcrInstances,
      arbitratorInstances,
      lightTcrInstances,
      lightGtcrView,
      chainId
    )
  )

  return app
}
