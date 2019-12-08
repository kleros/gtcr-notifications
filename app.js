if (!process.env.PROVIDER_URL)
  throw new Error(
    'No web3 provider set. Please set the PROVIDER_URL environment variable'
  )

if (!process.env.GTCR_VIEW_ADDRESS)
  throw new Error('Missing GTCR View contract address set.')

const level = require('level')
const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const ethers = require('ethers')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const {
  abi: _GTCRView
} = require('@kleros/tcr/build/contracts/GeneralizedTCRView.json')

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL)
const gtcrView = new ethers.Contract(
  process.env.GTCR_VIEW_ADDRESS,
  _GTCRView,
  provider
)

const db = level('./db')
const indexRouter = require('./routes')
const apiRouter = require('./routes/api')(db, gtcrView)
const {
  TCRS,
  INITIALIZED,
  SUBSCRIBERS,
  ARBITRATORS
} = require('./utils/db-keys')
const {
  NOTIFICATION_TYPES: { REMOVAL_CHALLENGED, SUBMISSION_CHALLENGED },
  ITEM_STATUS: { REGISTRATION_REQUESTED }
} = require('./utils/types')

const app = express()
app.use(cors())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use('/', indexRouter)
app.use('/api', apiRouter)
;(async () => {
  // Initialize stores if needed.
  try {
    console.info('Db initialized:', await db.get(INITIALIZED))
  } catch (err) {
    if (err.type === 'NotFoundError') {
      console.info('Initializing DB')
      await db.put(INITIALIZED, true)
      await db.put(TCRS, JSON.stringify({}))
      await db.put(ARBITRATORS, JSON.stringify({}))
      await db.put(SUBSCRIBERS, JSON.stringify({}))
    }
    throw new Error(err)
  }

  // Setup listeners for each TCR being watched.
  const tcrs = JSON.parse(await db.get(TCRS))
  const fromBlock = await provider.getBlock()
  Object.keys(tcrs).forEach(tcrAddr => {
    const tcrInstance = new ethers.Contract(tcrAddr, _GTCR, provider)

    // Iterate through every user subscribed to events for this TCR and handle
    // each event.
    tcrInstance.on(
      { ...tcrInstance.filters.Dispute(), fromBlock },
      async (arbitrator, disputeID) => {
        // Find which users are subscribed to this item.
        const itemID = await tcrInstance.arbitratorDisputeIDToItem(
          arbitrator,
          disputeID
        )

        const item = await gtcrView.getItem(tcrAddr, itemID)
        const { requester, challenger, status } = item

        Object.keys(tcrs[tcrAddr])
          .filter(subscriberAddr => tcrs[tcrAddr][subscriberAddr][itemID])
          .filter(subscriberAddr => subscriberAddr !== challenger)
          .map(async subscriberAddr => {
            const subscriberNotifications = await db.get(subscriberAddr)
            subscriberNotifications.unread = true
            subscriberNotifications.notifications.push({
              type:
                status === REGISTRATION_REQUESTED
                  ? SUBMISSION_CHALLENGED
                  : REMOVAL_CHALLENGED,
              itemID,
              tcrAddr: tcrAddr,
              arbitrator,
              requester,
              challenger,
              clicked: false
            })
          })
      }
    )
  })
})()

module.exports = app
