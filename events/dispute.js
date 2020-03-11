const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { REMOVAL_CHALLENGED, SUBMISSION_CHALLENGED },
  ITEM_STATUS: { REGISTRATION_REQUESTED }
} = require('../utils/types')
const { MESSAGES, SUBJECTS } = require('../utils/messages')

module.exports = ({ tcrInstance, gtcrView, db }) => async (
  arbitrator,
  disputeID
) => {
  // Find which users are subscribed to this item.
  try {
    const itemID = await tcrInstance.arbitratorDisputeIDToItem(
      arbitrator,
      disputeID
    )

    const { address: tcrAddr } = tcrInstance
    const item = await gtcrView.getItem(tcrAddr, itemID)
    let { challenger, status } = item
    challenger = ethers.utils.getAddress(challenger) // Convert to checksummed address.

    let latestTcrObj = {}
    try {
      latestTcrObj = await db.get(TCRS)
      latestTcrObj = JSON.parse(latestTcrObj)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .filter(subscriberAddr => subscriberAddr !== challenger)
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
            message: MESSAGES[type]
          },
          db,
          subscriberAddr
        )
      })
  } catch (err) {
    console.error('Error saving dispute notification', err)
  }
}
