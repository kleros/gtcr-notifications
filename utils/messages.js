const {
  NOTIFICATION_TYPES: {
    SUBMISSION_PENDING,
    REMOVAL_PENDING,
    SUBMISSION_ACCEPTED,
    REMOVAL_ACCEPTED,
    SUBMISSION_CHALLENGED,
    REMOVAL_CHALLENGED,
    EVIDENCE_SUBMITTED,
    APPEALED,
    APPEALABLE_RULING,
    FINAL_RULING
  }
} = require('./types')

module.exports = {
  SUBJECTS: {
    [SUBMISSION_PENDING]: 'Submission pending execution.',
    [REMOVAL_PENDING]: 'Removal pending execution.',
    [SUBMISSION_ACCEPTED]: 'Submission accepted.',
    [REMOVAL_ACCEPTED]: 'Removal accepted.',
    [SUBMISSION_CHALLENGED]: 'Submission challenged.',
    [REMOVAL_CHALLENGED]: 'Removal challenged.',
    [EVIDENCE_SUBMITTED]: 'Evidence submitted.',
    [APPEALED]: 'Ruling appealed.',
    [APPEALABLE_RULING]: 'Appealable ruling given.',
    [FINAL_RULING]: 'Ruling enforced.'
  },
  MESSAGES: {
    [SUBMISSION_PENDING]: '{{nickname}}, a submission you participated in is pending execution. Click below to view its status and execute it to transfer deposits out of the contract.',
    [REMOVAL_PENDING]: '{{nickname}}, a removal you participated in pending execution. Click below to view its status.',
    [SUBMISSION_ACCEPTED]: '{{nickname}}, a submission you participated in was accepted into the registry. Deposits were transferred out of the contract but there may be rewards pending withdrawal for appeal fee contributors.',
    [REMOVAL_ACCEPTED]: '{{nickname}}, a removal you participated in was executed and the item was removed from the registry. Deposits were transferred out of the contract but there may be rewards pending withdrawal for appeal fee contributors.',
    [SUBMISSION_CHALLENGED]: `Hi {{nickname}}, someone challenged a submission you are subscribed to. Click below to view the justification evidence provided by the challenger.`,
    [REMOVAL_CHALLENGED]: `Hi {{nickname}}, someone challenged a submission you are subscribed to. Click below to view the justification evidence provided by the challenger.`,
    [EVIDENCE_SUBMITTED]: `Hi {{nickname}}, new evidence was submitted in a case you are subscribed to. Click below to view it.`,
    [APPEALABLE_RULING]: `Hi {{nickname}}, the arbitrator gave an appealable ruling. Click below to view it and request an appeal if you think it is incorrect.`,
    [APPEALED]: `Hi {{nickname}}, the ruling given by the arbitrator has been appealed. Click below view the item status and follow updates.`,
    [FINAL_RULING]: `Hi {{nickname}}, the ruling given by the arbitrator has been enforced. Deposits left the contract but appeal fee contribution rewards may be available for withdrawal. Click below to view the item.`
  }
}
