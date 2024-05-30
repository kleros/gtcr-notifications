const ethers = require('ethers')
const fetch = require('node-fetch')
const delay = require('delay')

const { TCRS, LGTCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { EVIDENCE_SUBMITTED }
} = require('../utils/types')
const { SUBJECTS, MESSAGES } = require('../utils/messages')

module.exports = ({ tcrInstance, db, chainId }) => async (
  _,
  evidenceGroupID
) => {
  // Wait a bit to ensure subgraph is synced.
  await delay(20 * 1000)

  let itemID
  const subgraphQuery = {
    query: `
      {
        lrequests (where: { evidenceGroupID: "${evidenceGroupID}"}) {
          item {
            itemID
          }
        }
      }
    `
  }
  const response = await fetch(process.env.GTCR_SUBGRAPH_URL, {
    method: 'POST',
    body: JSON.stringify(subgraphQuery),
    headers: {
      'Content-Type': 'application/json',
    }
  })
  const parsedValues = await response.json()

  let dbKey
  if (parsedValues.data.lrequests.length > 0) {
    dbKey = LGTCRS
    itemID = parsedValues.data.lrequests[0].item.itemID
  }

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_URL
  )

  if (!itemID) {
    // i.e. it is a curate classic instance.
    dbKey = TCRS
    const log = (
      await provider.getLogs({
        ...tcrInstance.filters.RequestEvidenceGroupID(
          null,
          null,
          evidenceGroupID
        ),
        fromBlock: 0
      })
    ).map(log => tcrInstance.interface.parseLog(log))[0]

    const { _itemID } = log || {}
    itemID = _itemID

    if (!itemID)
      throw new Error(
        `Could not find itemID for evidenceGroupID ${String(
          evidenceGroupID
        )}, tcr ${tcrInstance.address}`
      )
  }

  try {
    const { address: tcrAddr } = tcrInstance

    let latestTcrObj = {}
    try {
      latestTcrObj = await db.get(dbKey)
      latestTcrObj = JSON.parse(latestTcrObj)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: EVIDENCE_SUBMITTED,
            itemID,
            tcrAddr,
            subject: SUBJECTS[EVIDENCE_SUBMITTED],
            message: MESSAGES[EVIDENCE_SUBMITTED],
            chainId
          },
          db,
          subscriberAddr
        )
      )
  } catch (err) {
    console.error('Error saving evidence notification', err)
  }
}
