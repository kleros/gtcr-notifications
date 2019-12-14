if (!process.env.PROVIDER_URL)
  throw new Error(
    'No web3 provider set. Please set the PROVIDER_URL environment variable'
  )

if (!process.env.GTCR_VIEW_ADDRESS)
  throw new Error('Missing GTCR View contract address set.')

const level = require('level')
const ethers = require('ethers')

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL)
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

  const {
    TCRS,
    INITIALIZED,
    SUBSCRIBERS,
    ARBITRATORS
  } = require('./utils/db-keys')

  // Initialize stores if needed.
  try {
    await db.get(INITIALIZED)
  } catch (err) {
    if (err.type === 'NotFoundError') {
      console.info('Initializing DB')
      await db.put(INITIALIZED, true)
      await db.put(TCRS, JSON.stringify({}))
      await db.put(ARBITRATORS, JSON.stringify({}))
      await db.put(SUBSCRIBERS, JSON.stringify({}))
    } else throw new Error(err)
  }
  // Setup listeners for each TCR being watched.
  provider.removeAllListeners()
  const [fromBlock, networkInfo] = await Promise.all([
    provider.getBlock(),
    provider.getNetwork()
  ])
  const { chainId: networkID } = networkInfo
  const tcrs = JSON.parse(await db.get(TCRS))[networkID]
    ? JSON.parse(await db.get(TCRS))[networkID]
    : {}

  // Iterate through every user subscribed to events for this TCR and handle
  // each event.
  Object.keys(tcrs).forEach(tcrAddr => {
    tcrInstances[tcrAddr] = new ethers.Contract(tcrAddr, _GTCR, provider)
    Object.keys(tcrEventToCallback).forEach(eventName =>
      tcrInstances[tcrAddr].on(
        { ...tcrInstances[tcrAddr].filters[eventName](), fromBlock },
        tcrEventToCallback[eventName]({
          tcrInstance: tcrInstances[tcrAddr],
          gtcrView,
          db,
          networkID
        })
      )
    )
  })

  const arbitrators = JSON.parse(await db.get(ARBITRATORS))[networkID]
    ? JSON.parse(await db.get(TCRS))[networkID]
    : {}
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
          networkID
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
app.use(cors())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use('/', indexRouter)
app.use('/api', apiRouter)

module.exports = app
