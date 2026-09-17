import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';
import { ceremonyPlanService } from '../../services/ceremonyPlanService';
import { CeremonyPlan, CeremonyPlannerInput, AIClarificationResponse, SamagriCategory } from '../../types';
import { CeremonyReadinessGauge } from '../../components/planner/CeremonyReadinessGauge';
import { SamagriChecklist } from '../../components/planner/SamagriChecklist';
import { RitualSequenceTimeline } from '../../components/planner/RitualSequenceTimeline';
import { PreparationTimelineCard } from '../../components/planner/PreparationTimelineCard';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { CITIES_LIST, LANGUAGES_LIST, TRADITIONS_LIST, getTodayDateString } from '../../utils';
import {
  Sparkles,
  Flame,
  Calendar,
  MapPin,
  Users,
  Languages,
  BookOpen,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  FolderHeart,
  FileText,
  AlertTriangle,
  Gift,
  RefreshCw
} from 'lucide-react';

const POPULAR_PUJAS = [
  'Housewarming / Gruhapravesam',
  'Wedding / Vivaha Sanskar',
  'Engagement / Nishchitartham',
  'Naming Ceremony / Namakarana',
  'Annaprashana',
  'Upanayanam / Sacred Thread',
  'Satyanarayana Puja',
  'Ganesh Puja',
  'Lakshmi Puja',
  'Durga Puja',
  'Navagraha Puja & Homa',
  'Funeral / Last Rites',
  'Other Sacred Puja'
];

export const CeremonyPlannerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setDraft } = useBooking();
  const { success, error: toastError } = useToast();

  const planIdParam = searchParams.get('planId');
  const [activeTab, setActiveTab] = useState<'create' | 'plans'>('create');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // Active Plan State
  const [activePlan, setActivePlan] = useState<CeremonyPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<CeremonyPlan[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [planSubTab, setPlanSubTab] = useState<'rituals' | 'samagri' | 'timeline' | 'priest'>('rituals');

  // Form Inputs
  const [queryInput, setQueryInput] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('Housewarming / Gruhapravesam');
  const [locationInput, setLocationInput] = useState(currentUser?.city || 'Bengaluru');
  const [dateInput, setDateInput] = useState(getTodayDateString());
  const [guestCountInput, setGuestCountInput] = useState('15–25 guests');
  const [languageInput, setLanguageInput] = useState('Sanskrit & Kannada');
  const [traditionInput, setTraditionInput] = useState('Smartha / General Vedic');
  const [budgetInput, setBudgetInput] = useState('₹7,000 – ₹12,000');
  const [specialReqInput, setSpecialReqInput] = useState('');

  // AI Clarification State
  const [clarification, setClarification] = useState<AIClarificationResponse | null>(null);
  const [clarifying, setClarifying] = useState(false);

  // Load plans & initial param plan on mount
  useEffect(() => {
    loadUserPlans();
  }, [currentUser]);

  useEffect(() => {
    if (planIdParam) {
      loadSpecificPlan(planIdParam);
    }
  }, [planIdParam]);

  const loadUserPlans = async () => {
    try {
      const plans = await ceremonyPlanService.getPlans(currentUser?.id || '');
      setSavedPlans(plans);
    } catch (e) {
      console.warn('Could not load user plans', e);
    }
  };

  const loadSpecificPlan = async (id: string) => {
    setLoading(true);
    try {
      const plan = await ceremonyPlanService.getPlanById(id);
      if (plan) {
        setActivePlan(plan);
        setTitleDraft(plan.title);
        setActiveTab('create');
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger gentle AI clarification if natural language query changed
  const handleQueryBlur = async () => {
    const trimmed = queryInput.trim();
    if (trimmed.length < 5) {
      setClarification(null);
      return;
    }

    setClarifying(true);
    try {
      const resp = await ceremonyPlanService.askAIClarification(trimmed);
      if (resp && resp.isAmbiguous) {
        setClarification(resp);
      } else {
        setClarification(null);
      }
    } catch {
      setClarification(null);
    } finally {
      setClarifying(false);
    }
  };

  const handleSelectQuickOption = (option: string) => {
    setSelectedEventType(option);
    setQueryInput(prev => prev ? `${prev} - ${option}` : option);
    setClarification(null);
  };

  // Generate Plan Handler
  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setGenerating(true);
    setGenerationStep('Consulting Vedic Vidhana & ritual scriptures...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setGenerationStep('Structuring chronological ritual sequence & samagri...');

      const input: CeremonyPlannerInput = {
        rawQuery: queryInput,
        eventType: selectedEventType,
        location: locationInput,
        date: dateInput,
        guestCount: guestCountInput,
        language: languageInput,
        tradition: traditionInput,
        budgetRange: budgetInput,
        specialRequirements: specialReqInput
      };

      const plan = await ceremonyPlanService.generateAIPlan(input, currentUser?.id || '');
      setGenerationStep('Finalizing readiness milestones...');
      const saved = await ceremonyPlanService.savePlan(plan);

      setActivePlan(saved);
      setTitleDraft(saved.title);
      setSavedPlans(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
      setSearchParams({ planId: saved.id });
      success('Your personalized ceremony plan has been crafted!');
    } catch (err: any) {
      toastError('Failed to generate ceremony plan. Please try again.');
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  // Samagri checklist handlers
  const handleToggleSamagri = async (itemId: string, checked: boolean) => {
    if (!activePlan) return;
    try {
      const updated = await ceremonyPlanService.toggleSamagriItem(activePlan.id, itemId, checked);
      if (updated) {
        setActivePlan(updated);
        setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (e) {
      toastError('Could not update samagri item');
    }
  };

  const handleAddCustomSamagri = async (name: string, quantity?: string, category?: SamagriCategory) => {
    if (!activePlan) return;
    try {
      const updated = await ceremonyPlanService.addCustomSamagriItem(activePlan.id, name, quantity, category);
      if (updated) {
        setActivePlan(updated);
        setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        success(`Added "${name}" to your checklist`);
      }
    } catch (e) {
      toastError('Failed to add custom item');
    }
  };

  const handleRemoveSamagri = async (itemId: string) => {
    if (!activePlan) return;
    try {
      const updated = await ceremonyPlanService.removeSamagriItem(activePlan.id, itemId);
      if (updated) {
        setActivePlan(updated);
        setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (e) {
      toastError('Could not remove item');
    }
  };

  const handleMarkAllSamagri = async (checked: boolean) => {
    if (!activePlan) return;
    try {
      const updated = await ceremonyPlanService.markAllSamagri(activePlan.id, checked);
      if (updated) {
        setActivePlan(updated);
        setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        success(checked ? 'All samagri marked complete' : 'Checklist reset');
      }
    } catch (e) {
      toastError('Could not update all items');
    }
  };

  // Rename Plan
  const handleSaveTitle = async () => {
    if (!activePlan || !titleDraft.trim()) return;
    try {
      const updated = await ceremonyPlanService.renamePlan(activePlan.id, titleDraft.trim());
      if (updated) {
        setActivePlan(updated);
        setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingTitle(false);
        success('Plan title updated');
      }
    } catch {
      toastError('Failed to rename plan');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this ceremony plan?')) return;
    try {
      await ceremonyPlanService.deletePlan(planId);
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (activePlan?.id === planId) {
        setActivePlan(null);
        setSearchParams({});
      }
      success('Ceremony plan deleted');
    } catch {
      toastError('Could not delete plan');
    }
  };

  // Find Priest Handler - filters priest marketplace with plan criteria
  const handleFindPriest = () => {
    if (!activePlan) return;
    const params = new URLSearchParams();
    params.set('q', activePlan.ceremonyType || activePlan.title);
    if (activePlan.location) params.set('city', activePlan.location);
    if (activePlan.date && !activePlan.date.includes('Shubh')) params.set('date', activePlan.date);
    if (activePlan.language) {
      const firstLang = activePlan.language.split(/[\/,]/)[0].trim();
      if (firstLang) params.set('lang', firstLang);
    }
    params.set('planId', activePlan.id);
    navigate(`/priests?${params.toString()}`);
  };

  // Direct Book Priest - carries plan info into BookingDraft
  const handleBookWithPlan = () => {
    if (!activePlan) return;

    // Set BookingDraft in Context
    setDraft({
      customerId: currentUser?.id || '',
      customerName: currentUser?.name || 'Devotee',
      customerEmail: currentUser?.email,
      customerPhone: currentUser?.phone || '',
      priestId: 'pr-101', // Default top Acharya or selected
      priestName: 'Acharya Vidyadhar Shastri',
      priestTitle: 'Veda Murti & Rigveda Acharya',
      priestAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      priestRating: 4.9,
      priestReviewCount: 142,
      priestLanguages: ['Sanskrit', 'Kannada', 'Telugu', 'Hindi'],
      eventId: 'evt-gruhapravesam',
      eventName: activePlan.ceremonyType || activePlan.title,
      serviceName: activePlan.title,
      servicePrice: activePlan.estimatedBudget?.min || 7500,
      includeSamagri: true,
      samagriPrice: 1500,
      date: activePlan.date && !activePlan.date.includes('Shubh') ? activePlan.date : getTodayDateString(),
      time: '09:00 AM',
      timeSlot: 'Morning (08:30 AM - 12:30 PM)',
      location: {
        street: 'Main Entrance Dwara',
        area: activePlan.location,
        city: activePlan.location || 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      notes: `[AI Ceremony Plan Ref: ${activePlan.id}]\nCeremony: ${activePlan.title}\nMain Rituals: ${activePlan.rituals.mainRituals.join(', ')}\nLanguage: ${activePlan.language}\nTradition: ${activePlan.tradition}\nNotes: ${activePlan.eventDetails.rawQuery || 'None'}`.trim(),
      serviceCharge: 0,
      platformFee: 299,
      totalAmount: (activePlan.estimatedBudget?.min || 7500) + 1500 + 299
    });

    navigate(`/book/pr-101?planId=${activePlan.id}`);
  };

  if (loading) {
    return <LoadingState message="Loading your ceremony planner..." fullHeight />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. HEADER & HERO BANNER */}
      <section className="bg-gradient-to-r from-[#701a28] via-[#54131e] to-[#22060a] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-[#8c2433]/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e5b869]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#701a28]/60 border border-[#f5ccd2]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#f5ccd2]">
            <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />
            <span>AI Vedic Vidhana Assistant</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            AI Ceremony Planner
          </h1>

          <p className="text-sm sm:text-base text-stone-200 font-medium leading-relaxed">
            Plan your ceremony with confidence.
          </p>

          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Whether you know the exact Sanskrit rituals or just have an idea in mind, our Vedic AI structures your personalized sequence, samagri checklist, preparation milestones, and helps you match with a verified Acharya.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-3 pt-6 border-t border-white/15 mt-6">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-[#e5b869] text-[#22060a] shadow-md shadow-black/20'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Plan a Ceremony
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'plans'
                ? 'bg-[#e5b869] text-[#22060a] shadow-md shadow-black/20'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            My Ceremony Plans ({savedPlans.length})
          </button>
        </div>
      </section>

      {/* 2. TAB: MY SAVED PLANS DASHBOARD */}
      {activeTab === 'plans' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#22060a]">
                Your Saved Ceremony Plans
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Reopen, track readiness, or book priests for your upcoming sacred occasions.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setActivePlan(null);
                setSearchParams({});
                setActiveTab('create');
              }}
              className="bg-[#701a28] text-white self-start sm:self-auto text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create New Plan
            </Button>
          </div>

          {savedPlans.length === 0 ? (
            <div className="bg-white border border-[#eadfd9] rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#701a28]/10 text-[#701a28] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#22060a]">No Ceremony Plans Saved Yet</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Use the AI Ceremony Planner to design your Gruhapravesam, Satyanarayana Vrata, Wedding, or any sacred puja.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('create')}
                className="bg-[#701a28] text-white"
              >
                Start Your First Plan
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedPlans.map(plan => {
                const reqTotal = plan.samagri?.requiredItems?.length || 0;
                const reqDone = plan.samagri?.requiredItems?.filter(i => i.checked).length || 0;

                return (
                  <div
                    key={plan.id}
                    className="bg-white border border-[#eadfd9] rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#701a28]/10 text-[#701a28]">
                          {plan.ceremonyType || 'Puja'}
                        </span>
                        <span className="text-xs font-bold text-[#22060a] bg-stone-100 px-2.5 py-0.5 rounded-full">
                          {plan.readinessPercentage}% Ready
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#22060a] line-clamp-1">
                        {plan.title}
                      </h3>

                      <div className="space-y-1 text-xs text-stone-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{plan.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{plan.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{plan.guestCount}</span>
                        </div>
                      </div>

                      {/* Mini Samagri Progress */}
                      <div className="pt-2 border-t border-stone-100">
                        <div className="flex justify-between text-[11px] text-stone-500 mb-1 font-medium">
                          <span>Samagri Arranged</span>
                          <span>{reqDone} / {reqTotal}</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#701a28] h-full transition-all"
                            style={{ width: `${reqTotal ? (reqDone / reqTotal) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActivePlan(plan);
                          setTitleDraft(plan.title);
                          setSearchParams({ planId: plan.id });
                          setActiveTab('create');
                        }}
                        className="text-xs flex-1"
                      >
                        Open Plan
                      </Button>

                      <button
                        type="button"
                        title="Delete Plan"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. TAB: PLAN A CEREMONY (INPUT FORM & GENERATED PLAN) */}
      {activeTab === 'create' && (
        <div className="space-y-8">
          {/* A. PLANNER INPUT FORM (Always accessible or can regenerate) */}
          <section className="bg-white border border-[#eadfd9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#eadfd9] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#22060a] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#701a28]" />
                  What Ceremony Are You Planning?
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Tell us your occasion in your own words. You don't need to know the exact Sanskrit rituals.
                </p>
              </div>

              {activePlan && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePlan(null);
                    setSearchParams({});
                  }}
                  className="text-xs text-[#701a28] font-bold hover:underline shrink-0"
                >
                  + Start New Plan
                </button>
              )}
            </div>

            <form onSubmit={handleGeneratePlan} className="space-y-5">
              {/* Natural Language Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Describe Your Sacred Occasion (Natural Language)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={e => setQueryInput(e.target.value)}
                    onBlur={handleQueryBlur}
                    placeholder='e.g., "I want to perform a pooja for my new house" or "Wedding puja in Telugu"'
                    className="w-full px-4 py-3 text-sm border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-stone-50/50 text-[#22060a]"
                  />
                  {clarifying && (
                    <div className="absolute right-3 top-3 text-stone-400 flex items-center gap-1 text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#701a28]" />
                      <span>Checking...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Clarification Card if detected */}
              {clarification && (
                <div className="bg-[#701a28]/5 border border-[#701a28]/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#e5b869] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#701a28]">
                        {clarification.greeting || 'Namaste!'}
                      </p>
                      <p className="text-sm font-bold text-[#22060a]">
                        {clarification.clarificationQuestion}
                      </p>
                    </div>
                  </div>

                  {clarification.quickOptions && clarification.quickOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 pl-6">
                      {clarification.quickOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectQuickOption(opt)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#701a28]/20 text-[#701a28] hover:bg-[#701a28] hover:text-white transition shadow-2xs"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Suggestion Pills */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Or select a common ceremony:
                </span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_PUJAS.map(puja => (
                    <button
                      key={puja}
                      type="button"
                      onClick={() => {
                        setSelectedEventType(puja);
                        setQueryInput(puja);
                        setClarification(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedEventType === puja
                          ? 'bg-[#701a28] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {puja}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Form Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#701a28]" />
                    Location (City) *
                  </label>
                  <select
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  >
                    {CITIES_LIST.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#701a28]" />
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#701a28]" />
                    Guest Count
                  </label>
                  <select
                    value={guestCountInput}
                    onChange={e => setGuestCountInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  >
                    <option value="10–20 guests">10–20 guests (Immediate Family)</option>
                    <option value="25–50 guests">25–50 guests (Relatives & Friends)</option>
                    <option value="50–100 guests">50–100 guests (Grand Gathering)</option>
                    <option value="100+ guests">100+ guests (Large Wedding / Sanskar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-[#701a28]" />
                    Language Preference
                  </label>
                  <select
                    value={languageInput}
                    onChange={e => setLanguageInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  >
                    <option value="Sanskrit & Kannada">Sanskrit & Kannada</option>
                    <option value="Sanskrit & Telugu">Sanskrit & Telugu</option>
                    <option value="Sanskrit & Hindi">Sanskrit & Hindi</option>
                    <option value="Sanskrit & Tamil">Sanskrit & Tamil</option>
                    <option value="Sanskrit & Marathi">Sanskrit & Marathi</option>
                    <option value="Sanskrit & Bengali">Sanskrit & Bengali</option>
                    <option value="Sanskrit & Gujarati">Sanskrit & Gujarati</option>
                    <option value="Sanskrit Only">Sanskrit Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#701a28]" />
                    Tradition / Sampradaya
                  </label>
                  <select
                    value={traditionInput}
                    onChange={e => setTraditionInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  >
                    <option value="Smartha / General Vedic">Smartha / General Vedic</option>
                    <option value="Vaishnava / Sri Vaishnava">Vaishnava / Sri Vaishnava</option>
                    <option value="Madhwa Sampradaya">Madhwa Sampradaya</option>
                    <option value="North Indian Vedic">North Indian Vedic</option>
                    <option value="Arya Samaj">Arya Samaj</option>
                    <option value="Any / Priest Discretion">Any / Priest Discretion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-[#701a28]" />
                    Approximate Budget
                  </label>
                  <select
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  >
                    <option value="₹3,500 – ₹6,000">₹3,500 – ₹6,000 (Simple Puja)</option>
                    <option value="₹7,000 – ₹12,000">₹7,000 – ₹12,000 (Standard with Homa)</option>
                    <option value="₹15,000 – ₹25,000">₹15,000 – ₹25,000 (Multi-Priest / Elaborate)</option>
                    <option value="₹25,000+">₹25,000+ (Grand Sanskar / Wedding)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Special Requirements or Family Gotra Notes
                  </label>
                  <input
                    type="text"
                    value={specialReqInput}
                    onChange={e => setSpecialReqInput(e.target.value)}
                    placeholder="e.g., small apartment space, require samagri arranged by priest, elderly timings"
                    className="w-full px-3 py-2 text-xs border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/30 bg-white"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#eadfd9]">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Vedic Vidhana. Personalized to your family tradition.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={generating}
                  className="bg-[#701a28] text-white hover:bg-[#54131e] px-8 py-3 text-sm font-bold shadow-md shadow-[#701a28]/25"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      {generationStep || 'Crafting Ceremony Plan...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-[#e5b869]" />
                      Create My Ceremony Plan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>

          {/* B. GENERATED CEREMONY PLAN DISPLAY */}
          {activePlan && (
            <section className="space-y-6">
              {/* Plan Header Card */}
              <div className="bg-white border border-[#eadfd9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eadfd9] pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#701a28]/10 text-[#701a28] text-xs font-bold uppercase tracking-wider">
                      {activePlan.ceremonyType}
                    </span>

                    {editingTitle ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          className="px-3 py-1.5 text-lg font-bold border border-[#701a28] rounded-lg focus:outline-hidden"
                        />
                        <Button size="sm" variant="primary" onClick={handleSaveTitle}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <h2 className="text-xl sm:text-2xl font-bold text-[#22060a] mt-1 flex items-center gap-2">
                        {activePlan.title}
                        <button
                          type="button"
                          onClick={() => setEditingTitle(true)}
                          className="text-stone-400 hover:text-[#701a28] transition p-1"
                          title="Rename plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </h2>
                    )}

                    <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                      {activePlan.eventDetails?.purpose || activePlan.eventDetails?.description}
                    </p>
                  </div>

                  {/* Summary Meta Chips */}
                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 text-xs text-stone-600 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#701a28]" />
                      <strong className="text-[#22060a]">{activePlan.date}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#701a28]" />
                      <span>{activePlan.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#701a28]" />
                      <span>{activePlan.estimatedDuration}</span>
                    </div>
                  </div>
                </div>

                {/* Mandatory Religious / Tradition Awareness Notice */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong>Vedic Guidance Notice:</strong> {activePlan.disclaimer || 'Ritual practices can vary by family tradition, region, and sampradaya. Please confirm the final ritual sequence and samagri with your selected priest.'}
                  </p>
                </div>
              </div>

              {/* Readiness Meter Gauge */}
              <CeremonyReadinessGauge plan={activePlan} onFindPriest={handleFindPriest} />

              {/* Sub-Tabs Navigation for Plan Sections */}
              <div className="flex items-center gap-2 border-b border-[#eadfd9] overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPlanSubTab('rituals')}
                  className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    planSubTab === 'rituals'
                      ? 'border-[#701a28] text-[#701a28] font-bold'
                      : 'border-transparent text-stone-500 hover:text-[#22060a]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Ritual Sequence & Vidhana
                </button>

                <button
                  type="button"
                  onClick={() => setPlanSubTab('samagri')}
                  className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    planSubTab === 'samagri'
                      ? 'border-[#701a28] text-[#701a28] font-bold'
                      : 'border-transparent text-stone-500 hover:text-[#22060a]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Samagri Checklist ({activePlan.samagri?.requiredItems?.filter(i => i.checked).length || 0}/
                  {activePlan.samagri?.requiredItems?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setPlanSubTab('timeline')}
                  className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    planSubTab === 'timeline'
                      ? 'border-[#701a28] text-[#701a28] font-bold'
                      : 'border-transparent text-stone-500 hover:text-[#22060a]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Preparation Timeline
                </button>

                <button
                  type="button"
                  onClick={() => setPlanSubTab('priest')}
                  className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    planSubTab === 'priest'
                      ? 'border-[#701a28] text-[#701a28] font-bold'
                      : 'border-transparent text-stone-500 hover:text-[#22060a]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Priest & Budget Guidance
                </button>
              </div>

              {/* Sub-Tab Contents */}
              <div>
                {planSubTab === 'rituals' && <RitualSequenceTimeline plan={activePlan} />}

                {planSubTab === 'samagri' && (
                  <SamagriChecklist
                    plan={activePlan}
                    onToggleItem={handleToggleSamagri}
                    onAddItem={handleAddCustomSamagri}
                    onRemoveItem={handleRemoveSamagri}
                    onMarkAll={handleMarkAllSamagri}
                  />
                )}

                {planSubTab === 'timeline' && (
                  <PreparationTimelineCard timeline={activePlan.preparationSteps} />
                )}

                {planSubTab === 'priest' && (
                  <div className="bg-white border border-[#eadfd9] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                    <div className="border-b border-[#eadfd9] pb-4">
                      <h3 className="text-lg font-bold text-[#22060a]">
                        Priest Requirements & Estimated Dakshina
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Guidance on required acharya qualifications and approximate ceremonial budget.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Priest Requirements */}
                      <div className="bg-stone-50/70 border border-[#eadfd9] rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                          Recommended Priest Profile
                        </h4>
                        <div className="space-y-2 text-xs">
                          <p className="text-[#22060a]">
                            <strong>Number of Priests:</strong> {activePlan.priestRequirements?.priestCount || 1} Acharya
                            {activePlan.priestRequirements?.priestCount > 1 ? 's' : ''}
                          </p>
                          <p className="text-[#22060a]">
                            <strong>Suggested Expertise:</strong>{' '}
                            {activePlan.priestRequirements?.suggestedExpertise?.join(', ') || 'Vedic Vidhana'}
                          </p>
                          <p className="text-[#22060a]">
                            <strong>Language Preference:</strong> {activePlan.priestRequirements?.languagePreference || activePlan.language}
                          </p>
                          {activePlan.priestRequirements?.notes && (
                            <p className="text-stone-600 italic mt-1">
                              "{activePlan.priestRequirements.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Budget Guidance */}
                      <div className="bg-[#701a28]/3 border border-[#701a28]/15 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#701a28]">
                            Estimated Planning Range
                          </h4>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Approximate
                          </span>
                        </div>

                        <div className="text-2xl font-black text-[#22060a]">
                          ₹{activePlan.estimatedBudget?.min?.toLocaleString() || '5,000'} – ₹
                          {activePlan.estimatedBudget?.max?.toLocaleString() || '10,000'}
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed">
                          {activePlan.estimatedBudget?.note ||
                            'Estimates are indicative for priest dakshina and essential items. Final dakshina is confirmed transparently upon selecting your verified priest.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. BOTTOM ACTION & BOOKING CONVERSION BAR */}
              <div className="bg-gradient-to-r from-[#faf7f2] via-white to-[#f5eee6] border border-[#eadfd9] rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#22060a]">
                      Ready to Proceed with an Authentic Acharya?
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#701a28] bg-[#701a28]/10 px-2 py-0.5 rounded-full">
                      <Gift className="w-3 h-3 text-[#e5b869]" />
                      Earn Purohit Points
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Complete your booking through Purohit Seva to earn Purohit Points and guaranteed satisfaction protection.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleFindPriest}
                    className="text-xs font-bold border-[#701a28] text-[#701a28] hover:bg-[#701a28]/5"
                  >
                    Find a Verified Priest
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleBookWithPlan}
                    className="text-xs font-bold bg-[#701a28] text-white hover:bg-[#54131e] shadow-md shadow-[#701a28]/25"
                  >
                    Book a Priest Now
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
