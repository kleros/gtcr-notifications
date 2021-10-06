const ethers = require('ethers')
const _GTCR = require('../abis/GeneralizedTCR.json')
const _LightGTCR = require('../abis/LightGeneralizedTCR.json')

const { ARBITRATORS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { APPEALABLE_RULING }
} = require('../utils/types')
const { SUBJECTS, MESSAGES } = require('../utils/messages')

module.exports = ({ arbitratorInstance, db }) => async (
  _disputeID,
  _arbitrable
) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.PROVIDER_URL
    )

    const { address: arbitratorAddr } = arbitratorInstance
    // Check if event is related to Curate Classic
    let itemID
    try {
      const tcrInstance = new ethers.Contract(_arbitrable, _GTCR, provider)
      itemID = await tcrInstance.arbitratorDisputeIDToItem(
        arbitratorAddr,
        _disputeID
      )
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Not a GTCR contract.
    }

    // Check if event is related to Light Curate
    try {
      if (!itemID) {
        const tcrInstance = new ethers.Contract(
          _arbitrable,
          _LightGTCR,
          provider
        )
        itemID = await tcrInstance.arbitratorDisputeIDToItemID(
          arbitratorAddr,
          _disputeID
        )
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Unrelated event. No-op.
      return
    }

    if (!itemID) return // Unrelated event. No-op.

    let arbitrators = {}
    try {
      arbitrators = await db.get(ARBITRATORS)
      arbitrators = JSON.parse(arbitrators)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(arbitrators[arbitratorAddr])
      .filter(
        subscriberAddr => arbitrators[arbitratorAddr][subscriberAddr][itemID]
      )
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: APPEALABLE_RULING,
            itemID,
            tcrAddr: ethers.utils.getAddress(_arbitrable),
            subject: SUBJECTS[APPEALABLE_RULING],
            message: MESSAGES[APPEALABLE_RULING]
          },
          db,
          subscriberAddr
        )
      )
  } catch (err) {
    console.error('Error saving appeal possible notification', err)
  }
}
