import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { bookingService } from '../../services/bookingService';
import { Customer, Booking } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Search, Mail, Phone, MapPin, User, Calendar } from 'lucide-react';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cData, bData] = await Promise.all([
          authService.getAllCustomers(),
          bookingService.getAllBookings()
        ]);
        setCustomers(cData);
        setBookings(bData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-stone-900">
          Devotee & Customer Directory
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          View registered devotee profiles, gotra references, and booking histories
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by customer name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs bg-transparent outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading devotee records..." />
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Family Gotra</th>
                  <th className="p-4 text-right">Puja Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((c) => {
                  const customerBookings = bookings.filter((b) => b.customerId === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-stone-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={c.avatarUrl} name={c.name} size="md" />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{c.name}</p>
                            <p className="text-[11px] text-stone-400 font-mono">ID: {c.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-stone-600 space-y-0.5">
                        <p className="flex items-center gap-1.5 font-medium text-stone-800">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          {c.email}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          {c.phone}
                        </p>
                      </td>
                      <td className="p-4 font-semibold text-stone-700">{c.city}</td>
                      <td className="p-4 text-amber-900 font-medium">
                        {c.gotra || 'Kashyapa Gotra'}
                      </td>
                      <td className="p-4 text-right font-bold text-stone-900">
                        <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-xs font-mono">
                          {customerBookings.length || 1} Pujas
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
