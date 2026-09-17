import React, { useState } from 'react';
import { CeremonyPlan, SamagriItem, SamagriCategory } from '../../types';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle,
  RotateCcw,
  Copy,
  Check,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '../Button';

interface Props {
  plan: CeremonyPlan;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onAddItem: (name: string, quantity?: string, category?: SamagriCategory) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onMarkAll: (checked: boolean) => Promise<void>;
}

const CATEGORIES: SamagriCategory[] = [
  'Puja Essentials',
  'Flowers & Leaves',
  'Fruits & Offerings',
  'Homa & Hawan Samagri',
  'Vessels & Setup',
  'Other Items'
];

export const SamagriChecklist: React.FC<Props> = ({
  plan,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onMarkAll
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<SamagriCategory>('Puja Essentials');
  const [copied, setCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const requiredItems = plan.samagri?.requiredItems || [];
  const optionalItems = plan.samagri?.optionalItems || [];
  const allItems = [...requiredItems, ...optionalItems];

  const filteredItems = selectedCategory === 'All'
    ? allItems
    : allItems.filter(i => (i.category || 'Puja Essentials') === selectedCategory);

  const totalCount = requiredItems.length;
  const completedCount = requiredItems.filter(i => i.checked).length;
  const allChecked = totalCount > 0 && completedCount === totalCount;

  const handleToggle = async (id: string, current: boolean) => {
    setUpdatingId(id);
    try {
      await onToggleItem(id, !current);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await onAddItem(newItemName.trim(), newItemQty.trim() || '1 pack', newItemCategory);
    setNewItemName('');
    setNewItemQty('');
    setShowAddModal(false);
  };

  const handleCopyChecklist = () => {
    const lines = [
      `📋 Samagri Checklist for ${plan.title}:`,
      `Date: ${plan.date} | Location: ${plan.location}`,
      '',
      ...requiredItems.map(
        i => `[${i.checked ? '✓' : ' '}] ${i.name} ${i.quantity ? `(${i.quantity})` : ''} - ${i.category}`
      )
    ];
    if (optionalItems.length > 0) {
      lines.push('', 'Optional Items:');
      lines.push(...optionalItems.map(i => `[${i.checked ? '✓' : ' '}] ${i.name} ${i.quantity ? `(${i.quantity})` : ''}`));
    }
    lines.push('', 'Shared via Purohit Seva AI Ceremony Planner');

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white border border-[#eadfd9] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-[#22060a]">
              Sacred Samagri Checklist
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#701a28]/10 text-[#701a28] font-bold text-xs">
              {completedCount} / {totalCount} Completed
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Check off items as you arrange them, or customize this list according to your family customs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyChecklist}
            className="text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Checklist
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onMarkAll(!allChecked)}
            className="text-xs"
          >
            {allChecked ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-stone-600" />
                Reset All
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Mark All Done
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-[#701a28] text-white hover:bg-[#54131e]"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Custom Item
          </Button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#eadfd9] text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
            selectedCategory === 'All'
              ? 'bg-[#701a28] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          All Items ({allItems.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = allItems.filter(i => (i.category || 'Puja Essentials') === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#701a28] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredItems.map(item => {
          const isUpdating = updatingId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id, item.checked)}
              className={`flex items-start justify-between p-3.5 rounded-xl border transition cursor-pointer select-none ${
                item.checked
                  ? 'bg-emerald-50/60 border-emerald-200 text-stone-700'
                  : 'bg-stone-50/60 border-[#eadfd9] hover:bg-white hover:border-[#701a28]/40 text-[#22060a]'
              } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-stone-400">
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Square className="w-5 h-5 text-stone-400" />
                  )}
                </div>
                <div>
                  <span
                    className={`text-sm font-semibold block leading-tight ${
                      item.checked ? 'line-through text-stone-500' : 'text-[#22060a]'
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {item.quantity && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200/70 font-medium text-stone-700">
                        {item.quantity}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                      {item.category || 'Puja Essentials'}
                    </span>
                    {item.isCustom && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.isCustom && (
                <button
                  type="button"
                  title="Remove item"
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-8 text-center text-stone-500 text-xs">
          No samagri items found in this category.
        </div>
      )}

      {/* Add Custom Item Modal / Sheet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#eadfd9] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-[#22060a]">
              Add Custom Samagri Item
            </h4>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Special Gotra offerings, dry fruit platter"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quantity / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., 500 grams, 2 sets"
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value as SamagriCategory)}
                  className="w-full px-3.5 py-2 text-sm border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-[#701a28] text-white"
                >
                  Add Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
