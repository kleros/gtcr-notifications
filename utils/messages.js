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
    FINAL_RULING,
    HAS_PAID_FEES
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
    [FINAL_RULING]: 'Ruling enforced.',
    [HAS_PAID_FEES]: 'Party Fully Funded'
  },
  MESSAGES: {
    [SUBMISSION_PENDING]:
      'A submission you participated in is pending execution. Click below to view its status and execute it to transfer deposits out of the contract.',
    [REMOVAL_PENDING]:
      'A removal you participated in pending execution. Click below to view its status.',
    [SUBMISSION_ACCEPTED]:
      'A submission you participated in was accepted into the registry. Deposits were transferred out of the contract but there may be rewards pending withdrawal for appeal fee contributors.',
    [REMOVAL_ACCEPTED]:
      'A removal you participated in was executed and the item was removed from the registry. Deposits were transferred out of the contract but there may be rewards pending withdrawal for appeal fee contributors.',
    [SUBMISSION_CHALLENGED]: `Someone challenged a submission you are subscribed to. Click below to view the justification evidence provided by the challenger.`,
    [REMOVAL_CHALLENGED]: `Someone challenged a submission you are subscribed to. Click below to view the justification evidence provided by the challenger.`,
    [EVIDENCE_SUBMITTED]: `New evidence was submitted in a case you are subscribed to. Click below to view it.`,
    [APPEALABLE_RULING]: `The arbitrator gave an appealable ruling. Click below to view it and request an appeal if you think it is incorrect.`,
    [APPEALED]: `The ruling given by the arbitrator has been appealed. Click below view the item status and follow updates.`,
    [FINAL_RULING]: `The ruling given by the arbitrator has been enforced. Deposits left the contract but appeal fee contribution rewards may be available for withdrawal. Click below to view the item.`
  }
}
