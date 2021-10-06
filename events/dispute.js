const ethers = require('ethers')

const { TCRS, LGTCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { REMOVAL_CHALLENGED, SUBMISSION_CHALLENGED },
  ITEM_STATUS: { REGISTRATION_REQUESTED }
} = require('../utils/types')
const { MESSAGES, SUBJECTS } = require('../utils/messages')

const _GTCR = require('../abis/GeneralizedTCR.json')
const _LightGTCR = require('../abis/LightGeneralizedTCR.json')
const _GTCRView = require('../abis/GeneralizedTCRView.json')
const _LightGTCRView = require('../abis/LightGeneralizedTCRView.json')

module.exports = ({ tcrInstance, db, provider, chainId }) => async (
  arbitrator,
  disputeID
) => {
  // Check if event is related to Curate Classic
  let itemID
  let gtcrView
  let dbKey
  try {
    const testInstance = new ethers.Contract(
      tcrInstance.address,
      _GTCR,
      provider
    )
    itemID = await testInstance.arbitratorDisputeIDToItem(
      arbitrator,
      Number(disputeID)
    )

    gtcrView = new ethers.Contract(
      process.env.GTCR_VIEW_ADDRESS,
      _GTCRView,
      provider
    )

    dbKey = TCRS
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Not a Curate Classic contract.
  }

  // Check if event is related to Light Curate
  try {
    if (!itemID) {
      const testInstance = new ethers.Contract(
        tcrInstance.address,
        _LightGTCR,
        provider
      )
      itemID = await testInstance.arbitratorDisputeIDToItemID(
        arbitrator,
        Number(disputeID)
      )
      gtcrView = new ethers.Contract(
        process.env.LIGHT_GTCR_VIEW_ADDRESS,
        _LightGTCRView,
        provider
      )

      dbKey = LGTCRS
    }

    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Unrelated event. No-op.
    return
  }

  if (!itemID) return // Unrelated event. No-op.

  // Find which users are subscribed to this item.
  try {
    const { address: tcrAddr } = tcrInstance
    const item = await gtcrView.getItem(tcrAddr, itemID)
    const { status } = item

    let latestTcrObj = {}
    try {
      latestTcrObj = await db.get(dbKey)
      latestTcrObj = JSON.parse(latestTcrObj)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .forEach(async subscriberAddr => {
        const type =
          status === REGISTRATION_REQUESTED
            ? SUBMISSION_CHALLENGED
            : REMOVAL_CHALLENGED
        addNotification(
          {
            type,
            itemID,
            tcrAddr,
            subject: SUBJECTS[type],
            message: MESSAGES[type],
            chainId
          },
          db,
          subscriberAddr
        )
      })
  } catch (err) {
    console.error('Error saving dispute notification', err)
  }
}
