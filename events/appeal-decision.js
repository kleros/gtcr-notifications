const ethers = require('ethers')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')

const { ARBITRATORS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { APPEALED }
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

    // Detect if event is related to a GTCR. No op if it isn't.
    const { address: arbitratorAddr } = arbitratorInstance
    const tcrInstance = new ethers.Contract(_arbitrable, _GTCR, provider)
    const itemID = await tcrInstance.arbitratorDisputeIDToItem(
      arbitratorAddr,
      _disputeID
    )

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
            type: APPEALED,
            itemID,
            tcrAddr: ethers.utils.getAddress(_arbitrable),
            subject: SUBJECTS[APPEALED],
            message: MESSAGES[APPEALED]
          },
          db,
          subscriberAddr
        )
      )
  } catch (err) {
    console.error('Error saving appeal notification', err)
  }
}
