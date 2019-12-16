const ethers = require('ethers')
const { ARBITRATORS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { APPEALED }
} = require('../utils/types')

module.exports = ({ arbitratorInstance, db, networkID }) => async (
  _disputeID,
  _arbitrable
) => {
  const { address: arbitratorAddr } = arbitratorInstance

  // Detect if event is related to a GTCR. No op if it isn't.
  try {
    const tcrInstance = new ethers.Contract(_arbitrable, _GTCR, provider)
    const itemID = await tcrInstance.arbitratorDisputeIDToItem(
      arbitratorAddr,
      _disputeID
    )

    const arbitrators = JSON.parse(await db.get(ARBITRATORS))[networkID]
    Object.keys(arbitrators[arbitratorAddr])
      .filter(
        subscriberAddr => arbitrators[arbitratorAddr][subscriberAddr][itemID]
      )
      .filter(subscriberAddr => subscriberAddr !== submitter)
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: APPEALED,
            itemID,
            tcrAddr: ethers.utils.getAddress(_arbitrable)
          },
          db,
          subscriberAddr,
          networkID
        )
      )
  } catch (err) {
    console.error('Error saving appeal notification', err)
    return
  }

}
