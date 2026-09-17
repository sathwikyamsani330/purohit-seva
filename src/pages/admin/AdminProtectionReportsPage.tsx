import React, { useEffect, useState } from 'react';
import { protectionService } from '../../services/protectionService';
import { Report, ReportStatus, ReportCategory, PolicyViolation, PolicyViolationSeverity } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { LoadingState } from '../../components/LoadingState';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

export const AdminProtectionReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const { currentUser } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'violations'>('reports');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Active Report Details Modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<ReportStatus>('UNDER_REVIEW');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Issue Warning/Violation Modal
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [violationSeverity, setViolationSeverity] = useState<PolicyViolationSeverity>('MEDIUM');
  const [warningNotes, setWarningNotes] = useState('');
  const [isIssuingWarning, setIsIssuingWarning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reps, viols] = await Promise.all([
        protectionService.getReports(),
        protectionService.getPolicyViolations()
      ]);
      setReports(reps);
      setViolations(viols);
    } catch {
      error('Failed to load protection reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReportModal = (rep: Report) => {
    setSelectedReport(rep);
    setResolutionStatus(rep.status);
    setAdminNotes(rep.adminNotes || '');
  };

  const handleSaveResolution = async () => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await protectionService.updateReportStatus(
        selectedReport.id,
        resolutionStatus,
        {
          adminNotes,
          resolvedBy: currentUser?.email || 'admin@purohitseva.in'
        }
      );
      success(`Report #${selectedReport.id} marked as ${resolutionStatus}.`);
      setSelectedReport(null);
      loadData();
    } catch {
      error('Failed to update report status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIssueViolation = async () => {
    if (!selectedReport) return;
    setIsIssuingWarning(true);
    try {
      await protectionService.recordPolicyViolation({
        userId: selectedReport.reportedUserId,
        userName: selectedReport.reportedUserName || 'Reported Party',
        userRole: selectedReport.reporterRole === 'customer' ? 'priest' : 'customer',
        bookingId: selectedReport.bookingId,
        violationType: String(selectedReport.category),
        severity: violationSeverity,
        resolvedBy: currentUser?.email || 'admin@purohitseva.in',
        notes: warningNotes || `Actioned under incident report #${selectedReport.id}`
      });

      // Update report to resolved
      await protectionService.updateReportStatus(
        selectedReport.id,
        'RESOLVED',
        {
          adminNotes: `Formal violation recorded (${violationSeverity}). Notes: ${warningNotes}`,
          actionTaken: 'WARNING_ISSUED',
          resolvedBy: currentUser?.email || 'admin@purohitseva.in'
        }
      );

      success(`Official warning recorded. Incident #${selectedReport.id} resolved.`);
      setIsWarningModalOpen(false);
      setSelectedReport(null);
      loadData();
    } catch {
      error('Failed to record violation.');
    } finally {
      setIsIssuingWarning(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      (r.reporterName && r.reporterName.toLowerCase().includes(search.toLowerCase())) ||
      (r.reportedUserName && r.reportedUserName.toLowerCase().includes(search.toLowerCase())) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.bookingId && r.bookingId.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openCount = reports.filter((r) => r.status === 'OPEN').length;
  const underReviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'DISMISSED':
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getCategoryLabel = (category: ReportCategory | string) => {
    switch (category) {
      case 'PRIEST_ASKED_DIRECT_PAY':
        return 'Priest Asked For Direct Payment';
      case 'PRIEST_OFFERED_CHEAPER_OFF_PLATFORM':
        return 'Offered Cheaper Off-Platform Puja';
      case 'PRIEST_ASKED_CANCEL_PRIVATE':
        return 'Requested Private Booking Cancellation';
      case 'PRIEST_REQUESTED_OFF_PLATFORM_PAYMENT':
        return 'Fee Requested Outside Escrow';
      case 'CUSTOMER_PROPOSED_OFF_PLATFORM':
        return 'Devotee Proposed Off-Platform Deal';
      case 'SUSPICIOUS_BEHAVIOR':
        return 'Suspicious Activity';
      case 'OTHER':
        return 'Other Incident';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#701a28] block mb-1">
            Trust, Safety & Fair-Play Desk
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Protection & Anti-Bypass Console
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Monitor reported policy circumventions, investigate off-platform solicitations, and safeguard sacred transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Open Incidents</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{openCount}</p>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">Awaiting initial triage</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{underReviewCount}</p>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">Active investigation</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Resolved Cases</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{resolvedCount}</p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Actioned or mediated</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Policy Sanctions</span>
            <div className="w-8 h-8 rounded-xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{violations.length}</p>
          <span className="text-[11px] text-[#701a28] font-medium mt-1 block">Documented warnings</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Incident Reports ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'violations'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Recorded Policy Violations ({violations.length})</span>
        </button>
      </div>

      {/* Content for Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search report ID, booking ID, devotee or acharya name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 outline-none focus:border-[#701a28]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="PRIEST_ASKED_DIRECT_PAY">Priest Asked Direct Pay</option>
                <option value="PRIEST_OFFERED_CHEAPER_OFF_PLATFORM">Cheaper Off-Platform Offer</option>
                <option value="PRIEST_ASKED_CANCEL_PRIVATE">Asked Private Cancellation</option>
                <option value="PRIEST_REQUESTED_OFF_PLATFORM_PAYMENT">Direct Dakshina Request</option>
                <option value="CUSTOMER_PROPOSED_OFF_PLATFORM">Customer Proposed Off-Platform</option>
                <option value="SUSPICIOUS_BEHAVIOR">Suspicious Behavior</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <LoadingState message="Loading reported cases..." />
          ) : filteredReports.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-stone-200 space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-stone-900 text-sm">No Incident Reports Match Filters</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                All confirmed bookings and communication channels are operating within fair-play guidelines.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f5] text-stone-600 uppercase text-[10px] font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-3.5 px-4">Report ID</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Reporter</th>
                      <th className="py-3.5 px-4">Reported Party</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredReports.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800">
                          {r.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-900 block">
                            {r.categoryLabel || getCategoryLabel(r.category)}
                          </span>
                          {r.bookingId && (
                            <span className="font-mono text-[10px] text-stone-400">
                              Booking: {r.bookingId}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800 block">
                            {r.reporterName || 'Devotee'}
                          </span>
                          <span className="text-[10px] text-stone-400 capitalize">
                            Role: {r.reporterRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800 block">
                            {r.reportedUserName || r.reportedUserId}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ID: {r.reportedUserId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReportModal(r)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content for Violations Tab */}
      {activeTab === 'violations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            {violations.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-stone-900 text-sm">No Violations on Record</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  No priests or devotees currently possess formal warnings or platform strikes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f5] text-stone-600 uppercase text-[10px] font-bold border-b border-stone-200">
                    <tr>
                      <th className="py-3.5 px-4">Violation ID</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Severity</th>
                      <th className="py-3.5 px-4">Admin Notes</th>
                      <th className="py-3.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {violations.map((v) => (
                      <tr key={v.id} className="hover:bg-stone-50/80">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800">
                          {v.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900">
                          {v.userName || v.userId}
                        </td>
                        <td className="py-3.5 px-4 capitalize text-stone-600">
                          {v.userRole || 'User'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-stone-800">
                            {getCategoryLabel(v.violationType)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            v.severity === 'HIGH' || v.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                          {v.notes || 'Documented warning'}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                          {new Date(v.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review & Resolution Modal */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          title={`Incident Report: ${selectedReport.id}`}
        >
          <div className="space-y-5 text-xs text-stone-700">
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#faf8f5] rounded-2xl border border-[#eadfd9]">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Category
                </span>
                <span className="font-bold text-stone-900">
                  {selectedReport.categoryLabel || getCategoryLabel(selectedReport.category)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Booking Reference
                </span>
                <span className="font-mono font-bold text-stone-900">
                  {selectedReport.bookingId || 'General Inquiry'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Reporter
                </span>
                <span className="font-semibold text-stone-900">
                  {selectedReport.reporterName} ({selectedReport.reporterRole})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Reported Party
                </span>
                <span className="font-semibold text-stone-900">
                  {selectedReport.reportedUserName || selectedReport.reportedUserId}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-stone-400 uppercase font-bold block">
                Incident Description
              </span>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 leading-relaxed italic">
                "{selectedReport.description}"
              </div>
            </div>

            {/* Admin Resolution Form */}
            <div className="space-y-3 pt-3 border-t border-stone-200">
              <h4 className="font-bold text-stone-900 text-sm">
                Administrative Triage & Resolution
              </h4>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Investigation Status
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as ReportStatus)}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-none focus:border-[#701a28]"
                >
                  <option value="OPEN">OPEN (Awaiting Review)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Contacting Parties)</option>
                  <option value="RESOLVED">RESOLVED (Action Taken)</option>
                  <option value="DISMISSED">DISMISSED (Inconclusive / False Positive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Resolution Notes / Action Summary
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Document mediation findings, communication review, or reason for dismissal..."
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-none focus:border-[#701a28]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-700 border-rose-200 hover:bg-rose-50"
                  onClick={() => setIsWarningModalOpen(true)}
                  leftIcon={<AlertOctagon className="w-4 h-4" />}
                >
                  Issue Formal Warning
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReport(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveResolution}
                    disabled={isUpdating}
                    className="bg-[#701a28] hover:bg-[#59131e]"
                  >
                    {isUpdating ? 'Saving...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Warning Confirmation Modal */}
      {isWarningModalOpen && selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setIsWarningModalOpen(false)}
          title="Issue Fair-Play Warning"
        >
          <div className="space-y-4 text-xs text-stone-700">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Human Review Enforced
              </p>
              <p className="text-[11px] text-amber-700">
                In adherence with platform principles, accounts are never suspended automatically from a single report. Warnings require documented policy breach verification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Violation Severity
              </label>
              <select
                value={violationSeverity}
                onChange={(e) => setViolationSeverity(e.target.value as PolicyViolationSeverity)}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-none focus:border-[#701a28]"
              >
                <option value="LOW">LOW (Educational Advisory)</option>
                <option value="MEDIUM">MEDIUM (Formal Policy Warning)</option>
                <option value="HIGH">HIGH (Severe Breach / Repeated)</option>
                <option value="CRITICAL">CRITICAL (Critical Safety Violation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason & Policy Notice
              </label>
              <textarea
                rows={3}
                value={warningNotes}
                onChange={(e) => setWarningNotes(e.target.value)}
                placeholder="State the specific policy breached (e.g. requesting direct cash payment outside platform escrow)..."
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs outline-none focus:border-[#701a28]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWarningModalOpen(false)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-700 hover:bg-rose-800 text-white"
                onClick={handleIssueViolation}
                disabled={isIssuingWarning}
              >
                {isIssuingWarning ? 'Recording...' : `Confirm Warning`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
