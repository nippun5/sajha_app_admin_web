export type ApprovalStatus = 'pending' | 'approved' | 'declined';
export type Visibility = 'active' | 'suspended';
export type ReportStatus = 'open' | 'dismissed' | 'removed';
export type Section = 'dashboard' | 'requests' | 'published' | 'reports' | 'activity' | 'settings';

export interface PaymentVerification {
  confirmed: boolean;
  checkedAt?: string;
  verifiedBy?: string;
  reference?: string;
  note?: string;
}

export interface BusinessRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  businessName: string;
  category: string;
  phone: string;
  website: string;
  description: string;
  onlineOnly: boolean;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId?: string | null;
  city?: string;
  state?: string;
  countryCode?: string;
  openingHours: Record<string, string>;
  bannerUrl?: string;
  submittedAt: string;
  lastSubmittedAt: string;
  revision: number;
  status: ApprovalStatus;
  declineReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  visibility: Visibility;
  suspensionReason?: string;
  payment: PaymentVerification;
}

export interface ReviewReport {
  id: string;
  businessId: string;
  businessName: string;
  reviewId: string;
  reviewer: string;
  stars: number;
  reviewText: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  status: ReportStatus;
  moderatedAt?: string;
  moderatorNote?: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  actor: string;
  type: string;
  requestId?: string;
  detail: string;
}

export interface AdminDatabase {
  schemaVersion: 1;
  requests: BusinessRequest[];
  reports: ReviewReport[];
  activity: ActivityEvent[];
}
