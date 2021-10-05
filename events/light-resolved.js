const fetch = require('node-fetch')
const ethers = require('ethers')

const { LGTCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { SUBMISSION_ACCEPTED, REMOVAL_ACCEPTED, FINAL_RULING },
  ITEM_STATUS: { REGISTERED }
} = require('../utils/types')
const { SUBJECTS, MESSAGES } = require('../utils/messages')

const _LightGTCRView = require('../abis/LightGeneralizedTCRView.json')

module.exports = ({
  tcrInstance: { address: tcrAddr },
  db
}) => async itemID => {
  console.info('resolved')
  try {
    const subgraphQuery = {
      query: `
        {
          litems (where: { itemID: "${itemID}"}) {
            requests (first: 1, orderBy: submissionTime, orderDirection: desc) {
              resolved
              disputed
            }
          }
        }
      `
    }
    const response = await fetch(process.env.GTCR_SUBGRAPH_URL, {
      method: 'POST',
      body: JSON.stringify(subgraphQuery)
    })
    const parsedValues = await response.json()
    const { resolved, disputed } = parsedValues.data.litems[0].requests[0]

    // Ignore status change events of unresolved requests.
    if (!resolved) return

    const provider = new ethers.providers.JsonRpcProvider(
      process.env.PROVIDER_URL
    )
    const gtcrView = new ethers.Contract(
      process.env.LIGHT_GTCR_VIEW_ADDRESS,
      _LightGTCRView,
      provider
    )
    const { status } = await gtcrView.getItem(tcrAddr, itemID)

    let latestTcrObj = {}
    try {
      latestTcrObj = JSON.parse(await db.get(LGTCRS))
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .forEach(async subscriberAddr => {
        const type = disputed
          ? FINAL_RULING
          : status === REGISTERED
          ? SUBMISSION_ACCEPTED
          : REMOVAL_ACCEPTED
        addNotification(
          {
            type,
            itemID: itemID,
            tcrAddr,
            subject: SUBJECTS[type],
            message: MESSAGES[type]
          },
          db,
          subscriberAddr
        )
      })
  } catch (err) {
    console.error('Error saving resolved notification', err)
  }
}
