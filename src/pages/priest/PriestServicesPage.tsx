import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { priestService } from '../../services/priestService';
import { eventService } from '../../services/eventService';
import { Priest, PriestServiceItem, PujaEvent } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency } from '../../utils';
import { Plus, Edit2, Trash2, Clock, Flame, CheckCircle2 } from 'lucide-react';

export const PriestServicesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [priest, setPriest] = useState<Priest | null>(null);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PriestServiceItem, 'id'>>({
    name: '',
    eventId: 'evt-1',
    description: '',
    duration: '2.5 Hours',
    price: 3500,
    includesSamagri: true
  });

  const loadServices = async () => {
    setLoading(true);
    try {
      const priestId = currentUser?.id || 'priest-1';
      const [pData, allEvents] = await Promise.all([
        priestService.getPriestById(priestId),
        eventService.getEvents()
      ]);
      setPriest(pData || null);
      setEvents(allEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setEditingServiceId(null);
    setFormData({
      name: '',
      eventId: events[0]?.id || 'evt-1',
      description: '',
      duration: '2.5 Hours',
      price: 3500,
      includesSamagri: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (srv: PriestServiceItem) => {
    setEditingServiceId(srv.id);
    setFormData({
      name: srv.name,
      eventId: srv.eventId,
      description: srv.description,
      duration: srv.duration,
      price: srv.price,
      includesSamagri: srv.includesSamagri
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      error('Please enter service name and price.');
      return;
    }

    try {
      const priestId = currentUser?.id || 'priest-1';
      if (editingServiceId) {
        await priestService.updateService(priestId, editingServiceId, formData);
        success('Puja service updated successfully.');
      } else {
        await priestService.addService(priestId, formData);
        success('New puja service added to your profile.');
      }
      setModalOpen(false);
      loadServices();
    } catch {
      error('Failed to save service.');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm('Are you sure you want to remove this service?')) {
      try {
        const priestId = currentUser?.id || 'priest-1';
        await priestService.deleteService(priestId, serviceId);
        success('Service removed.');
        loadServices();
      } catch {
        error('Failed to delete service.');
      }
    }
  };

  if (loading) {
    return <LoadingState message="Loading your puja catalog..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            My Puja Services & Dakshina Rates
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure the rituals you perform, duration, and dakshina pricing
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Puja Service
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {priest?.services.map((srv) => (
          <div
            key={srv.id}
            className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{srv.name}</h3>
                  <span className="text-xs font-semibold text-amber-700">
                    {events.find(e => e.id === srv.eventId)?.name || 'General Puja'}
                  </span>
                </div>
                <span className="text-base font-extrabold text-stone-900">
                  {formatCurrency(srv.price)}
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-4">
                {srv.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-stone-500 pb-3 border-b border-stone-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {srv.duration}
                </span>
                {srv.includesSamagri && (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Samagri Assistance
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(srv)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => handleDelete(srv.id)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingServiceId ? 'Edit Puja Service' : 'Add New Puja Service'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Service Title (e.g. Maha Ganapathi Homa)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Related Event Category
            </label>
            <select
              value={formData.eventId}
              onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
              className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Standard Dakshina (₹)"
              type="number"
              value={String(formData.price)}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              required
            />
            <Input
              label="Estimated Duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g. 3 Hours"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Service Description & Inclusions
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the homa, slokas, or sankalpam details included..."
              className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-amber-500"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.includesSamagri}
              onChange={(e) => setFormData({ ...formData, includesSamagri: e.target.checked })}
              className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <span>Include Samagri list preparation and verification</span>
          </label>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save Service
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
