const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { REMOVAL_CHALLENGED, SUBMISSION_CHALLENGED },
  ITEM_STATUS: { REGISTRATION_REQUESTED }
} = require('../utils/types')

module.exports = ({ tcrInstance, gtcrView, db, networkID }) => async (
  arbitrator,
  disputeID
) => {
  console.info('Dispute 1')
  // Find which users are subscribed to this item.
  try {
    const itemID = await tcrInstance.arbitratorDisputeIDToItem(
      arbitrator,
      disputeID
    )

    console.info('Dispute 2')
    const { address: tcrAddr } = tcrInstance
    const item = await gtcrView.getItem(tcrAddr, itemID)
    let { requester, challenger, status } = item
    requester = ethers.utils.getAddress(requester) // Convert to checksummed address.
    challenger = ethers.utils.getAddress(challenger) // Convert to checksummed address.

    console.info('Dispute 3')

    const latestTcrObj = JSON.parse(await db.get(TCRS))[networkID]
    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .filter(subscriberAddr => subscriberAddr !== challenger)
      .forEach(async subscriberAddr => {
        console.info('adding dispute notification')
        addNotification(
          {
            type:
              status === REGISTRATION_REQUESTED
                ? SUBMISSION_CHALLENGED
                : REMOVAL_CHALLENGED,
            itemID,
            tcrAddr
          },
          db,
          subscriberAddr,
          networkID
        )
      }
      )
  } catch (err) {
    console.error('Error saving dispute notification', err)
  }
}
