const ethers = require('ethers')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')

const { ARBITRATORS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { APPEALABLE_RULING }
} = require('../utils/types')

module.exports = ({ arbitratorInstance, db, networkID, provider }) => async (
  _disputeID,
  _arbitrable
) => {
  try {
    // Detect if event is related to a GTCR. No op if it isn't.
    const { address: arbitratorAddr } = arbitratorInstance
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
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: APPEALABLE_RULING,
            itemID,
            tcrAddr: ethers.utils.getAddress(_arbitrable)
          },
          db,
          subscriberAddr,
          networkID
        )
      )
  } catch (err) {
    console.error('Error saving appeal possible notification', err)
    return
  }
}
