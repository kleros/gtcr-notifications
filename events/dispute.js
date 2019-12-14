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
  // Find which users are subscribed to this item.
  const itemID = await tcrInstance.arbitratorDisputeIDToItem(
    arbitrator,
    disputeID
  )

  const { address: tcrAddr } = tcrInstance
  const item = await gtcrView.getItem(tcrAddr, itemID)
  let { requester, challenger, status } = item
  requester = ethers.utils.getAddress(requester) // Convert to checksummed address.
  challenger = ethers.utils.getAddress(challenger) // Convert to checksummed address.

  const latestTcrObj = JSON.parse(await db.get(TCRS))[networkID]
  Object.keys(latestTcrObj[tcrAddr])
    .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
    .filter(subscriberAddr => subscriberAddr !== challenger)
    .forEach(async subscriberAddr =>
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
        subscriberAddr
      )
    )
}
