import type { AdminDatabase, BusinessRequest, ReviewReport } from '../types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hours = (text = '09:00 – 17:00') => Object.fromEntries(days.map(d => [d, d === 'Sunday' ? 'Closed' : text]));
const ago = (daysBack: number) => new Date(Date.now() - daysBack * 86400000).toISOString();
const today = () => new Date().toISOString();

const base = (
  id: string, name: string, category: string, status: BusinessRequest['status'], daysBack: number,
): BusinessRequest => ({
  id, ownerId: `demo-owner-${id}`, ownerName: 'Demo Business Owner',
  ownerEmail: 'owner@example.invalid',
  businessName: name, category, phone: '+1 202-555-0141',
  website: '', description: `Sample submission for ${name}. This is demonstration content only, not a real business or an application received by SaJHa.`,
  onlineOnly: false, address: 'Sample Street, Demo City, USA',
  latitude: null, longitude: null, city: 'Demo City', state: 'Sample State', countryCode: 'US',
  openingHours: hours(), submittedAt: ago(daysBack), lastSubmittedAt: ago(daysBack), revision: 1,
  status, visibility: 'active', payment: { confirmed: false },
  ...(status !== 'pending' ? { reviewedAt: ago(Math.max(daysBack - 2, 0)), reviewedBy: 'Demo Admin' } : {}),
});

export function seedDatabase(): AdminDatabase {
  const r1 = base('demo-BR-1001', 'Demo Himalayan Cafe', 'Restaurant & cafe', 'pending', 1);
  r1.ownerName = 'Sample Cafe Owner'; r1.phone = '+1 202-555-0101';
  r1.description = 'Sample neighborhood cafe offering tea, coffee and light meals. This record is an example of a submitted business request.';
  r1.address = 'Example Avenue, Demo City, USA';
  const r2 = base('demo-BR-1002', 'Demo Community Grocery', 'Grocery & retail', 'approved', 8);
  r2.ownerName = 'Sample Grocery Owner'; r2.payment = { confirmed: true, checkedAt: ago(7), verifiedBy: 'Demo Admin', reference: 'DEMO-MANUAL-001', note: 'Example: payment confirmed by admin outside the platform.' };
  const r3 = base('demo-BR-1003', 'Demo Repairs', 'Home services', 'declined', 12);
  r3.onlineOnly = true; r3.address = ''; r3.city = ''; r3.state = ''; r3.declineReason = 'Please provide a clearer description of the services offered and updated contact details.';
  const r4 = base('demo-BR-1004', 'Demo Sunrise Beauty', 'Beauty & wellness', 'pending', 2);
  r4.phone = '+1 202-555-0104'; r4.ownerName = 'Sample Beauty Owner';
  const r5 = base('demo-BR-1005', 'Demo Tech Helpers', 'Technology', 'pending', 0);
  r5.onlineOnly = true; r5.address = ''; r5.city = ''; r5.state = ''; r5.ownerName = 'Sample Tech Owner';
  const r6 = base('demo-BR-1006', 'Demo Green Garden Service', 'Home services', 'approved', 20);
  r6.payment = { confirmed: true, checkedAt: ago(18), verifiedBy: 'Demo Admin', reference: 'DEMO-MANUAL-002' };
  r6.visibility = 'suspended'; r6.suspensionReason = 'Example: temporarily suspended for verification.';
  const r7 = base('demo-BR-1007', 'Demo Community Tutors', 'Education', 'declined', 16);
  r7.onlineOnly = true; r7.address = ''; r7.declineReason = 'Please supply a complete service description and updated opening hours.';
  const r8 = base('demo-BR-1008', 'Demo Travel Desk', 'Travel & transport', 'approved', 30);
  r8.payment = { confirmed: true, checkedAt: ago(28), verifiedBy: 'Demo Admin' };
  const reports: ReviewReport[] = [
    { id: 'demo-RP-1', businessId: r2.id, businessName: r2.businessName, reviewId: 'demo-review-01',
      reviewer: 'Sample reviewer A', stars: 1, reviewText: 'Sample review text for moderation testing; this is not an actual customer opinion.',
      reporterId: 'demo-user-02', reason: 'Fake or misleading review', createdAt: ago(1), status: 'open' },
    { id: 'demo-RP-2', businessId: r8.id, businessName: r8.businessName, reviewId: 'demo-review-02',
      reviewer: 'Sample reviewer B', stars: 3, reviewText: 'Another sample review for testing the report resolution workflow.',
      reporterId: 'demo-user-03', reason: 'Spam or advertising', createdAt: ago(3), status: 'open' },
  ];
  return {
    schemaVersion: 1,
    requests: [r1, r2, r3, r4, r5, r6, r7, r8],
    reports,
    activity: [{ id: 'demo-event-1', at: today(), actor: 'Demo System', type: 'seed', detail: 'Loaded example business requests and review reports.' }],
  };
}
