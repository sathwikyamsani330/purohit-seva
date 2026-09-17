import {
  Report,
  ReportCategory,
  ReportStatus,
  PolicyViolation,
  PolicyViolationSeverity,
  PriestTrustBadgeInfo,
  PriestTrustTier,
  PriestPolicyAcknowledgement,
  Priest
} from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { notificationService } from './notificationService';
import { authService } from './authService';

const REPORTS_STORAGE_KEY = 'purohit_reports';
const POLICY_VIOLATIONS_KEY = 'purohit_policy_violations';
const PRIEST_POLICY_ACK_KEY = 'purohit_priest_policy_acks';

export const CURRENT_POLICY_VERSION = '2026.1';

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  description: string;
  role: 'customer' | 'priest' | 'both';
}[] = [
  {
    id: 'PRIEST_ASKED_DIRECT_PAY',
    label: 'Priest asked me to pay directly',
    description: 'Priest requested direct cash, UPI, or personal transfer instead of Purohit Seva checkout.',
    role: 'customer'
  },
  {
    id: 'PRIEST_OFFERED_CHEAPER_OFF_PLATFORM',
    label: 'Priest offered a cheaper off-platform booking',
    description: 'Priest suggested a discount if the ceremony is booked or paid outside the platform.',
    role: 'customer'
  },
  {
    id: 'PRIEST_ASKED_CANCEL_PRIVATE',
    label: 'Priest asked me to cancel and book privately',
    description: 'Priest asked to cancel the active platform booking to proceed informally.',
    role: 'customer'
  },
  {
    id: 'PRIEST_REQUESTED_OFF_PLATFORM_PAYMENT',
    label: 'Priest requested payment outside Purohit Seva',
    description: 'Priest requested fees outside the escrow and dakshina breakdown visible in the app.',
    role: 'customer'
  },
  {
    id: 'CUSTOMER_PROPOSED_OFF_PLATFORM',
    label: 'Customer proposed paying or booking outside platform',
    description: 'Customer requested direct settlement or bypass of Purohit Seva platform security.',
    role: 'priest'
  },
  {
    id: 'SUSPICIOUS_BEHAVIOR',
    label: 'Suspicious or unprofessional behavior',
    description: 'Any fraudulent, misleading, or non-compliant conduct.',
    role: 'both'
  },
  {
    id: 'OTHER',
    label: 'Other policy or safety concern',
    description: 'Other issue not listed above.',
    role: 'both'
  }
];

export const PUROHIT_PROTECTION_FEATURES = [
  {
    id: 'verified-priest',
    title: 'Verified Vedic Priest',
    description: 'Aadhaar, Veda Patashala lineage, and authentic credentials physically verified by Acharya Council.',
    icon: 'ShieldCheck'
  },
  {
    id: 'secure-payment',
    title: 'Secure Dakshina Escrow',
    description: 'Payment is securely held and only disbursed to the priest after the ceremony is auspiciously conducted.',
    icon: 'Lock'
  },
  {
    id: 'booking-confirmation',
    title: 'Guaranteed Muhurtham Slot',
    description: 'Priest is contractually bound to your chosen muhurtham with live journey tracking.',
    icon: 'CalendarCheck'
  },
  {
    id: 'digital-receipt',
    title: 'Official Digital Receipt',
    description: 'Clear itemized break-up of Dakshina, platform fee, and complete gotra-sankalpa records.',
    icon: 'FileText'
  },
  {
    id: 'cancellation-refund',
    title: 'Cancellation & Refund Protection',
    description: 'Transparent cancellation policies with full refunds for priest cancellations or unfulfilled services.',
    icon: 'RefreshCw'
  },
  {
    id: 'replacement-support',
    title: 'Emergency Replacement Purohit',
    description: 'In unforeseen emergencies, Purohit Seva dispatches an equal-lineage replacement priest promptly.',
    icon: 'UserCheck'
  },
  {
    id: 'dispute-assistance',
    title: 'Acharya Dispute Mediation',
    description: 'Dedicated Vedic dispute officers ready to assist with any ceremony or protocol discrepancies.',
    icon: 'Scale'
  },
  {
    id: 'rewards-eligibility',
    title: 'Purohit Points & Rewards',
    description: 'Earn 100+ Purohit Points on every completed booking, redeemable for samagri and vouchers.',
    icon: 'Sparkles'
  },
  {
    id: 'verified-reviews',
    title: 'Verified Devotee Reviews',
    description: 'Only devotees who paid and attended can submit ratings, preserving community trust.',
    icon: 'Star'
  }
];

export const PRIEST_BENEFITS = [
  {
    title: 'Continuous Devotee Discovery',
    description: 'Reach thousands of verified Hindu households in your city searching for authentic Vedic pujas.',
    icon: 'Users'
  },
  {
    title: 'Verified Trust Badge & Credibility',
    description: 'Stand out with "Highly Trusted" or "Verified Priest" badges that instill confidence in devotees.',
    icon: 'ShieldCheck'
  },
  {
    title: 'Guaranteed Digital Dakshina',
    description: 'Zero cash haggling. Receive your dakshina directly into your bank account with complete transparency.',
    icon: 'Wallet'
  },
  {
    title: 'Protection from Last-Minute Cancellations',
    description: 'Platform cancellation policies protect your time with compensation if a customer cancels late.',
    icon: 'CheckCircle2'
  },
  {
    title: 'Digital Muhurtham & Calendar Records',
    description: 'Automated scheduling, booking reminders, and customer location directions on Google Maps.',
    icon: 'Calendar'
  },
  {
    title: 'Reviews, Reputation & Repeat Bookings',
    description: 'Satisfied devotees can directly "Book You Again", creating lifetime patrons for your seva.',
    icon: 'Repeat'
  },
  {
    title: 'Purohit Seva Acharya Helpline',
    description: 'Dedicated 24x7 support team to resolve travel, venue, or devotee disputes smoothly.',
    icon: 'Headphones'
  }
];

// Helper to seed initial sample reports if storage is empty
const INITIAL_REPORTS: Report[] = [
  {
    id: 'REP-20260901-001',
    bookingId: 'PS-20260830-101',
    reporterId: 'cust-1',
    reporterName: 'Sathwik Yamsani',
    reporterEmail: 'sathwikyamsani330@gmail.com',
    reportedUserId: 'pr-101',
    reportedUserName: 'Sri Ramesh Sharma',
    reporterRole: 'customer',
    category: 'PRIEST_ASKED_DIRECT_PAY',
    categoryLabel: 'Priest asked me to pay directly',
    description: 'During a prior inquiry, priest mentioned direct Google Pay would be easier. Resolved through clarification.',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    resolvedBy: 'admin@purohitseva.in',
    adminNotes: 'Contacted priest and reiterated platform policy. Priest acknowledged and updated procedure.',
    actionTaken: 'WARNING_ISSUED'
  }
];

function getStoredReports(): Report[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_REPORTS;
  }
}

function saveStoredReports(reports: Report[]) {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save reports in localStorage:', err);
  }
}

function getStoredViolations(): PolicyViolation[] {
  try {
    const raw = localStorage.getItem(POLICY_VIOLATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredViolations(violations: PolicyViolation[]) {
  try {
    localStorage.setItem(POLICY_VIOLATIONS_KEY, JSON.stringify(violations));
  } catch (err) {
    console.error('Failed to save policy violations:', err);
  }
}

export const protectionService = {
  /**
   * Submit an issue report regarding off-platform requests or suspicious behavior
   */
  createReport: async (reportData: {
    bookingId?: string;
    requestId?: string;
    reporterId: string;
    reporterName?: string;
    reporterEmail?: string;
    reportedUserId: string;
    reportedUserName?: string;
    reporterRole: 'customer' | 'priest';
    category: ReportCategory | string;
    description: string;
  }): Promise<Report> => {
    const reportId = `REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const categoryObj = REPORT_CATEGORIES.find((c) => c.id === reportData.category);

    const newReport: Report = {
      id: reportId,
      bookingId: reportData.bookingId || '',
      requestId: reportData.requestId || '',
      reporterId: reportData.reporterId,
      reporterName: reportData.reporterName || (reportData.reporterRole === 'customer' ? 'Devotee' : 'Purohit'),
      reporterEmail: reportData.reporterEmail || '',
      reportedUserId: reportData.reportedUserId,
      reportedUserName: reportData.reportedUserName || 'User',
      reporterRole: reportData.reporterRole,
      category: reportData.category,
      categoryLabel: categoryObj?.label || reportData.category,
      description: reportData.description.trim(),
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    // Save locally first for guaranteed instant responsiveness
    const currentReports = getStoredReports();
    // Check if duplicate report exists for same booking & category
    const isDuplicate = currentReports.some(
      (r) =>
        r.reporterId === newReport.reporterId &&
        r.bookingId === newReport.bookingId &&
        r.category === newReport.category &&
        r.status === 'OPEN'
    );
    if (isDuplicate) {
      throw new Error('You have already submitted an active report for this incident. Our team is reviewing it.');
    }

    currentReports.unshift(newReport);
    saveStoredReports(currentReports);

    // Save to Firestore if available
    try {
      if (auth.currentUser) {
        const reportRef = doc(db, 'reports', reportId);
        await setDoc(reportRef, newReport);
      }
    } catch (err) {
      console.warn('Firestore report write notice (using local storage fallback):', err);
    }

    // Send confirmation in-app notification to reporter and admin
    try {
      await Promise.all([
        notificationService.createNotification({
          userId: reportData.reporterId,
          targetRole: reportData.reporterRole,
          title: 'Report Received - Purohit Seva Protection',
          message: `Your report (${reportId}) regarding ${categoryObj?.label || 'a ceremony issue'} has been submitted. Our Acharya Integrity Council is reviewing it discreetly.`,
          type: 'SUPPORT_UPDATED',
          category: 'SUPPORT',
          priority: 'normal',
          reportId,
          link: '/profile',
          read: false
        }),
        notificationService.createNotification({
          userId: 'admin',
          targetRole: 'admin',
          title: `New Protection Report: ${categoryObj?.label || 'Incident'}`,
          message: `Report ${reportId} filed by ${reportData.reporterName} against ${reportData.reportedUserName || 'off-platform solicitation'}.`,
          type: 'ADMIN_PROTECTION_REPORT',
          category: 'SECURITY',
          priority: 'urgent',
          reportId,
          link: '/admin/protection',
          read: false
        })
      ]);
    } catch (notifErr) {
      console.warn('Could not send report confirmation notification:', notifErr);
    }

    return newReport;
  },

  /**
   * Get all reports or filter by reporter/user/status
   */
  getReports: async (filter?: {
    reporterId?: string;
    reportedUserId?: string;
    status?: ReportStatus;
    reporterRole?: 'customer' | 'priest';
  }): Promise<Report[]> => {
    let reports: Report[] = [];

    // Try Firestore
    if (auth.currentUser) {
      try {
        const reportsCol = collection(db, 'reports');
        const currentAppUser = authService.getCurrentUser();
        const isAdmin = currentAppUser?.role === 'admin';

        let q;
        if (filter?.reporterId) {
          q = query(reportsCol, where('reporterId', '==', filter.reporterId));
        } else if (filter?.reportedUserId) {
          q = query(reportsCol, where('reportedUserId', '==', filter.reportedUserId));
        } else if (isAdmin) {
          q = query(reportsCol);
        } else {
          q = query(reportsCol, where('reporterId', '==', auth.currentUser.uid));
        }
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.forEach((d) => {
            reports.push(d.data() as Report);
          });
        }
      } catch (err) {
        console.warn('Firestore getReports query notice, falling back to local storage:', err);
      }
    }

    if (reports.length === 0) {
      reports = getStoredReports();
    }

    // In-memory filter
    return reports
      .filter((r) => {
        if (filter?.reporterId && r.reporterId !== filter.reporterId) return false;
        if (filter?.reportedUserId && r.reportedUserId !== filter.reportedUserId) return false;
        if (filter?.status && r.status !== filter.status) return false;
        if (filter?.reporterRole && r.reporterRole !== filter.reporterRole) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Admin resolution/update of a report
   */
  updateReportStatus: async (
    reportId: string,
    status: ReportStatus,
    options?: {
      adminNotes?: string;
      actionTaken?: Report['actionTaken'];
      resolvedBy?: string;
    }
  ): Promise<Report | null> => {
    const all = getStoredReports();
    const idx = all.findIndex((r) => r.id === reportId);
    if (idx === -1) return null;

    const updated: Report = {
      ...all[idx],
      status,
      adminNotes: options?.adminNotes !== undefined ? options.adminNotes : all[idx].adminNotes,
      actionTaken: options?.actionTaken !== undefined ? options.actionTaken : all[idx].actionTaken,
      resolvedBy: options?.resolvedBy || 'admin@purohitseva.in',
      resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' ? new Date().toISOString() : all[idx].resolvedAt
    };

    all[idx] = updated;
    saveStoredReports(all);

    // Sync to Firestore
    try {
      if (auth.currentUser) {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          status,
          ...(options?.adminNotes !== undefined && { adminNotes: options.adminNotes }),
          ...(options?.actionTaken !== undefined && { actionTaken: options.actionTaken }),
          resolvedBy: updated.resolvedBy,
          ...(updated.resolvedAt && { resolvedAt: updated.resolvedAt })
        });
      }
    } catch (err) {
      console.warn('Firestore updateReportStatus notice:', err);
    }

    // Notify the reporter of the outcome (without exposing private admin notes)
    try {
      const statusTitle =
        status === 'RESOLVED'
          ? 'Report Resolved - Purohit Seva Protection'
          : status === 'UNDER_REVIEW'
          ? 'Report Under Review'
          : 'Report Update';
      const statusMsg =
        status === 'RESOLVED'
          ? `Your report (${reportId}) has been investigated and resolved by our administration team. Thank you for protecting our sacred community.`
          : status === 'UNDER_REVIEW'
          ? `Your report (${reportId}) is currently under active review by the Acharya Council.`
          : `Your report (${reportId}) status has been updated to ${status}.`;

      await notificationService.createNotification({
        userId: updated.reporterId,
        targetRole: updated.reporterRole,
        title: statusTitle,
        message: statusMsg,
        type: 'SUPPORT_UPDATED',
        category: 'SUPPORT',
        priority: status === 'RESOLVED' ? 'high' : 'normal',
        reportId: updated.id,
        link: '/profile',
        read: false
      });
    } catch (notifErr) {
      console.warn('Could not notify reporter of update:', notifErr);
    }

    return updated;
  },

  /**
   * Record a policy violation (Admin only)
   */
  recordPolicyViolation: async (data: Omit<PolicyViolation, 'id' | 'createdAt'>): Promise<PolicyViolation> => {
    const violationId = `VIO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newViolation: PolicyViolation = {
      id: violationId,
      ...data,
      createdAt: new Date().toISOString()
    };

    const violations = getStoredViolations();
    violations.unshift(newViolation);
    saveStoredViolations(violations);

    // Firestore sync
    try {
      if (auth.currentUser) {
        const vRef = doc(db, 'policyViolations', violationId);
        await setDoc(vRef, newViolation);
      }
    } catch (err) {
      console.warn('Firestore recordPolicyViolation notice:', err);
    }

    // Notify violator and admin of policy violation
    try {
      await Promise.all([
        notificationService.createNotification({
          userId: data.userId,
          title: '⚠️ Acharya Integrity Policy Notice',
          message: `A policy violation record (${violationId}) was logged: ${data.notes || data.violationType}. Please adhere strictly to platform conduct shastras.`,
          type: 'SYSTEM_ALERT',
          category: 'SECURITY',
          priority: 'urgent',
          link: '/profile',
          read: false
        }),
        notificationService.createNotification({
          userId: 'admin',
          targetRole: 'admin',
          title: `Policy Violation Recorded: ${data.userName}`,
          message: `Violation ${violationId} (${data.violationType}) logged against ${data.userName}. Severity: ${data.severity}.`,
          type: 'ADMIN_POLICY_EVENT',
          category: 'SECURITY',
          priority: 'high',
          link: '/admin/protection',
          read: false
        })
      ]);
    } catch (err) {
      console.warn('Could not send policy violation notifications:', err);
    }

    return newViolation;
  },

  getPolicyViolations: async (userId?: string): Promise<PolicyViolation[]> => {
    let list: PolicyViolation[] = [];
    if (auth.currentUser) {
      try {
        const col = collection(db, 'policyViolations');
        const q = userId ? query(col, where('userId', '==', userId)) : query(col);
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.forEach((d) => list.push(d.data() as PolicyViolation));
        }
      } catch (err) {
        console.warn('Firestore getPolicyViolations notice:', err);
      }
    }

    if (list.length === 0) {
      list = getStoredViolations();
    }

    if (userId) {
      return list.filter((v) => v.userId === userId);
    }
    return list;
  },

  /**
   * Computes priest trust reputation badge without exposing raw mathematical score.
   * Considers:
   * - Completed bookings count
   * - Cancellation rate
   * - Customer ratings & reviews
   * - Confirmed policy violations
   */
  getPriestTrustBadge: (
    priest: Partial<Priest>,
    stats?: {
      completedBookings?: number;
      cancellationRatePercent?: number;
      violationCount?: number;
    }
  ): PriestTrustBadgeInfo => {
    const completed = stats?.completedBookings ?? priest.totalPujasCompleted ?? 12;
    const rating = priest.rating ?? 4.8;
    const reviewCount = priest.reviewCount ?? 8;
    const cancellationRate = stats?.cancellationRatePercent ?? 2.1;
    const violations = stats?.violationCount ?? 0;

    let tier: PriestTrustTier = 'VERIFIED';
    let label: PriestTrustBadgeInfo['label'] = 'Verified Priest';
    let description = 'Identity and Vedic lineage verified by Purohit Seva.';
    let colorClass = 'text-stone-700';
    let bgClass = 'bg-stone-100';
    let borderClass = 'border-stone-200';

    if (violations === 0 && completed >= 15 && rating >= 4.8 && cancellationRate < 5) {
      tier = 'HIGHLY_TRUSTED';
      label = 'Highly Trusted';
      description = 'Top-tier Vedic scholar with exemplary reliability and consistently exceptional devotee ratings.';
      colorClass = 'text-[#701a28]';
      bgClass = 'bg-[#fdf2f4]';
      borderClass = 'border-[#f5ccd2]';
    } else if (violations === 0 && completed >= 5 && rating >= 4.5 && cancellationRate < 10) {
      tier = 'TRUSTED';
      label = 'Trusted Priest';
      description = 'Established Purohit with reliable muhurtham attendance and positive reviews.';
      colorClass = 'text-amber-800';
      bgClass = 'bg-amber-50';
      borderClass = 'border-amber-200';
    }

    return {
      tier,
      label,
      description,
      colorClass,
      bgClass,
      borderClass,
      metrics: {
        completedBookings: completed,
        rating,
        reviewCount,
        cancellationRatePercent: cancellationRate,
        violationCount: violations
      }
    };
  },

  /**
   * Priest Booking Policy Acknowledgement
   */
  getPriestPolicyAcknowledgement: async (priestId: string): Promise<PriestPolicyAcknowledgement | null> => {
    try {
      const raw = localStorage.getItem(`${PRIEST_POLICY_ACK_KEY}_${priestId}`);
      if (raw) return JSON.parse(raw);
    } catch {}

    // Check Firestore
    if (auth.currentUser) {
      try {
        const snap = await getDoc(doc(db, 'priestPolicyAcks', priestId));
        if (snap.exists()) {
          return snap.data() as PriestPolicyAcknowledgement;
        }
      } catch (err) {
        console.warn('Firestore getPriestPolicyAcknowledgement notice:', err);
      }
    }

    return null;
  },

  acknowledgePriestPolicy: async (priestId: string, version = CURRENT_POLICY_VERSION): Promise<PriestPolicyAcknowledgement> => {
    const ack: PriestPolicyAcknowledgement = {
      priestId,
      acknowledgedAt: new Date().toISOString(),
      version,
      agreedToTerms: true
    };

    try {
      localStorage.setItem(`${PRIEST_POLICY_ACK_KEY}_${priestId}`, JSON.stringify(ack));
    } catch {}

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'priestPolicyAcks', priestId), ack);
      } catch (err) {
        console.warn('Firestore acknowledgePriestPolicy notice:', err);
      }
    }

    return ack;
  }
};
