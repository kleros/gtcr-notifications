const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { EVIDENCE_SUBMITTED }
} = require('../utils/types')

module.exports = ({ tcrInstance, db, networkID }) => async (
  _arbitrator,
  evidenceGroupID,
  submitter
) => {
  try {
    const { itemID } = await tcrInstance.evidenceGroupIDToRequestID(
      evidenceGroupID
    )
    const { address: tcrAddr } = tcrInstance
    submitter = ethers.utils.getAddress(submitter)

    const latestTcrObj = JSON.parse(await db.get(TCRS))[networkID]
    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .filter(subscriberAddr => subscriberAddr !== submitter)
      .forEach(async subscriberAddr => addNotification(
          {
            type: EVIDENCE_SUBMITTED,
            itemID,
            tcrAddr
          },
          db,
          subscriberAddr,
          networkID
        )      
      )
  } catch (err) {
    console.error('Error saving evidence notification', err)
  }

}
