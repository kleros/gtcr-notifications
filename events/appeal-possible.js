const ethers = require('ethers')
const { ARBITRATORS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { APPEALABLE_RULING }
} = require('../utils/types')

module.exports = ({ arbitratorInstance, db, networkID }) => async (
  _disputeID,
  _arbitrable
) => {
  const { address: arbitratorAddr } = arbitratorInstance

  // Detect if event is related to a GTCR. No op if it isn't.
  let itemID
  try {
    const tcrInstance = new ethers.Contract(_arbitrable, _GTCR, provider)
    itemID = tcrInstance.arbitratorDisputeIDToItem(arbitratorAddr, _disputeID)
  } catch (err) {
    return
  }

  if (!itemID) return

  const arbitrators = JSON.parse(await db.get(ARBITRATORS))[networkID]
  Object.keys(arbitrators[arbitratorAddr])
    .filter(
      subscriberAddr => arbitrators[arbitratorAddr][subscriberAddr][itemID]
    )
    .filter(subscriberAddr => subscriberAddr !== submitter)
    .forEach(async subscriberAddr =>
      addNotification(
        {
          type: APPEALABLE_RULING,
          itemID,
          tcrAddr: _arbitrable
        },
        db,
        subscriberAddr
      )
    )
}
