import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../../db';
import { turfs, slots } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Lazy initialization of Gemini client
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAiClient;
}

interface ParsedMatchRequest {
  city?: string;
  area?: string;
  sport?: 'football' | 'cricket' | 'all';
  maxPrice?: number;
  timeSlot?: string;
  keywords?: string[];
  replyMessage: string;
}

// Heuristic fallback parser when GEMINI_API_KEY is not configured
function ruleBasedMatchParser(prompt: string): ParsedMatchRequest {
  const p = prompt.toLowerCase();
  
  let sport: 'football' | 'cricket' | 'all' = 'all';
  if (p.includes('cricket') || p.includes('box cricket')) {
    sport = 'cricket';
  } else if (p.includes('football') || p.includes('futsal') || p.includes('soccer')) {
    sport = 'football';
  }

  let city = 'Dhaka';
  if (p.includes('chattogram') || p.includes('chittagong')) {
    city = 'Chattogram';
  } else if (p.includes('sylhet')) {
    city = 'Sylhet';
  }

  let area: string | undefined = undefined;
  const knownAreas = ['dhanmondi', 'bashundhara', 'uttara', 'gulshan', 'banani', 'mirpur', 'khilgaon', 'mohammadpur', 'agrabad', 'nasirabad'];
  for (const a of knownAreas) {
    if (p.includes(a)) {
      area = a.charAt(0).toUpperCase() + a.slice(1);
      break;
    }
  }

  // Extract price if present
  let maxPrice: number | undefined = undefined;
  const priceMatch = p.match(/(?:under|below|budget|max|tk|bdt|৳)?\s*(\d{4})/i);
  if (priceMatch && priceMatch[1]) {
    maxPrice = parseInt(priceMatch[1], 10);
  }

  const reply = `Analyzed your request for ${sport !== 'all' ? sport : 'sports'} arenas${area ? ` around ${area}` : ''}${maxPrice ? ` within BDT ${maxPrice.toLocaleString()}` : ''}. Here are the best live available turfs matching your squad.`;

  return {
    city,
    area,
    sport,
    maxPrice,
    replyMessage: reply,
  };
}

/**
 * POST /api/ai/match
 * Smart AI Matchmaker powered by Gemini 3.8 Flash
 */
router.post('/match', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Please provide a search prompt for the AI Matchmaker.' });
      return;
    }

    const client = getGeminiClient();
    let parsed: ParsedMatchRequest;

    if (client) {
      try {
        const systemInstruction = `You are TurfBD's AI Pitch Matchmaker for Bangladesh.
Extract intent from the user's natural language request for football or box cricket turfs.
Return valid JSON matching this schema:
{
  "city": "Dhaka" | "Chattogram" | "Sylhet",
  "area": string | null,
  "sport": "football" | "cricket" | "all",
  "maxPrice": number | null,
  "timeSlot": string | null,
  "replyMessage": string
}
Write an energetic, friendly 1-2 sentence response in 'replyMessage' explaining what you found for their team in Bangladesh.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `User search query: "${prompt}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim() || '';
        parsed = JSON.parse(text);
      } catch (geminiErr: any) {
        console.warn('Gemini API call fell back to local matcher:', geminiErr?.message || geminiErr);
        parsed = ruleBasedMatchParser(prompt);
      }
    } else {
      parsed = ruleBasedMatchParser(prompt);
    }

    // Fetch approved turfs from DB
    const allTurfs = await db.select().from(turfs).where(eq(turfs.verificationStatus, 'approved'));

    // Filter by parsed criteria
    let matched = allTurfs.filter((t) => {
      if (parsed.city && parsed.city !== 'all' && t.city.toLowerCase() !== parsed.city.toLowerCase()) {
        return false;
      }
      if (parsed.area && !t.address.toLowerCase().includes(parsed.area.toLowerCase())) {
        return false;
      }
      if (parsed.sport && parsed.sport !== 'all') {
        const sportsArray = (t.sportType as string[]) || [];
        if (!sportsArray.includes(parsed.sport)) {
          return false;
        }
      }
      if (parsed.maxPrice && t.pricePerHour > parsed.maxPrice) {
        return false;
      }
      return true;
    });

    // If filter too tight, fall back to broader list in same city
    if (matched.length === 0 && parsed.city) {
      matched = allTurfs.filter((t) => t.city.toLowerCase() === parsed.city?.toLowerCase());
    }
    if (matched.length === 0) {
      matched = allTurfs.slice(0, 3);
    }

    res.json({
      success: true,
      parsedIntent: parsed,
      recommendationsCount: matched.length,
      turfs: matched.map((t) => ({
        id: String(t.id),
        name: t.turfName,
        address: t.address,
        city: t.city,
        sports: t.sportType,
        hourlyRate: t.pricePerHour,
        mainImage: t.mainImage || (t.images && t.images[0]) || '/images/default_turf.jpg',
      })),
      aiSummary: parsed.replyMessage,
    });
  } catch (err: any) {
    console.error('AI match route error:', err);
    res.status(500).json({ error: 'Failed to process AI match request', message: err?.message });
  }
});

export default router;
