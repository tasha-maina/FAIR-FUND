export const isFeePaid = (app) =>
  app?.fee_status === 'completed' ||
  ['under_review', 'approved', 'disbursed', 'repaid'].includes(app?.status)

export const isStepDone = (app, step) => {
  if (!app) return false
  if (step === 'fee') return isFeePaid(app)
  if (step === 'review') {
    return ['under_review', 'approved', 'disbursed', 'repaid'].includes(app?.status)
  }
  if (step === 'disburse') {
    return ['disbursed', 'repaid'].includes(app?.status)
  }
  return false
}

export const getProgressWidth = (app) => {
  if (!app) return '0%'
  if (['disbursed', 'repaid'].includes(app.status)) return '100%'
  if (['approved'].includes(app.status)) return '66.66%'
  if (['under_review'].includes(app.status)) return '66.66%'
  if (isFeePaid(app)) return '33.33%'
  return '0%'
}
