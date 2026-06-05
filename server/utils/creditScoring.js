const calculateCreditScore = (applicationData) => {
  const { employment_status, stable_income, previous_repayment, loan_amount } = applicationData

  let score = 0
  const breakdown = {}

  if (employment_status === 'employed') {
    breakdown.employment = 30
  } else if (employment_status === 'self-employed') {
    breakdown.employment = 20
  } else if (employment_status === 'unemployed') {
    breakdown.employment = 0
  } else {
    breakdown.employment = 10
  }
  score += breakdown.employment

  if (stable_income === true) {
    breakdown.stable_income = 25
  } else {
    breakdown.stable_income = 0
  }
  score += breakdown.stable_income

  if (previous_repayment === true) {
    breakdown.previous_repayment = 25
  } else {
    breakdown.previous_repayment = 0
  }
  score += breakdown.previous_repayment

  const amount = parseFloat(loan_amount)
  if (amount <= 50000) {
    breakdown.loan_amount = 20
  } else if (amount <= 150000) {
    breakdown.loan_amount = 15
  } else if (amount <= 500000) {
    breakdown.loan_amount = 10
  } else {
    breakdown.loan_amount = 5
  }
  score += breakdown.loan_amount

  let risk_level
  if (score >= 80) {
    risk_level = 'low'
  } else if (score >= 50) {
    risk_level = 'medium'
  } else {
    risk_level = 'high'
  }

  return { score, breakdown, risk_level }
}

module.exports = calculateCreditScore