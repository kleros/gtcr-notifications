const ethers = require('ethers')
const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { EVIDENCE_SUBMITTED }
} = require('../utils/types')
const { SUBJECTS, MESSAGES } = require('../utils/messages')

module.exports = ({ tcrInstance, db }) => async (
  _,
  evidenceGroupID,
  submitter
) => {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_URL
  )
  try {
    const { _itemID: itemID } = (
      await provider.getLogs({
        ...tcrInstance.filters.RequestEvidenceGroupID(
          null,
          null,
          evidenceGroupID
        ),
        fromBlock: 0
      })
    ).map(log => tcrInstance.interface.parseLog(log))[0].values

    const { address: tcrAddr } = tcrInstance
    submitter = ethers.utils.getAddress(submitter)

    let latestTcrObj = {}
    try {
      latestTcrObj = await db.get(TCRS)
      latestTcrObj = JSON.parse(latestTcrObj)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .filter(subscriberAddr => subscriberAddr !== submitter)
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: EVIDENCE_SUBMITTED,
            itemID,
            tcrAddr,
            subject: SUBJECTS[EVIDENCE_SUBMITTED],
            message: MESSAGES[EVIDENCE_SUBMITTED]
          },
          db,
          subscriberAddr
        )
      )
  } catch (err) {
    console.error('Error saving evidence notification', err)
  }
}
