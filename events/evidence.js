const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const uuidv4 = require('../utils/uuid')
const { NOTIFICATION_TYPES: { EVIDENCE_SUBMITTED } } = require('../utils/types')

module.exports = ({ tcrInstance, db, networkID }) => async (_arbitrator, evidenceGroupID, submitter) => {
  const { itemID } = await tcrInstance.evidenceGroupIDToRequestID(evidenceGroupID)
  const { address: tcrAddr } = tcrInstance
  submitter = ethers.utils.getAddress(submitter)
  
  const latestTcrObj = JSON.parse(await db.get(TCRS))[networkID]
  Object.keys(latestTcrObj[tcrAddr])
    .filter(
      subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID]      
    )
    .filter(subscriberAddr => subscriberAddr !== submitter)
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
        type: EVIDENCE_SUBMITTED,
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