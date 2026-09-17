import { PujaEvent } from '../types';
import { MOCK_EVENTS } from '../data/mockData';

const EVENTS_STORAGE_KEY = 'purohit_seva_events_list';

export const eventService = {
  getEvents: async (): Promise<PujaEvent[]> => {
    const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return MOCK_EVENTS;
  },

  getEventById: async (id: string): Promise<PujaEvent | null> => {
    const events = await eventService.getEvents();
    return events.find(e => e.id === id || e.slug === id) || null;
  },

  addEvent: async (eventData: Omit<PujaEvent, 'id'>): Promise<PujaEvent> => {
    const events = await eventService.getEvents();
    const newEvent: PujaEvent = {
      ...eventData,
      id: `evt-${Date.now()}`
    };
    const updated = [newEvent, ...events];
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    return newEvent;
  },

  createEvent: async (eventData: Omit<PujaEvent, 'id'>): Promise<PujaEvent> => {
    return eventService.addEvent(eventData);
  },

  updateEvent: async (id: string, updates: Partial<PujaEvent>): Promise<PujaEvent> => {
    const events = await eventService.getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Event not found');

    const updatedEvent = { ...events[index], ...updates };
    events[index] = updatedEvent;
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    return updatedEvent;
  },

  deleteEvent: async (id: string): Promise<void> => {
    const events = await eventService.getEvents();
    const filtered = events.filter(e => e.id !== id);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filtered));
  },

  toggleEventStatus: async (id: string): Promise<PujaEvent> => {
    const events = await eventService.getEvents();
    const event = events.find(e => e.id === id);
    if (!event) throw new Error('Event not found');
    return eventService.updateEvent(id, { isActive: !event.isActive });
  }
};
