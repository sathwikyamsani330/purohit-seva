import React, { useEffect, useState } from 'react';
import { priestService } from '../../services/priestService';
import { Priest } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Rating } from '../../components/Rating';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, CITIES_LIST } from '../../utils';
import { useToast } from '../../context/ToastContext';
import { Search, ShieldCheck, CheckCircle2, XCircle, MapPin, Award, Eye } from 'lucide-react';

export const AdminPriestsPage: React.FC = () => {
  const { success, error } = useToast();
  const [priests, setPriests] = useState<Priest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');

  // Priest detail modal
  const [activePriest, setActivePriest] = useState<Priest | null>(null);

  const loadPriests = async () => {
    setLoading(true);
    try {
      const data = await priestService.getPriests();
      setPriests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriests();
  }, []);

  const handleToggleVerify = async (p: Priest) => {
    try {
      const newStatus = !p.isVerified;
      await priestService.toggleVerification(p.id, newStatus);
      success(`${p.name} verification set to ${newStatus ? 'Verified' : 'Unverified'}`);
      loadPriests();
    } catch {
      error('Failed to update verification status.');
    }
  };

  const filteredPriests = priests.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tradition.toLowerCase().includes(search.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || p.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-stone-900">
          Priest & Acharya Directory Governance
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Audit credentials, manage verification badges, and inspect service rates
        </p>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, tradition, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-stone-500 font-semibold">City:</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 outline-none"
          >
            {CITIES_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading priest directory..." />
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="p-4">Priest</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Tradition</th>
                  <th className="p-4">Experience</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPriests.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={p.avatarUrl} name={p.name} size="md" />
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{p.name}</p>
                          <p className="text-[11px] text-amber-800">{p.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-stone-700">
                      {p.location}, {p.city}
                    </td>
                    <td className="p-4 font-semibold text-stone-800">{p.tradition}</td>
                    <td className="p-4">{p.experienceYears}+ Years</td>
                    <td className="p-4">
                      <Rating value={p.rating} reviewCount={p.reviewCount} size="sm" />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        p.isVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.isVerified ? <CheckCircle2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {p.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivePriest(p)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVerify(p)}
                        className={p.isVerified ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'}
                      >
                        {p.isVerified ? 'Revoke' : 'Verify'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Priest Inspector Modal */}
      {activePriest && (
        <Modal
          isOpen={Boolean(activePriest)}
          onClose={() => setActivePriest(null)}
          title={`Priest File: ${activePriest.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-stone-700">
            <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
              <Avatar src={activePriest.avatarUrl} name={activePriest.name} size="xl" />
              <div>
                <h4 className="font-bold text-stone-900 text-base">{activePriest.name}</h4>
                <p className="text-amber-800 font-semibold">{activePriest.title}</p>
                <p className="text-stone-500 mt-0.5">{activePriest.location}, {activePriest.city} • {activePriest.phone}</p>
              </div>
            </div>

            <div>
              <strong className="block text-stone-900 font-bold mb-1">Gurukula & Certifications:</strong>
              <div className="flex flex-wrap gap-1.5">
                {activePriest.qualifications?.map((q, i) => (
                  <span key={i} className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                    ✓ {q}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <strong className="block text-stone-900 font-bold mb-1">About & Lineage:</strong>
              <p className="text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                {activePriest.about}
              </p>
            </div>

            <div>
              <strong className="block text-stone-900 font-bold mb-1">Services & Pricing:</strong>
              <div className="grid grid-cols-2 gap-2">
                {activePriest.services.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex justify-between">
                    <span>{s.name}</span>
                    <span className="font-bold">{formatCurrency(s.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
