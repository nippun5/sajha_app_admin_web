import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveRequest, canApprove, declineRequest, isPublicBusiness,
  moderateReport, restoreBusiness, revokePaymentVerification,
  suspendBusiness, verifyManualPayment,
} from '../src/lib/workflow.ts';

const now = '2026-11-20T12:00:00.000Z';
const sample = () => ({
  id: 'demo-BR-1001', businessName: 'Example Cafe', status: 'pending', visibility: 'active',
  payment: { confirmed: false }, revision: 1, submittedAt: now, lastSubmittedAt: now,
});

test('cannot approve without verified manual payment', () => {
  assert.equal(canApprove(sample()), false);
  assert.throws(() => approveRequest(sample(), 'Demo Admin', now), /payment/i);
});

test('verifying manual payment enables approval without processing any charge', () => {
  const verified = verifyManualPayment(sample(), { reference: 'MOCK-123', note: 'Verified separately' }, 'Demo Admin', now);
  assert.equal(verified.payment.confirmed, true);
  assert.equal(verified.payment.verifiedBy, 'Demo Admin');
  assert.equal(canApprove(verified), true);
  const approved = approveRequest(verified, 'Demo Admin', now);
  assert.equal(approved.status, 'approved');
  assert.equal(approved.visibility, 'active');
  assert.equal(isPublicBusiness(approved), true);
});

test('payment record may be cleared before approval only', () => {
  const verified = verifyManualPayment(sample(), {}, 'Demo Admin', now);
  const cleared = revokePaymentVerification(verified);
  assert.equal(canApprove(cleared), false);
  assert.throws(() => revokePaymentVerification(approveRequest(verified, 'Demo Admin', now)), /Pending/i);
});

test('decline requires reason and does not publish', () => {
  assert.throws(() => declineRequest(sample(), 'no', 'Demo Admin', now), /10 characters/i);
  const declined = declineRequest(sample(), 'Please provide proof of ownership.', 'Demo Admin', now);
  assert.equal(declined.status, 'declined');
  assert.equal(declined.declineReason, 'Please provide proof of ownership.');
  assert.equal(isPublicBusiness(declined), false);
  assert.throws(() => approveRequest(declined, 'Demo Admin', now), /payment/i);
});

test('suspension is separate from approval state', () => {
  const verified = verifyManualPayment(sample(), {}, 'Demo Admin', now);
  const approved = approveRequest(verified, 'Demo Admin', now);
  const suspended = suspendBusiness(approved, 'Owner contact verification pending');
  assert.equal(suspended.status, 'approved');
  assert.equal(suspended.visibility, 'suspended');
  assert.equal(isPublicBusiness(suspended), false);
  const restored = restoreBusiness(suspended);
  assert.equal(isPublicBusiness(restored), true);
  assert.throws(() => suspendBusiness(sample(), 'Not approved yet'), /Approved/i);
});

test('review moderation requires a note and cannot resolve twice', () => {
  const report = { id: 'demo-RP-1', status: 'open', reviewId: 'review-1', reason: 'Spam' };
  assert.throws(() => moderateReport(report, 'removed', 'bad', now), /5 characters/i);
  const moderated = moderateReport(report, 'removed', 'Spam confirmed', now);
  assert.equal(moderated.status, 'removed');
  assert.equal(moderated.moderatorNote, 'Spam confirmed');
  assert.throws(() => moderateReport(moderated, 'dismissed', 'Different outcome', now), /resolved/i);
});
