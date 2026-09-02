import test from 'node:test'
import assert from 'node:assert/strict'
import { isFeePaid, isStepDone, getProgressWidth, getStepState } from './dashboardProgress.mjs'

test('marks the fee step as done when the evaluation fee is completed', () => {
  const app = { status: 'submitted', fee_status: 'completed' }

  assert.equal(isFeePaid(app), true)
  assert.equal(isStepDone(app, 'fee'), true)
  assert.equal(getStepState(app, 'fee'), 'done')
})

test('marks the review step as done once the application is under review', () => {
  const app = { status: 'under_review', fee_status: 'completed' }

  assert.equal(isStepDone(app, 'review'), true)
  assert.equal(getProgressWidth(app), '66.66%')
  assert.equal(getStepState(app, 'review'), 'active')
})

test('keeps the progress at 66.66% after approval', () => {
  const app = { status: 'approved', fee_status: 'completed' }

  assert.equal(getProgressWidth(app), '66.66%')
  assert.equal(getStepState(app, 'review'), 'done')
  assert.equal(getStepState(app, 'disburse'), 'active')
})

