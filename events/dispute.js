const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const uuidv4 = require('../utils/uuid')
const {
    NOTIFICATION_TYPES: { REMOVAL_CHALLENGED, SUBMISSION_CHALLENGED },
    ITEM_STATUS: { REGISTRATION_REQUESTED }
  } = require('../utils/types')

module.exports = ({ tcrInstance, gtcrView, db, networkID }) => async (arbitrator, disputeID) => {
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
      .filter(
        subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID]
      )
      .filter(subscriberAddr => subscriberAddr !== challenger)
      .map(async subscriberAddr => {
        let subscriberNotifications = {}
        try {
          subscriberNotifications = JSON.parse(
            await db.get(subscriberAddr)
          )
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
          tcrAddr,
          clicked: false,
          notificationID: uuidv4().slice(0, 6) // Slice because we don't need so much entropy.
        })

        await db.put(
          subscriberAddr,
          JSON.stringify(subscriberNotifications)
        )
      })
  }