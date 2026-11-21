import type { BusinessRequest, ReviewReport, PaymentVerification } from '../types.ts';

/** Domain rules intentionally kept pure for testability and later Spring Boot parity. */
export function verifyManualPayment(
  request: BusinessRequest,
  details: Pick<PaymentVerification, 'reference' | 'note'>,
  actor: string,
  now: string,
): BusinessRequest {
  if (request.status !== 'pending') throw new Error('Only Pending requests can receive payment verification.');
  return {
    ...request,
    payment: {
      confirmed: true,
      checkedAt: now,
      verifiedBy: actor,
      reference: details.reference?.trim() || undefined,
      note: details.note?.trim() || undefined,
    },
  };
}

export function revokePaymentVerification(request: BusinessRequest): BusinessRequest {
  if (request.status !== 'pending') throw new Error('Payment verification can only be changed while Pending.');
  return { ...request, payment: { confirmed: false } };
}

export function canApprove(request: BusinessRequest): boolean {
  return request.status === 'pending' && request.payment.confirmed &&
    Boolean(request.payment.checkedAt && request.payment.verifiedBy);
}

export function approveRequest(request: BusinessRequest, actor: string, now: string): BusinessRequest {
  if (!canApprove(request)) {
    throw new Error('Record and confirm manual payment before approving a Pending request.');
  }
  return {
    ...request,
    status: 'approved',
    visibility: 'active',
    declineReason: undefined,
    reviewedAt: now,
    reviewedBy: actor,
    suspensionReason: undefined,
  };
}

export function declineRequest(
  request: BusinessRequest,
  reason: string,
  actor: string,
  now: string,
): BusinessRequest {
  if (request.status !== 'pending') throw new Error('Only Pending requests can be declined.');
  if (reason.trim().length < 10) throw new Error('Enter a meaningful reason (at least 10 characters).');
  return {
    ...request,
    status: 'declined',
    visibility: 'active',
    declineReason: reason.trim(),
    reviewedAt: now,
    reviewedBy: actor,
  };
}

export function suspendBusiness(request: BusinessRequest, reason: string): BusinessRequest {
  if (request.status !== 'approved') throw new Error('Only Approved businesses can be suspended.');
  if (request.visibility === 'suspended') throw new Error('This business is already suspended.');
  if (reason.trim().length < 8) throw new Error('Enter a suspension reason (at least 8 characters).');
  return { ...request, visibility: 'suspended', suspensionReason: reason.trim() };
}

export function restoreBusiness(request: BusinessRequest): BusinessRequest {
  if (request.status !== 'approved' || request.visibility !== 'suspended') {
    throw new Error('Only suspended Approved businesses can be restored.');
  }
  return { ...request, visibility: 'active', suspensionReason: undefined };
}

export function isPublicBusiness(request: BusinessRequest): boolean {
  return request.status === 'approved' && request.visibility === 'active';
}

export function moderateReport(
  report: ReviewReport,
  decision: 'dismissed' | 'removed',
  note: string,
  now: string,
): ReviewReport {
  if (report.status !== 'open') throw new Error('This report is already resolved.');
  if (note.trim().length < 5) throw new Error('Enter a moderation note (at least 5 characters).');
  return { ...report, status: decision, moderatedAt: now, moderatorNote: note.trim() };
}
