import React, { useEffect, useState } from 'react';
import { eventService } from '../../services/eventService';
import { PujaEvent } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency } from '../../utils';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Clock, Flame, Star, CheckCircle } from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const { success, error } = useToast();
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PujaEvent, 'id'>>({
    name: '',
    sanskritName: '',
    shortDescription: '',
    fullDescription: '',
    category: 'Household Pujas',
    duration: '2.5 - 3 Hours',
    basePrice: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1609358905581-e5382c473950?auto=format&fit=crop&q=80&w=800',
    samagriIncluded: true,
    isPopular: false,
    deity: 'Lord Ganesha',
    significance: '',
    inclusions: ['Sankalpam', 'Mantra Chanting', 'Aarti & Prasad']
  });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      sanskritName: '',
      shortDescription: '',
      fullDescription: '',
      category: 'Household Pujas',
      duration: '2.5 - 3 Hours',
      basePrice: 3500,
      imageUrl: 'https://images.unsplash.com/photo-1609358905581-e5382c473950?auto=format&fit=crop&q=80&w=800',
      samagriIncluded: true,
      isPopular: false,
      deity: 'Lord Shiva',
      significance: 'Spiritual prosperity and protection',
      inclusions: ['Mantra Japa', 'Homa Kunda Setup', 'Aarti']
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (evt: PujaEvent) => {
    setEditingId(evt.id);
    setFormData({
      name: evt.name,
      sanskritName: evt.sanskritName,
      shortDescription: evt.shortDescription,
      fullDescription: evt.fullDescription,
      category: evt.category,
      duration: evt.duration,
      basePrice: evt.basePrice,
      imageUrl: evt.imageUrl,
      samagriIncluded: evt.samagriIncluded,
      isPopular: evt.isPopular,
      deity: evt.deity,
      significance: evt.significance,
      inclusions: evt.inclusions
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await eventService.updateEvent(editingId, formData);
        success('Puja category updated successfully.');
      } else {
        await eventService.createEvent(formData);
        success('New puja category added to catalog.');
      }
      setModalOpen(false);
      loadEvents();
    } catch {
      error('Failed to save puja event.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading puja catalog..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            Puja Catalog & Ritual Governance
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure available Vedic events, standard durations, deities, and base dakshina
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Puja Category
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 w-full">
                <img
                  src={evt.imageUrl}
                  alt={evt.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 flex gap-1.5">
                  {evt.isPopular && (
                    <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Popular
                    </span>
                  )}
                  <span className="bg-stone-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {evt.category}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-stone-900">{evt.name}</h3>
                  <span className="text-sm font-extrabold text-stone-900">
                    {formatCurrency(evt.basePrice)}
                  </span>
                </div>

                <p className="font-serif text-xs text-amber-800 italic">{evt.sanskritName}</p>
                <p className="text-xs text-stone-600 line-clamp-2">{evt.shortDescription}</p>

                <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {evt.duration}
                  </span>
                  <span className="font-medium text-stone-700">Deity: {evt.deity}</span>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => handleOpenEdit(evt)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Catalog Item
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Puja Category' : 'Create New Puja Category'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Puja Event Title"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Sanskrit Mantra Subtitle"
              value={formData.sanskritName}
              onChange={(e) => setFormData({ ...formData, sanskritName: e.target.value })}
              placeholder="e.g. ॐ गं गणपतये नमः"
              required
            />
            <Input
              label="Presiding Deity"
              value={formData.deity}
              onChange={(e) => setFormData({ ...formData, deity: e.target.value })}
              required
            />
            <Input
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <Input
              label="Base Dakshina (₹)"
              type="number"
              value={String(formData.basePrice)}
              onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
              required
            />
            <Input
              label="Standard Duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />
          </div>

          <Input
            label="Cover Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            required
          />

          <Input
            label="Short Description"
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            required
          />

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Full Significance & Vidhi Overview
            </label>
            <textarea
              rows={3}
              value={formData.fullDescription}
              onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
              />
              <span>Mark as Popular on Homepage</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.samagriIncluded}
                onChange={(e) => setFormData({ ...formData, samagriIncluded: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
              />
              <span>Samagri Guidance Included</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
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
              Save to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
