import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { PriestRequest } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import {
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  FileText,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
  BellRing
} from 'lucide-react';

export const RequestSentPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { getRequestById } = useBooking();
  const [request, setRequest] = useState<PriestRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) return;
      try {
        const data = await getRequestById(requestId);
        setRequest(data);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestId, getRequestById]);

  if (loading) {
    return <LoadingState message="Fetching request confirmation..." fullHeight />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Top Success Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center space-y-5 shadow-sm">
        <div className="w-18 h-18 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-600/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Request Status: PENDING
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            Request Sent Successfully
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Your request has been sent to the priest. You will be notified once the priest confirms availability.
          </p>
        </div>

        {/* Request ID Tag */}
        <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-600">
          Request Reference: <strong className="font-mono text-slate-900 font-bold">{request?.id || requestId}</strong>
        </div>

        {/* Informational Guidance Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-left text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <BellRing className="w-4 h-4 text-amber-700" />
            <span>Next Steps</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-amber-800 leading-relaxed pl-1">
            <li>Acharya <strong>{request?.priestName || 'the priest'}</strong> will review your muhurtham and event details.</li>
            <li>Once accepted, the request status will change to <strong>ACCEPTED</strong> in your dashboard.</li>
            <li>You can then complete payment to finalize and confirm your ceremony.</li>
          </ol>
        </div>
      </div>

      {/* Summary of What Was Requested */}
      {request && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <h3 className="font-heading text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#701a28]" />
            Request Details
          </h3>

          <div className="flex items-center gap-4 p-3.5 bg-[#faf8f5] rounded-2xl border border-[#eadfd9]">
            <Avatar
              src={request.priestImage || request.priestAvatar}
              name={request.priestName}
              size="lg"
              className="rounded-xl shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-stone-900 text-sm">{request.priestName}</h4>
              <p className="text-xs text-stone-500">{request.priestTitle || 'Vedic Priest'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#faf8f5] rounded-xl space-y-1 border border-[#eadfd9]">
              <span className="text-stone-400 font-medium block">Ceremony</span>
              <p className="font-bold text-stone-900 text-sm">{request.eventName}</p>
              <p className="text-[#701a28] font-semibold text-xs">{request.serviceName}</p>
            </div>

            <div className="p-3 bg-[#faf8f5] rounded-xl space-y-1 border border-[#eadfd9]">
              <span className="text-stone-400 font-medium block">Auspicious Muhurtham</span>
              <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#701a28]" /> {formatDate(request.date)}
              </p>
              <p className="text-stone-700 font-semibold text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#701a28]" /> {request.time || request.timeSlot}
              </p>
            </div>

            <div className="sm:col-span-2 p-3 bg-[#faf8f5] rounded-xl space-y-1 border border-[#eadfd9]">
              <span className="text-stone-400 font-medium block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#701a28]" /> Ceremony Location
              </span>
              <p className="font-semibold text-stone-900 text-xs leading-relaxed">
                {request.location}
              </p>
            </div>

            {request.notes && (
              <div className="sm:col-span-2 p-3 bg-[#fdf2f4] rounded-xl space-y-1 border border-[#f5ccd2]">
                <span className="text-[#701a28] font-semibold block flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#701a28]" /> Special Gotra / Notes
                </span>
                <p className="text-stone-700 text-xs italic">
                  "{request.notes}"
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Estimated Payable Dakshina:</span>
            <span className="text-base font-extrabold text-slate-900">
              {formatCurrency(request.totalAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Options */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <Link to="/bookings" className="w-full sm:w-auto">
          <Button variant="primary" size="lg" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
            View My Requests & Bookings
          </Button>
        </Link>
        <Link to="/priests" className="w-full sm:w-auto">
          <Button variant="outline" size="lg" fullWidth>
            Browse More Priests
          </Button>
        </Link>
      </div>
    </div>
  );
};
