if (!process.env.PROVIDER_URL)
  throw new Error(
    'No web3 provider set. Please set the PROVIDER_URL environment variable'
  )

if (!process.env.GTCR_VIEW_ADDRESS)
  throw new Error('Missing GTCR View contract address set.')

const level = require('level')
const uuidv4 = require('./utils/uuid')
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

// Restart bot every 3 minutes to update listeners list.
const UPDATE_INTERVAL = 40 * 1000
setInterval(async () => {
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
  const networkID = networkInfo.chainId
  const tcrs = JSON.parse(await db.get(TCRS))[networkID]
    ? JSON.parse(await db.get(TCRS))[networkID]
    : {}
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
        let { requester, challenger, status } = item
        requester = ethers.utils.getAddress(requester) // Convert to checksummed address.
        challenger = ethers.utils.getAddress(challenger) // Convert to checksummed address.

        Object.keys(tcrs[tcrAddr])
          .filter(subscriberAddr => tcrs[tcrAddr][subscriberAddr][itemID])
          .filter(subscriberAddr => subscriberAddr !== challenger)
          .map(async subscriberAddr => {
            let subscriberNotifications = {}
            try {
              subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
            } catch (err) {
              if (!err.type === 'NotFoundError') throw new Error(err)
            }
            if (!subscriberNotifications[networkID])
              subscriberNotifications[networkID] = {
                unread: false,
                notifications: []
              }

            subscriberNotifications[networkID].unread = true
            subscriberNotifications[networkID].notifications.push({
              type:
                status === REGISTRATION_REQUESTED
                  ? SUBMISSION_CHALLENGED
                  : REMOVAL_CHALLENGED,
              itemID,
              tcrAddr: tcrAddr,
              arbitrator,
              requester,
              challenger,
              clicked: false,
              notificationID: uuidv4().slice(0, 6) // Slice because we don't need so much entropy.
            })

            await db.put(
              subscriberAddr,
              JSON.stringify(subscriberNotifications)
            )
          })
      }
    )
  })
}, UPDATE_INTERVAL)

module.exports = app
