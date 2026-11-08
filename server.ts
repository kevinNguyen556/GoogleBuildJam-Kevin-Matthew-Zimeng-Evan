import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High payload limit for image base64 uploads
app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: AI Vision Tagging for photos
app.post('/api/gemini/tag-photo', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', existingTitle } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    if (!ai) {
      // Graceful fallback if API key is not configured in environment
      return res.json({
        tags: ['travel', 'memory', 'scenery'],
        suggestedTitle: existingTitle || 'Captured Moment',
        description: 'A cozy travel memory captured on camera.',
      });
    }

    // Strip data prefix if included
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: `Analyze this photograph for a cozy memory scrapbook and travel map.
Provide:
1. 4 to 8 concise, specific tags (lowercase, e.g. "beach", "dog", "food", "friends", "mountains", "architecture", "sunset", "city at night", "coffee", "ocean", "nature", "vintage").
2. A warm, scrapbook-style title for the photo or memory card (3-6 words, poetic or memorable).
3. A short one-sentence cozy note/caption as if written in a personal travel journal.`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Keywords and objects describing the photo in lowercase.',
            },
            suggestedTitle: {
              type: Type.STRING,
              description: 'Scrapbook memory title for this photo.',
            },
            description: {
              type: Type.STRING,
              description: 'A 1-sentence warm diary caption.',
            },
          },
          required: ['tags', 'suggestedTitle', 'description'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: string) => t.toLowerCase()) : ['travel'],
      suggestedTitle: parsed.suggestedTitle || 'Postcard Memory',
      description: parsed.description || 'A cherished travel snapshot.',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/tag-photo:', error);
    // Return graceful fallback rather than failing
    return res.status(200).json({
      tags: ['photo', 'adventure', 'wanderlust'],
      suggestedTitle: 'Travel Keepsake',
      description: 'A snapshot captured along the way.',
      warning: 'Used fallback tagging due to API rate limit or error.',
    });
  }
});

// Endpoint: AI Natural Language Query Parser for smart library search
app.post('/api/gemini/parse-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query' });
    }

    if (!ai) {
      // Heuristic fallback
      const q = query.toLowerCase();
      const yearMatch = q.match(/\b(19\d\d|20\d\d)\b/);
      return res.json({
        year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
        tags: q.split(/\s+/).filter(w => w.length > 2),
        textFilter: query,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are a search query interpreter for "Wayfarer", a travel photo album.
User query: "${query}"

Extract structured filters from the query. Understand natural phrases like:
- "beach photos from summer 2022" -> tags: ["beach"], season: "summer", year: 2022
- "anything with my dog" -> tags: ["dog", "pet", "puppy"]
- "warm food shots in Italy" -> colorFamily: "warm", place: "Italy", tags: ["food"]
- "tokyo at night" -> place: "tokyo", tags: ["night", "city at night"]
- "photos from last year" -> year: 2025

Return clean JSON matching the schema.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            year: {
              type: Type.INTEGER,
              description: 'Extracted 4-digit calendar year if mentioned, else omit.',
            },
            place: {
              type: Type.STRING,
              description: 'Location, city, region or country if mentioned.',
            },
            colorFamily: {
              type: Type.STRING,
              description: 'Color family if mentioned: warm, blue, green, golden, earthy, rose, monochrome.',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key subject, theme, or activity tags in lowercase.',
            },
            textFilter: {
              type: Type.STRING,
              description: 'General keywords for text matching against titles and notes.',
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/gemini/parse-search:', error);
    // Simple fallback
    return res.json({
      textFilter: req.body.query,
    });
  }
});

// Setup Vite in Dev or serve static in Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wayfarer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
