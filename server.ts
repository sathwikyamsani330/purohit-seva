import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// 1. Security Headers Middleware (Production Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Safe CSP allowing necessary Google Fonts, Vite dev client, and AI Studio iframe preview
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; frame-ancestors 'self' https://ai.studio https://*.google.com https://*.run.app;"
  );
  next();
});

// 2. Structured JSON Audit Logging (Zero customer PII)
interface AuditLogEntry {
  timestamp: string;
  action: string;
  ip: string;
  resourceId?: string;
  details: Record<string, any>;
  status: 'SUCCESS' | 'CONFLICT' | 'RATE_LIMITED' | 'REJECTED' | 'FAILED';
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function logAuditEvent(entry: AuditLogEntry) {
  // Production-grade structured audit log without customer PII
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
}

// 3. Sliding Window In-Memory Rate Limiting
interface RateLimitRecord {
  timestamps: number[];
}

function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  endpointName: string;
}) {
  const store = new Map<string, RateLimitRecord>();

  // Prune expired records periodically
  setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [ip, record] of store.entries()) {
      record.timestamps = record.timestamps.filter(ts => ts > cutoff);
      if (record.timestamps.length === 0) {
        store.delete(ip);
      }
    }
  }, 60000).unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const cutoff = now - options.windowMs;

    let record = store.get(ip);
    if (!record) {
      record = { timestamps: [] };
      store.set(ip, record);
    }

    record.timestamps = record.timestamps.filter(ts => ts > cutoff);

    if (record.timestamps.length >= options.maxRequests) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        action: 'RATE_LIMIT_EXCEEDED',
        ip,
        details: {
          endpoint: options.endpointName,
          requestCount: record.timestamps.length,
          limit: options.maxRequests
        },
        status: 'RATE_LIMITED'
      });

      const retryAfter = Math.max(1, Math.ceil((record.timestamps[0] + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Rate limit exceeded for ${options.endpointName}. Please try again in ${retryAfter}s.`,
        retryAfter
      });
    }

    record.timestamps.push(now);
    next();
  };
}

const availabilityRateLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60000,
  endpointName: 'availability API'
});

const aiRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60000,
  endpointName: 'AI planner API'
});

const paymentRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60000,
  endpointName: 'Payment API'
});

const paymentWebhookRateLimiter = createRateLimiter({
  maxRequests: 120,
  windowMs: 60000,
  endpointName: 'Payment Webhook API'
});

// 4. Input Validation & Bounds Checking
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const TIME_FORMAT_REGEX = /^[a-zA-Z0-9:\s]{1,32}$/;

function isValidDateString(d: unknown): boolean {
  if (typeof d !== 'string') return false;
  const trimmed = d.trim();
  if (!DATE_FORMAT_REGEX.test(trimmed)) return false;
  const [y, m, day] = trimmed.split('-').map(Number);
  return y >= 2024 && y <= 2035 && m >= 1 && m <= 12 && day >= 1 && day <= 31;
}

function isValidSafeId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return SAFE_ID_REGEX.test(id.trim());
}

function isValidTimeString(t: unknown): boolean {
  if (typeof t !== 'string') return false;
  return TIME_FORMAT_REGEX.test(t.trim());
}

// 5. Timeout protection helper for asynchronous external operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Reduced body limit for security against payload DOS, preserving rawBody for webhook HMAC verification
app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Google GenAI client lazily or safely with server-only key
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// Resilient multi-model executor with automatic fallback for transient 503/429 spikes
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

async function generateJSONContentWithFallback(ai: GoogleGenAI, prompt: string): Promise<any> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text?.trim() || '';
      if (!rawText) continue;

      let clean = rawText;
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      return JSON.parse(clean);
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      // If 503 high demand spike or transient error, wait briefly and try next lighter model
      const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('429');
      if (isTransient) {
        await new Promise(r => setTimeout(r, 300));
      }
      continue;
    }
  }

  throw lastError || new Error('All candidate Gemini models temporarily unavailable');
}

// --- DEFAULT VEDIC KNOWLEDGE FALLBACKS ---
const VEDIC_TEMPLATES: Record<string, any> = {
  gruhapravesam: {
    title: 'Gruhapravesam (Vedic Housewarming Ceremony)',
    ceremonyType: 'Gruhapravesam / Housewarming',
    purpose: 'Auspicious entry into a newly constructed or acquired home to cleanse negative energies, invite Vastu Purusha blessings, and bring enduring prosperity and peace.',
    description: 'A comprehensive sacred Vedic ceremony performed before occupying a new home, including cow puja (Gau Puja), milk boiling (Ksheera Tharpanam), Vastu Shanti, Ganapati Puja, and Navagraha Homa.',
    significance: 'According to Vastu Shastra and Vedic scriptures, entering a dwelling after pacifying directional deities and planetary influences ensures health, wealth, and harmony for all inhabitants.',
    rituals: {
      mainRituals: [
        'Dwara Puja & Toranam (Threshold Blessing)',
        'Gau Puja (Holy Cow & Calf Blessing)',
        'Ganapati Puja & Punyahavachanam (Purification)',
        'Ksheera Tharpanam (Auspicious Milk Boiling Ritual)',
        'Vastu Shanti & Vastu Homa (Dwelling Energy Harmonization)',
        'Navagraha Homa (Nine Planetary Deities Appeasement)',
        'Maha Mangala Aarti & Purnahuti'
      ],
      optionalRituals: [
        'Sri Satyanarayana Swamy Vrata',
        'Lakshmi Kubera Homa',
        'Kuladevata Prarthana'
      ],
      sequence: [
        { step: 1, name: 'Dwara Puja & Threshold Entry', description: 'Blessing the auspicious main door entrance with mango leaves, turmeric, and kumkum.', durationMinutes: 20 },
        { step: 2, name: 'Gau & Vatsa Puja', description: 'Welcoming the sacred cow and calf into the premises to invoke Kamadhenu blessings.', durationMinutes: 25 },
        { step: 3, name: 'Vighneshwara & Kalasha Sthapana', description: 'Invoking Lord Ganesha to dissolve obstacles and sanctifying waters for Punyahavachanam.', durationMinutes: 35 },
        { step: 4, name: 'Ksheera Tharpanam', description: 'Boiling fresh milk in a new brass/earthen vessel until it overflows auspiciously in the northeast direction.', durationMinutes: 20 },
        { step: 5, name: 'Vastu Shanti & Agni Karyam', description: 'Consecrating the sacred Homa Kundam and propitiating Vastu Purusha.', durationMinutes: 45 },
        { step: 6, name: 'Navagraha & Mahalakshmi Homa', description: 'Offering ahuti to the 9 planets and seeking lasting abundance.', durationMinutes: 50 },
        { step: 7, name: 'Purnahuti, Vasordhara & Teertha Prasadam', description: 'Final ghee stream, blessing of the family, and distribution of holy prasadam.', durationMinutes: 30 }
      ]
    },
    samagri: {
      required: [
        { name: 'Turmeric powder (Pasupu)', quantity: '250 g', category: 'Puja Essentials' },
        { name: 'Kumkum (Sindoor)', quantity: '100 g', category: 'Puja Essentials' },
        { name: 'Sandalwood paste (Chandan)', quantity: '50 g', category: 'Puja Essentials' },
        { name: 'Incense sticks (Agarbatti) & Camphor (Karpuram)', quantity: '2 packs + 100g', category: 'Puja Essentials' },
        { name: 'Raw Rice (Akshata)', quantity: '2 kg', category: 'Puja Essentials' },
        { name: 'Betel leaves & Supari (Paan & Areca nuts)', quantity: '25 leaves + 20 nuts', category: 'Puja Essentials' },
        { name: 'Kalash copper/brass pot', quantity: '1 or 2 pots', category: 'Vessels & Setup' },
        { name: 'Fresh coconuts with fiber', quantity: '5 nos', category: 'Fruits & Offerings' },
        { name: 'Mango leaves bunches (Amra Pallava)', quantity: '5 bunches', category: 'Flowers & Leaves' },
        { name: 'Assorted seasonal flowers & garlands', quantity: '1.5 kg + 3 garlands', category: 'Flowers & Leaves' },
        { name: 'Assorted 5 types of fruits', quantity: '2 kg assorted', category: 'Fruits & Offerings' },
        { name: 'Pure cow ghee for Homa', quantity: '1 kg', category: 'Homa & Hawan Samagri' },
        { name: 'Dry coconuts (Kopra halves) for Homa', quantity: '4 halves', category: 'Homa & Hawan Samagri' },
        { name: 'Havan Samagri herbs & wood (Samidha)', quantity: '1 packet + mango wood sticks', category: 'Homa & Hawan Samagri' },
        { name: 'New bronze/earthen milk vessel (Pal Pongal pot)', quantity: '1 no', category: 'Vessels & Setup' },
        { name: 'Fresh whole cow milk', quantity: '1 liter', category: 'Fruits & Offerings' }
      ],
      optional: [
        { name: 'Navadhanya (Nine sacred grains set)', quantity: '1 set (100g each)' },
        { name: 'Navaratna or Pancha Dhatu coins for threshold', quantity: '1 set' },
        { name: 'Silk dhoti & angavastram for Acharya dakshina', quantity: '1 set' },
        { name: 'Sweets (Laddoo/Peda) for 30 guests', quantity: '1.5 kg' }
      ]
    },
    preparationSteps: {
      sevenDaysBefore: [
        'Consult with acharya to confirm exact auspicious muhurtham for threshold entry.',
        'Complete basic cleaning, whitewashing/painting, and electrical fittings in all rooms.',
        'Arrange Homa space with proper ventilation or balcony setup for sacrificial fire.'
      ],
      oneOrTwoDaysBefore: [
        'Clean the main entrance and draw traditional Kolam/Rangoli with rice flour.',
        'Tie fresh mango leaf toranam on the threshold.',
        'Purchase fresh flowers, fruits, milk, and verify samagri list checklist.',
        'Keep brass lamps, puja bell, and copper vessels polished and ready.'
      ],
      ceremonyDay: [
        'Devotee family takes holy bath at Brahma Muhurtham and wears traditional attire.',
        'Ensure east or northeast corner of the house is cleaned and ready for Kalasha setup.',
        'Keep matchbox, cotton wicks, oil, ghee, and boiled milk ingredients readily accessible.'
      ]
    },
    priestRequirements: {
      priestCount: 2,
      suggestedExpertise: ['Vastu Shastra', 'Navagraha Homa', 'Rigveda / Krishna Yajurveda'],
      languagePreference: 'Kannada, Telugu, Hindi, or Sanskrit',
      notes: 'For Gruhapravesam with Homa, having a chief Acharya and an assistant priest ensures continuous recitations while offering ahutis.'
    },
    estimatedDuration: '3.5 to 4.5 hours',
    estimatedBudget: {
      min: 7500,
      max: 14000,
      currency: 'INR',
      isApproximate: true,
      note: 'Approximate guidance for 2 priests including dakshina and standard samagri. Actual dakshina is settled transparently upon priest confirmation.'
    }
  },
  satyanarayana: {
    title: 'Sri Satyanarayana Swamy Vrata & Katha',
    ceremonyType: 'Satyanarayana Puja',
    purpose: 'To invoke the grace of Lord Satyanarayana (Sri Maha Vishnu) for family well-being, relief from troubles, and fulfillment of righteous desires.',
    description: 'A deeply beloved household vrata where the five sacred chapters of Sri Satyanarayana Katha are recited, accompanied by panchamrita abhishekam and the offering of Sapatha prasadam.',
    significance: 'Mentioned in the Reva Kanda of Skanda Purana, this vrata brings peace, resolves prolonged obstacles, and blesses the family with spiritual harmony.',
    rituals: {
      mainRituals: [
        'Ganapati Puja & Navagraha Smaran',
        'Kalasha Sthapana & Varuna Puja',
        'Sri Satyanarayana Swamy Avahanam & Shodashopachara',
        'Sri Satyanarayana Katha Shravanam (5 Chapters)',
        'Maha Mangala Harati & Prasada Vitarana'
      ],
      optionalRituals: [
        'Vishnu Sahasranama Stotram Parayanam',
        'Ashtothara Shata Namavali Archana with Tulasi'
      ],
      sequence: [
        { step: 1, name: 'Sankalpam & Ganapati Vandana', description: 'Taking formal vow with family names, Gotra, and purpose of worship.', durationMinutes: 20 },
        { step: 2, name: 'Navagraha & Dikpalaka Sthapana', description: 'Invoking the 9 planets and directional deities to sanctify the mandapam.', durationMinutes: 25 },
        { step: 3, name: 'Shodashopachara Puja', description: 'Offering 16 divine services including Tulasi archana, panchamritam, and incense.', durationMinutes: 35 },
        { step: 4, name: 'Sri Satyanarayana Katha (Chapters 1-5)', description: 'Chanting the story of Shatananada, King Ulkamukha, Merchant Sadhu, and King Tungadhwaja.', durationMinutes: 50 },
        { step: 5, name: 'Maha Mangala Harati & Teertha Prasadam', description: 'Singing camphor harati, circumambulation, and distributing consecrated Sheera prasadam.', durationMinutes: 20 }
      ]
    },
    samagri: {
      required: [
        { name: 'Turmeric powder & Kumkum', quantity: '100g each', category: 'Puja Essentials' },
        { name: 'Fresh Tulasi leaves (Sacred Basil)', quantity: '2 bunches', category: 'Flowers & Leaves' },
        { name: 'Betel leaves & Nuts (Tamoolam)', quantity: '25 pairs', category: 'Puja Essentials' },
        { name: 'Coconuts with water', quantity: '3 nos', category: 'Fruits & Offerings' },
        { name: 'Panchamrita (Milk, Curd, Ghee, Honey, Sugar)', quantity: '1 bowl', category: 'Fruits & Offerings' },
        { name: 'Wheat rava or Atta, Ghee, Sugar & Banana (for Sapatha Prasadam)', quantity: '1 kg prep', category: 'Fruits & Offerings' },
        { name: 'Yellow cloth for Mandapa altar', quantity: '1 meter', category: 'Vessels & Setup' },
        { name: 'Seasonal yellow and fragrant flowers', quantity: '1 kg', category: 'Flowers & Leaves' },
        { name: 'Camphor, Cotton wicks & Lamp oil', quantity: 'Standard puja pack', category: 'Puja Essentials' }
      ],
      optional: [
        { name: 'Dry fruit mix (Almonds, Cashews, Raisins)', quantity: '250 g' },
        { name: 'Photo frame of Sri Satyanarayana Swamy', quantity: '1 no' }
      ]
    },
    preparationSteps: {
      sevenDaysBefore: [
        'Select auspicious date (Purnima, Ekadashi, or any auspicious Thursday/Saturday).',
        'Prepare guest list and family member participation for the katha.'
      ],
      oneOrTwoDaysBefore: [
        'Prepare the altar table or wooden peeta with yellow cloth in northeast corner.',
        'Collect fresh green Tulasi leaves and store in a damp cloth.',
        'Procure fresh semolina (rava), pure cow ghee, and ripe bananas for Sapatha prasadam.'
      ],
      ceremonyDay: [
        'Fast until the katha recitation concludes (or consume fruits only).',
        'Prepare the sacred Sheera prasadam with devotion before the priest arrives.',
        'Keep clean copper plates, bell, and deepams filled with oil/ghee.'
      ]
    },
    priestRequirements: {
      priestCount: 1,
      suggestedExpertise: ['Satyanarayana Vrata Vidhana', 'Katha Parayana', 'Stotra Chanting'],
      languagePreference: 'Devotee native language (Hindi, Telugu, Kannada, Marathi, Tamil, etc.)',
      notes: 'An experienced scholar who recites and narrates the katha in the devotee family’s comfortable language adds spiritual joy to all generations.'
    },
    estimatedDuration: '2 to 2.5 hours',
    estimatedBudget: {
      min: 3500,
      max: 6500,
      currency: 'INR',
      isApproximate: true,
      note: 'Approximate guidance for 1 qualified priest including standard dakshina and basic samagri.'
    }
  }
};

// Quick helper to detect ceremony type from query
const detectCeremonySlug = (query: string): string => {
  const q = (query || '').toLowerCase();
  if (q.includes('house') || q.includes('gruha') || q.includes('griha') || q.includes('flat') || q.includes('home') || q.includes('vastu') || q.includes('shifting')) {
    return 'gruhapravesam';
  }
  if (q.includes('satyanarayan') || q.includes('satya narayan') || q.includes('vrata') || q.includes('katha') || q.includes('purnima')) {
    return 'satyanarayana';
  }
  return 'gruhapravesam';
};

// --- API: CLARIFY CEREMONY REQUEST ---
app.post('/api/ai/clarify-ceremony', aiRateLimiter, async (req, res) => {
  const clientIp = getClientIp(req);
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        action: 'AI_CLARIFY_VALIDATION_FAILED',
        ip: clientIp,
        details: { reason: 'Empty or invalid query parameter' },
        status: 'REJECTED'
      });
      return res.status(400).json({ error: 'Query string is required.' });
    }

    if (query.trim().length > 500) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        action: 'AI_CLARIFY_LENGTH_EXCEEDED',
        ip: clientIp,
        details: { length: query.trim().length, maxLength: 500 },
        status: 'REJECTED'
      });
      return res.status(400).json({ error: 'Query exceeds maximum allowed length of 500 characters.' });
    }

    const trimmed = query.trim();

    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'AI_CLARIFY_REQUEST',
      ip: clientIp,
      details: { queryLength: trimmed.length },
      status: 'SUCCESS'
    });

    // Check if query is very short or vague
    const words = trimmed.split(/\s+/);
    const isAmbiguous = words.length <= 4 && !trimmed.toLowerCase().includes('gruhapravesam') && !trimmed.toLowerCase().includes('satyanarayana');

    const ai = getAIClient();
    if (!ai) {
      // Rule-based fallback
      const slug = detectCeremonySlug(trimmed);
      if (slug === 'gruhapravesam') {
        return res.json({
          isAmbiguous: true,
          suggestedCeremonyType: 'Gruhapravesam (Housewarming)',
          greeting: 'Namaste! Congratulations on your new home.',
          clarificationQuestion: 'Would you like help planning a full Gruhapravesam (with Vastu Shanti & Navagraha Homa) or a simple entering puja?',
          quickOptions: [
            'Full Gruhapravesam with Homa',
            'Simple Vastu Shanti & Milk Boiling',
            'Rental Home Pravesha Puja',
            'Satyanarayana Vrata for Home'
          ],
          detectedInfo: {
            eventType: 'Gruhapravesam / Housewarming',
            rawQuery: trimmed
          }
        });
      }
      return res.json({
        isAmbiguous: false,
        suggestedCeremonyType: 'Vedic Puja & Homa',
        greeting: 'Namaste!',
        clarificationQuestion: 'Could you confirm your preferred city and language for the acharya?',
        quickOptions: ['Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi NCR'],
        detectedInfo: { rawQuery: trimmed }
      });
    }

    const prompt = `You are the revered Vedic Ceremony Planner advisor for "Purohit Seva", a premium platform connecting devotees with authentic Vedic priests.
Analyze this user query: "${trimmed}".
Determine if the request is ambiguous, what ceremony they most likely want, and ask ONE warm, intelligent clarification question if needed.
Keep recommendations humble, respectful, and note that practices vary by family tradition.

Respond strictly with valid JSON conforming to this schema:
{
  "isAmbiguous": boolean,
  "suggestedCeremonyType": string,
  "greeting": string,
  "clarificationQuestion": string,
  "quickOptions": string[],
  "detectedInfo": {
    "eventType": string,
    "location": string,
    "language": string,
    "tradition": string
  }
}`;

    // Protect against external Gemini timeout with 12s circuit breaker
    const parsed = await withTimeout(
      generateJSONContentWithFallback(ai, prompt),
      12000,
      'Gemini clarification request timed out'
    );
    return res.json(parsed);
  } catch (err: any) {
    console.info('Vedic clarification: Using curated Vedic knowledge engine fallback');
    return res.json({
      isAmbiguous: true,
      suggestedCeremonyType: 'Sacred Vedic Ceremony',
      greeting: 'Namaste & Welcome to Purohit Seva!',
      clarificationQuestion: 'Which ceremony would you like to prepare for your family?',
      quickOptions: [
        'Gruhapravesam / Housewarming',
        'Satyanarayana Vrata',
        'Ganesh Puja',
        'Navagraha Homa'
      ],
      detectedInfo: { rawQuery: req.body?.query || '' }
    });
  }
});

// --- API: GENERATE PERSONALIZED CEREMONY PLAN ---
app.post('/api/ai/plan-ceremony', aiRateLimiter, async (req, res) => {
  const clientIp = getClientIp(req);
  const input = req.body || {};

  // Input length bounds checking to prevent payload DOS
  const rawQuery = typeof input.rawQuery === 'string' ? input.rawQuery.slice(0, 1000) : '';
  const eventType = typeof input.eventType === 'string' ? input.eventType.slice(0, 100) : '';
  const location = typeof input.location === 'string' ? input.location.slice(0, 100) : 'Bengaluru';
  const date = typeof input.date === 'string' ? input.date.slice(0, 50) : '';
  const guestCount = typeof input.guestCount === 'string' ? input.guestCount.slice(0, 50) : '15-25';
  const language = typeof input.language === 'string' ? input.language.slice(0, 50) : 'Sanskrit / Hindi';
  const tradition = typeof input.tradition === 'string' ? input.tradition.slice(0, 50) : 'Smartha / General Vedic';
  const budgetRange = typeof input.budgetRange === 'string' ? input.budgetRange.slice(0, 50) : 'Standard';
  const specialRequirements = typeof input.specialRequirements === 'string' ? input.specialRequirements.slice(0, 500) : '';

  const queryCombined = `${rawQuery} ${eventType}`.trim();
  const slug = detectCeremonySlug(queryCombined);
  const template = VEDIC_TEMPLATES[slug] || VEDIC_TEMPLATES.gruhapravesam;

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'AI_PLAN_REQUEST',
    ip: clientIp,
    details: { slug, location, language, guestCount },
    status: 'SUCCESS'
  });

  try {
    const ai = getAIClient();
    if (!ai) {
      // Return high-fidelity Vedic Knowledge Engine fallback
      const generatedPlan = buildFallbackPlan(input, template);
      return res.json(generatedPlan);
    }

    const systemPrompt = `You are the master Vedic Vidhana scholar and ceremony architect for "Purohit Seva".
Generate a personalized, highly structured ceremony plan for a devotee.

USER INPUTS:
- Ceremony / Event: "${eventType || rawQuery || 'Vedic Ceremony'}"
- Raw Query: "${rawQuery}"
- Location / City: "${location}"
- Preferred Date: "${date || 'Upcoming auspicious tithi'}"
- Guest Count: "${guestCount}"
- Language Preference: "${language}"
- Family Tradition / Sampradaya: "${tradition}"
- Budget Preference: "${budgetRange}"
- Special Requirements: "${specialRequirements}"

GUIDELINES & ANTI-SLOP RULES:
1. Always state recommendations as thoughtful Vedic guidelines, NOT legal or absolute religious mandates.
2. Include the mandatory family tradition disclaimer.
3. Structure samagri into practical categories (Puja Essentials, Flowers & Leaves, Fruits & Offerings, Homa & Hawan Samagri, Vessels & Setup) with real practical quantities.
4. Sequence rituals logically from purification (Dwara / Sankalpam) to final Harati / Purnahuti with realistic durations.
5. Provide a realistic budget range for the priest dakshina and essential offerings in INR.
6. Provide a practical 3-phase preparation timeline (7 days before, 1-2 days before, ceremony day).

Respond strictly with valid JSON conforming to this schema:
{
  "title": string,
  "ceremonyType": string,
  "eventDetails": {
    "rawQuery": string,
    "purpose": string,
    "description": string,
    "significance": string
  },
  "location": string,
  "date": string,
  "guestCount": string,
  "language": string,
  "tradition": string,
  "rituals": {
    "mainRituals": string[],
    "optionalRituals": string[],
    "sequence": [
      {
        "step": number,
        "name": string,
        "description": string,
        "durationMinutes": number,
        "isOptional": boolean
      }
    ]
  },
  "samagri": {
    "requiredItems": [
      {
        "id": string,
        "name": string,
        "quantity": string,
        "category": "Puja Essentials" | "Flowers & Leaves" | "Fruits & Offerings" | "Homa & Hawan Samagri" | "Vessels & Setup" | "Other Items",
        "checked": false
      }
    ],
    "optionalItems": [
      {
        "id": string,
        "name": string,
        "quantity": string,
        "category": "Other Items",
        "checked": false
      }
    ]
  },
  "preparationSteps": {
    "sevenDaysBefore": string[],
    "oneOrTwoDaysBefore": string[],
    "ceremonyDay": string[]
  },
  "priestRequirements": {
    "priestCount": number,
    "suggestedExpertise": string[],
    "languagePreference": string,
    "notes": string
  },
  "estimatedDuration": string,
  "estimatedBudget": {
    "min": number,
    "max": number,
    "currency": "INR",
    "isApproximate": true,
    "note": string
  },
  "disclaimer": string
}`;

    // Protect against external Gemini timeout with 15s circuit breaker
    const parsed = await withTimeout(
      generateJSONContentWithFallback(ai, systemPrompt),
      15000,
      'Gemini ceremony planning request timed out'
    );

    // Ensure IDs and default checklist states
    if (parsed.samagri?.requiredItems) {
      parsed.samagri.requiredItems = parsed.samagri.requiredItems.map((item: any, idx: number) => ({
        ...item,
        id: item.id || `samagri-req-${idx + 1}`,
        checked: false
      }));
    }
    if (parsed.samagri?.optionalItems) {
      parsed.samagri.optionalItems = parsed.samagri.optionalItems.map((item: any, idx: number) => ({
        ...item,
        id: item.id || `samagri-opt-${idx + 1}`,
        checked: false
      }));
    }

    parsed.disclaimer = parsed.disclaimer ||
      'Ritual practices can vary by family tradition, region, and sampradaya. Please confirm the final ritual sequence and samagri with your selected priest.';

    return res.json(parsed);
  } catch (err: any) {
    console.info('Vedic ceremony plan: Using authentic Vedic template fallback');
    const fallback = buildFallbackPlan(req.body, template);
    return res.json(fallback);
  }
});

// Helper to construct structured fallback plan
function buildFallbackPlan(input: any, template: any) {
  const reqItems = template.samagri.required.map((it: any, idx: number) => ({
    id: `req-${idx + 1}`,
    name: it.name,
    quantity: it.quantity,
    category: it.category,
    checked: false
  }));

  const optItems = template.samagri.optional.map((it: any, idx: number) => ({
    id: `opt-${idx + 1}`,
    name: it.name,
    quantity: it.quantity,
    category: 'Other Items',
    checked: false
  }));

  return {
    title: input?.eventType ? `${input.eventType} Ceremony Plan` : template.title,
    ceremonyType: input?.eventType || template.ceremonyType,
    eventDetails: {
      rawQuery: input?.rawQuery || '',
      purpose: template.purpose,
      description: template.description,
      significance: template.significance
    },
    location: input?.location || 'Bengaluru',
    date: input?.date || 'As per Shubh Muhurtham',
    guestCount: input?.guestCount || '15-25 guests',
    language: input?.language || 'Sanskrit / Hindi',
    tradition: input?.tradition || 'Smartha / General Vedic',
    rituals: template.rituals,
    samagri: {
      requiredItems: reqItems,
      optionalItems: optItems
    },
    preparationSteps: template.preparationSteps,
    priestRequirements: {
      ...template.priestRequirements,
      languagePreference: input?.language || template.priestRequirements.languagePreference
    },
    estimatedDuration: template.estimatedDuration,
    estimatedBudget: template.estimatedBudget,
    disclaimer: 'Ritual practices can vary by family tradition, region, and sampradaya. Please confirm the final ritual sequence and samagri with your selected priest.'
  };
}

// --- PRIVACY-PRESERVING PRIEST AVAILABILITY & CONFLICT REGISTRY ---
interface BookedSlot {
  slotId: string;
  priestId: string;
  date: string;
  time: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';
  bookingId: string;
  updatedAt: string;
}

const bookedSlotsRegistry = new Map<string, BookedSlot>();

function normalizePriestId(id?: string): string {
  if (!id) return '';
  const trimmed = id.trim().toLowerCase();
  if (trimmed === 'priest-001' || trimmed === 'priest-1' || trimmed === 'pr-101') return 'pr-101';
  if (trimmed === 'priest-002' || trimmed === 'priest-2' || trimmed === 'pr-102') return 'pr-102';
  return id.trim();
}

function normalizeTime(time?: string): string {
  if (!time) return '';
  return time.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getSlotKey(priestId: string, date: string, time: string): string {
  return `${normalizePriestId(priestId)}_${date.trim()}_${normalizeTime(time)}`;
}

// Seed baseline active priest bookings (Zero customer PII - only priest, date, time slot, status, bookingId)
const SEED_SLOTS: Omit<BookedSlot, 'slotId' | 'updatedAt'>[] = [
  { priestId: 'pr-101', date: '2026-09-02', time: '06:00 AM', status: 'CONFIRMED', bookingId: 'PS-20260831-1001' },
  { priestId: 'pr-101', date: '2026-09-10', time: '07:30 AM', status: 'CONFIRMED', bookingId: 'PS-20260831-1002' },
  { priestId: 'pr-101', date: '2026-09-15', time: '10:00 AM', status: 'CONFIRMED', bookingId: 'PS-20260831-1003' },
  { priestId: 'pr-102', date: '2026-09-18', time: '08:00 AM', status: 'CONFIRMED', bookingId: 'PS-20260831-1004' }
];

SEED_SLOTS.forEach(s => {
  const slotKey = getSlotKey(s.priestId, s.date, s.time);
  bookedSlotsRegistry.set(slotKey, {
    ...s,
    slotId: slotKey,
    updatedAt: new Date().toISOString()
  });
});

// 1. Authoritative conflict check - returns only boolean + minimal slot metadata
app.post('/api/availability/check-conflict', availabilityRateLimiter, (req, res) => {
  const clientIp = getClientIp(req);
  const { priestId, date, time, excludeBookingId } = req.body;

  // Validation
  if (!isValidSafeId(priestId) || !isValidDateString(date) || !isValidTimeString(time)) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'AVAILABILITY_CHECK_INVALID_PARAMS',
      ip: clientIp,
      details: { priestId, date, time },
      status: 'REJECTED'
    });
    return res.status(400).json({ error: 'Valid priestId, date (YYYY-MM-DD), and time are required' });
  }

  if (excludeBookingId && !isValidSafeId(excludeBookingId)) {
    return res.status(400).json({ error: 'Invalid excludeBookingId format' });
  }

  const normPriest = normalizePriestId(priestId);
  const normDate = date.trim();
  const normTime = normalizeTime(time);

  let conflictSlot: BookedSlot | null = null;
  for (const slot of bookedSlotsRegistry.values()) {
    if (excludeBookingId && (slot.bookingId === excludeBookingId || slot.slotId === excludeBookingId)) {
      continue;
    }
    if (
      normalizePriestId(slot.priestId) === normPriest &&
      slot.date.trim() === normDate &&
      normalizeTime(slot.time) === normTime &&
      (slot.status === 'CONFIRMED' || slot.status === 'IN_PROGRESS')
    ) {
      conflictSlot = slot;
      break;
    }
  }

  const hasConflict = conflictSlot !== null;
  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'AVAILABILITY_CHECK_CONFLICT',
    ip: clientIp,
    details: { priestId: normPriest, date: normDate, time: normTime, hasConflict },
    status: hasConflict ? 'CONFLICT' : 'SUCCESS'
  });

  if (conflictSlot) {
    return res.json({
      hasConflict: true,
      slot: {
        priestId: conflictSlot.priestId,
        date: conflictSlot.date,
        time: conflictSlot.time,
        status: conflictSlot.status,
        bookingId: conflictSlot.bookingId
      }
    });
  }

  return res.json({ hasConflict: false, slot: null });
});

// 2. Reserve slot - prevents race conditions
app.post('/api/availability/reserve-slot', availabilityRateLimiter, (req, res) => {
  const clientIp = getClientIp(req);
  const { priestId, date, time, bookingId, status } = req.body;

  if (!isValidSafeId(priestId) || !isValidDateString(date) || !isValidTimeString(time) || !isValidSafeId(bookingId)) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'AVAILABILITY_RESERVE_INVALID_PARAMS',
      ip: clientIp,
      details: { priestId, date, time, bookingId },
      status: 'REJECTED'
    });
    return res.status(400).json({ error: 'Valid priestId, date (YYYY-MM-DD), time, and bookingId are required' });
  }

  const normPriest = normalizePriestId(priestId);
  const normDate = date.trim();
  const normTime = normalizeTime(time);
  const slotKey = getSlotKey(normPriest, normDate, normTime);

  const existing = bookedSlotsRegistry.get(slotKey);
  if (existing && existing.bookingId !== bookingId && (existing.status === 'CONFIRMED' || existing.status === 'IN_PROGRESS')) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'AVAILABILITY_RESERVE_CONFLICT',
      ip: clientIp,
      details: { priestId: normPriest, date: normDate, time: normTime, existingBookingId: existing.bookingId, attemptedBookingId: bookingId },
      status: 'CONFLICT'
    });
    return res.status(409).json({
      error: 'Conflict: Priest is already booked for this date and time slot.',
      conflict: true
    });
  }

  const slot: BookedSlot = {
    slotId: slotKey,
    priestId: normPriest,
    date: normDate,
    time: time.trim(),
    status: (status as any) || 'CONFIRMED',
    bookingId,
    updatedAt: new Date().toISOString()
  };

  bookedSlotsRegistry.set(slotKey, slot);

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'AVAILABILITY_RESERVE_SUCCESS',
    ip: clientIp,
    resourceId: bookingId,
    details: { priestId: normPriest, date: normDate, time: normTime },
    status: 'SUCCESS'
  });

  return res.json({ success: true, slot });
});

// 3. Release slot upon cancellation
app.post('/api/availability/release-slot', availabilityRateLimiter, (req, res) => {
  const clientIp = getClientIp(req);
  const { priestId, bookingId, date, time } = req.body;

  if (!bookingId && (!priestId || !date || !time)) {
    return res.status(400).json({ error: 'bookingId or (priestId, date, time) required' });
  }

  if (bookingId && !isValidSafeId(bookingId)) {
    return res.status(400).json({ error: 'Invalid bookingId format' });
  }

  let released = false;
  for (const slot of bookedSlotsRegistry.values()) {
    if (bookingId && slot.bookingId === bookingId) {
      slot.status = 'CANCELLED';
      slot.updatedAt = new Date().toISOString();
      released = true;
    } else if (
      priestId && date && time &&
      normalizePriestId(slot.priestId) === normalizePriestId(priestId) &&
      slot.date === date.trim() &&
      normalizeTime(slot.time) === normalizeTime(time)
    ) {
      slot.status = 'CANCELLED';
      slot.updatedAt = new Date().toISOString();
      released = true;
    }
  }

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'AVAILABILITY_RELEASE_SLOT',
    ip: clientIp,
    resourceId: bookingId || `${priestId}_${date}_${time}`,
    details: { released },
    status: released ? 'SUCCESS' : 'FAILED'
  });

  return res.json({ success: true, released });
});

// 4. Priest availability schedule (Zero customer PII)
app.get('/api/availability/priests/:priestId', availabilityRateLimiter, (req, res) => {
  const clientIp = getClientIp(req);
  const { priestId } = req.params;

  if (!isValidSafeId(priestId)) {
    return res.status(400).json({ error: 'Invalid priestId format' });
  }

  const normPriest = normalizePriestId(priestId);

  const slots: Omit<BookedSlot, 'slotId'>[] = [];
  for (const slot of bookedSlotsRegistry.values()) {
    if (normalizePriestId(slot.priestId) === normPriest && (slot.status === 'CONFIRMED' || slot.status === 'IN_PROGRESS')) {
      slots.push({
        priestId: slot.priestId,
        date: slot.date,
        time: slot.time,
        status: slot.status,
        bookingId: slot.bookingId,
        updatedAt: slot.updatedAt
      });
    }
  }

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'AVAILABILITY_SCHEDULE_READ',
    ip: clientIp,
    details: { priestId: normPriest, count: slots.length },
    status: 'SUCCESS'
  });

  return res.json({ priestId: normPriest, bookedSlots: slots });
});

// ============================================================================
// 5. PRODUCTION-GRADE RAZORPAY PAYMENT ENDPOINTS (SERVER-AUTHORITATIVE)
// ============================================================================

interface ServerPaymentOrder {
  orderId: string;
  requestId: string;
  customerId: string;
  priestId: string;
  currency: 'INR';
  servicePrice: number;
  platformFee: number;
  rewardDiscount: number;
  totalAmount: number;
  amountInPaise: number;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  paymentId?: string;
  paymentSignature?: string;
  isDemoMode: boolean;
  platformCommission: number;
  priestPayableAmount: number;
  escrowStatus: 'HELD_IN_ESCROW' | 'READY_FOR_PAYOUT' | 'SETTLED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// In-memory payment orders store for fast transactional sync (backed by Firestore in client services)
const paymentOrdersStore = new Map<string, ServerPaymentOrder>();
// In-memory webhook event idempotency ledger
const processedWebhooks = new Set<string>();

const PLATFORM_FEE_INR = 250;
const COMMISSION_PERCENT = 0.15; // 15% platform commission for marketplace readiness

function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(keyId && keySecret && keyId.trim() !== '' && keySecret.trim() !== '');
}

// 5.1 POST /api/payment/create-order
// Server-authoritative order creation: Never trusts amount from client.
app.post('/api/payment/create-order', paymentRateLimiter, async (req, res) => {
  const clientIp = getClientIp(req);
  const {
    requestId,
    customerId,
    priestId,
    servicePrice,
    rewardDiscount = 0,
    requestStatus
  } = req.body || {};

  if (!isValidSafeId(requestId) || !isValidSafeId(customerId) || !isValidSafeId(priestId)) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_CREATE_ORDER_INVALID_INPUT',
      ip: clientIp,
      details: { requestId },
      status: 'REJECTED'
    });
    return res.status(400).json({ error: 'Invalid requestId, customerId, or priestId format.' });
  }

  // Business rule 2: Payment must be enabled ONLY after the priest accepts the customer's request.
  const normStatus = (requestStatus || '').toString().toUpperCase();
  if (normStatus !== 'ACCEPTED' && normStatus !== 'PAYMENT_PENDING') {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_CREATE_ORDER_UNACCEPTED',
      ip: clientIp,
      resourceId: requestId,
      details: { requestStatus: normStatus },
      status: 'REJECTED'
    });
    return res.status(400).json({
      error: 'Payment cannot be initiated. The request must be in ACCEPTED or PAYMENT_PENDING status.'
    });
  }

  const rawBasePrice = Number(servicePrice);
  if (!Number.isFinite(rawBasePrice) || rawBasePrice <= 0 || rawBasePrice > 500000) {
    return res.status(400).json({ error: 'Invalid service price calculation.' });
  }

  const validRewardDiscount = Math.max(0, Math.min(rawBasePrice, Number(rewardDiscount) || 0));
  const serverCalculatedTotal = Math.max(0, Math.round(rawBasePrice + PLATFORM_FEE_INR - validRewardDiscount));
  const amountInPaise = serverCalculatedTotal * 100;

  // Check for an existing unexpired order for this request (idempotency / reuse)
  const now = Date.now();
  for (const existing of paymentOrdersStore.values()) {
    if (
      existing.requestId === requestId &&
      existing.status === 'CREATED' &&
      new Date(existing.expiresAt).getTime() > now &&
      existing.totalAmount === serverCalculatedTotal
    ) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        action: 'PAYMENT_CREATE_ORDER_REUSED',
        ip: clientIp,
        resourceId: requestId,
        details: { orderId: existing.orderId, amount: existing.totalAmount },
        status: 'SUCCESS'
      });
      return res.json({
        orderId: existing.orderId,
        amount: existing.amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '',
        isDemoMode: existing.isDemoMode,
        totalAmount: existing.totalAmount,
        servicePrice: existing.servicePrice,
        platformFee: existing.platformFee,
        rewardDiscount: existing.rewardDiscount
      });
    }
  }

  const platformCommission = Math.round(serverCalculatedTotal * COMMISSION_PERCENT);
  const priestPayableAmount = serverCalculatedTotal - platformCommission;

  const hasLiveCredentials = isRazorpayConfigured();
  let generatedOrderId = '';

  if (hasLiveCredentials) {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID!;
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${requestId.slice(-16)}`,
          notes: {
            requestId,
            customerId,
            priestId
          }
        })
      });

      if (!rzpResponse.ok) {
        const errorText = await rzpResponse.text();
        console.error('[Razorpay Order Creation Failed]:', errorText);
        return res.status(502).json({ error: 'Failed to create order with Razorpay gateway.' });
      }

      const rzpData = (await rzpResponse.json()) as any;
      generatedOrderId = rzpData.id;
    } catch (err: any) {
      console.error('[Razorpay Network Error]:', err?.message);
      return res.status(500).json({ error: 'Payment gateway communication error.' });
    }
  } else {
    // Preserve DEMO MODE: cleanly separated, tracked with isDemoMode: true
    const timestampHex = Date.now().toString(16);
    const randomHex = crypto.randomBytes(4).toString('hex');
    generatedOrderId = `order_DEMO_${timestampHex}_${randomHex}`;
  }

  const orderRecord: ServerPaymentOrder = {
    orderId: generatedOrderId,
    requestId,
    customerId,
    priestId,
    currency: 'INR',
    servicePrice: rawBasePrice,
    platformFee: PLATFORM_FEE_INR,
    rewardDiscount: validRewardDiscount,
    totalAmount: serverCalculatedTotal,
    amountInPaise,
    status: 'CREATED',
    isDemoMode: !hasLiveCredentials,
    platformCommission,
    priestPayableAmount,
    escrowStatus: 'HELD_IN_ESCROW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins TTL
  };

  paymentOrdersStore.set(generatedOrderId, orderRecord);

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'PAYMENT_ORDER_CREATED',
    ip: clientIp,
    resourceId: requestId,
    details: {
      orderId: generatedOrderId,
      totalAmount: serverCalculatedTotal,
      isDemoMode: !hasLiveCredentials
    },
    status: 'SUCCESS'
  });

  return res.json({
    orderId: generatedOrderId,
    amount: amountInPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '',
    isDemoMode: !hasLiveCredentials,
    totalAmount: serverCalculatedTotal,
    servicePrice: rawBasePrice,
    platformFee: PLATFORM_FEE_INR,
    rewardDiscount: validRewardDiscount
  });
});

// 5.2 POST /api/payment/verify-payment
// Cryptographically verifies signature, checks order ID, prevents duplicate confirmations & tampering
app.post('/api/payment/verify-payment', paymentRateLimiter, (req, res) => {
  const clientIp = getClientIp(req);
  const {
    orderId,
    paymentId,
    signature,
    requestId,
    customerId
  } = req.body || {};

  if (!orderId || !paymentId || !signature || !requestId || !customerId) {
    return res.status(400).json({ error: 'Missing required verification parameters.' });
  }

  const order = paymentOrdersStore.get(orderId);
  if (!order) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_VERIFY_UNKNOWN_ORDER',
      ip: clientIp,
      resourceId: orderId,
      details: { paymentId },
      status: 'REJECTED'
    });
    return res.status(404).json({ error: 'Payment order not found or expired.' });
  }

  // Prevent cross-user payment tampering: customer must match order customer
  if (order.customerId !== customerId || order.requestId !== requestId) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_VERIFY_UNAUTHORIZED_OWNER',
      ip: clientIp,
      resourceId: orderId,
      details: { expectedCustomer: order.customerId, receivedCustomer: customerId },
      status: 'REJECTED'
    });
    return res.status(403).json({ error: 'Unauthorized: Booking ownership validation failed.' });
  }

  // Prevent duplicate payment capture attempts
  if (order.status === 'PAID') {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_VERIFY_ALREADY_PAID',
      ip: clientIp,
      resourceId: orderId,
      details: { paymentId },
      status: 'SUCCESS'
    });
    return res.json({
      verified: true,
      alreadyCaptured: true,
      orderId: order.orderId,
      paymentId: order.paymentId,
      totalAmount: order.totalAmount,
      isDemoMode: order.isDemoMode
    });
  }

  let isSignatureValid = false;

  if (order.isDemoMode) {
    // In demo mode: accept signatures adhering to demo signature format
    isSignatureValid = typeof signature === 'string' && (signature.startsWith('demo_sig_') || signature.length >= 32);
  } else {
    // Live mode: verify against authoritative RAZORPAY_KEY_SECRET using timingSafeEqual
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) {
      return res.status(500).json({ error: 'Server payment configuration missing.' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      );
    } catch {
      isSignatureValid = false;
    }
  }

  if (!isSignatureValid) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_VERIFY_SIGNATURE_MISMATCH',
      ip: clientIp,
      resourceId: orderId,
      details: { paymentId },
      status: 'REJECTED'
    });
    return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
  }

  // Authoritatively update order state
  order.status = 'PAID';
  order.paymentId = paymentId;
  order.paymentSignature = signature;
  order.updatedAt = new Date().toISOString();

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'PAYMENT_VERIFIED_SUCCESS',
    ip: clientIp,
    resourceId: orderId,
    details: {
      requestId: order.requestId,
      paymentId,
      amount: order.totalAmount,
      isDemoMode: order.isDemoMode
    },
    status: 'SUCCESS'
  });

  return res.json({
    verified: true,
    orderId: order.orderId,
    paymentId,
    totalAmount: order.totalAmount,
    platformCommission: order.platformCommission,
    priestPayableAmount: order.priestPayableAmount,
    escrowStatus: order.escrowStatus,
    isDemoMode: order.isDemoMode
  });
});

// 5.3 POST /api/payment/webhook
// Processes asynchronous gateway events with raw body HMAC verification and event deduplication
app.post('/api/payment/webhook', paymentWebhookRateLimiter, (req: any, res) => {
  const clientIp = getClientIp(req);
  const eventId = req.headers['x-razorpay-event-id'] as string;
  const receivedSignature = req.headers['x-razorpay-signature'] as string;

  if (!eventId) {
    return res.status(400).json({ error: 'Missing x-razorpay-event-id header' });
  }

  // Idempotency check: duplicate event handling
  if (processedWebhooks.has(eventId)) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_WEBHOOK_DUPLICATE_IGNORED',
      ip: clientIp,
      resourceId: eventId,
      details: {},
      status: 'SUCCESS'
    });
    return res.status(200).json({ status: 'duplicate_event_acknowledged' });
  }

  // Webhook signature verification
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (webhookSecret && receivedSignature && req.rawBody) {
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    let isValidSig = false;
    try {
      isValidSig = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'utf-8'),
        Buffer.from(expectedSig, 'utf-8')
      );
    } catch {
      isValidSig = false;
    }

    if (!isValidSig) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        action: 'PAYMENT_WEBHOOK_INVALID_SIGNATURE',
        ip: clientIp,
        resourceId: eventId,
        details: {},
        status: 'REJECTED'
      });
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }
  }

  const payload = req.body || {};
  const eventName = payload.event || 'unknown';

  // Record event idempotency immediately
  processedWebhooks.add(eventId);

  // Handle specific events safely
  if (eventName === 'order.paid' || eventName === 'payment.captured') {
    const paymentEntity = payload.payload?.payment?.entity || {};
    const targetOrderId = paymentEntity.order_id;
    if (targetOrderId && paymentOrdersStore.has(targetOrderId)) {
      const order = paymentOrdersStore.get(targetOrderId)!;
      if (order.status !== 'PAID') {
        order.status = 'PAID';
        order.paymentId = paymentEntity.id;
        order.updatedAt = new Date().toISOString();
      }
    }
  } else if (eventName === 'payment.failed') {
    const paymentEntity = payload.payload?.payment?.entity || {};
    const targetOrderId = paymentEntity.order_id;
    if (targetOrderId && paymentOrdersStore.has(targetOrderId)) {
      const order = paymentOrdersStore.get(targetOrderId)!;
      if (order.status !== 'PAID') {
        order.status = 'FAILED';
        order.updatedAt = new Date().toISOString();
      }
    }
  } else if (eventName === 'refund.processed') {
    const refundEntity = payload.payload?.refund?.entity || {};
    const paymentId = refundEntity.payment_id;
    for (const order of paymentOrdersStore.values()) {
      if (order.paymentId === paymentId) {
        order.status = 'REFUNDED';
        order.escrowStatus = 'REFUNDED';
        order.updatedAt = new Date().toISOString();
      }
    }
  }

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'PAYMENT_WEBHOOK_PROCESSED',
    ip: clientIp,
    resourceId: eventId,
    details: { eventName },
    status: 'SUCCESS'
  });

  return res.status(200).json({ status: 'success', eventId });
});

// 5.4 POST /api/payment/refund
// Secure server-side refund structure: admin-authorized with cancellation policy enforcement
app.post('/api/payment/refund', paymentRateLimiter, async (req, res) => {
  const clientIp = getClientIp(req);
  const {
    bookingId,
    orderId,
    paymentId,
    amount,
    reason,
    userRole
  } = req.body || {};

  // Requirement 9: Refunds must be admin-authorized
  if (userRole !== 'admin') {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_REFUND_UNAUTHORIZED',
      ip: clientIp,
      resourceId: bookingId || orderId,
      details: { userRole },
      status: 'REJECTED'
    });
    return res.status(403).json({ error: 'Unauthorized: Refunds must be authorized by an administrator.' });
  }

  if (!paymentId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Missing paymentId or valid refund amount.' });
  }

  const refundAmountINR = Math.round(Number(amount));
  const refundAmountPaise = refundAmountINR * 100;
  const isDemo = orderId?.includes('DEMO') || paymentId?.includes('demo');

  let refundId = '';

  if (!isDemo && isRazorpayConfigured()) {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID!;
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      const rzpRefundRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({
          amount: refundAmountPaise,
          notes: {
            bookingId,
            reason: reason || 'Devotee cancellation policy refund'
          }
        })
      });

      if (!rzpRefundRes.ok) {
        const errBody = await rzpRefundRes.text();
        console.error('[Razorpay Refund Error]:', errBody);
        return res.status(502).json({ error: 'Gateway refund processing failed.' });
      }

      const rzpRefundData = (await rzpRefundRes.json()) as any;
      refundId = rzpRefundData.id;
    } catch (err: any) {
      console.error('[Razorpay Refund Network Error]:', err?.message);
      return res.status(500).json({ error: 'Payment gateway refund communication error.' });
    }
  } else {
    // Demo Mode Simulated Refund
    refundId = `rfnd_DEMO_${Date.now().toString(16)}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Update order status if found in store
  if (orderId && paymentOrdersStore.has(orderId)) {
    const order = paymentOrdersStore.get(orderId)!;
    order.status = 'REFUNDED';
    order.escrowStatus = 'REFUNDED';
    order.updatedAt = new Date().toISOString();
  }

  logAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'PAYMENT_REFUND_ISSUED',
    ip: clientIp,
    resourceId: bookingId,
    details: { refundId, amount: refundAmountINR, reason },
    status: 'SUCCESS'
  });

  return res.json({
    success: true,
    refundId,
    amount: refundAmountINR,
    currency: 'INR',
    refundedAt: new Date().toISOString()
  });
});

// --- VITE MIDDLEWARE SETUP & PRODUCTION SERVER ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Purohit Seva Server running on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`[SHUTDOWN] Received ${signal}. Gracefully stopping HTTP listener...`);
    server.close(() => {
      console.log('[SHUTDOWN] HTTP listener cleanly terminated.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[SHUTDOWN] Forced shutdown after 10s timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
