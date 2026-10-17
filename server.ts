import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SCENARIOS } from './src/scenariosData';

dotenv.config();

// Attempt to load GEMINI_API_KEY from /app/.dev.env.json if not in process.env
if (!process.env.GEMINI_API_KEY) {
  try {
    const devEnvPath = '/app/.dev.env.json';
    if (fs.existsSync(devEnvPath)) {
      const devEnv = JSON.parse(fs.readFileSync(devEnvPath, 'utf8'));
      if (devEnv.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = devEnv.GEMINI_API_KEY;
      }
    }
  } catch (err) {
    console.warn('Could not read /app/.dev.env.json:', err);
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

// Initialize Gemini SDK client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Intelligent Linguistic Mistake Rectification Fallback Engine
function analyzeMistakesOffline(text: string, scenario: any) {
  const lower = text.toLowerCase();
  const corrections: any[] = [];

  // Common mistake patterns & rules
  const rules = [
    {
      regex: /\bmyself\s+([a-zA-Z]+)/i,
      original: (m: RegExpMatchArray) => m[0],
      corrected: (m: RegExpMatchArray) => `I am ${m[1]} / My name is ${m[1]}`,
      explanation: 'Reflexive pronouns like "myself" cannot be used as the subject of a sentence. Say "I am..." or "My name is...".',
      type: 'grammar',
      tip: 'Start introductions with "Hello, I am [Name]" or "My name is [Name]".',
    },
    {
      regex: /\b(am|is|are)\s+having\s+(\d+|many|several|a\s+lot\s+of)?\s*(years?|cars?|doubts?|questions?|issues?|problems?)/i,
      original: (m: RegExpMatchArray) => m[0],
      corrected: (m: RegExpMatchArray) => m[0].replace(/\b(am|is|are)\s+having\b/i, 'have'),
      explanation: 'The verb "have" indicating possession or state is stative and is rarely used in the continuous "-ing" form.',
      type: 'tense',
      tip: 'Say "I have 5 years of experience" or "I have a question", not "I am having".',
    },
    {
      regex: /\b(am|is|are)\s+agree\b/i,
      original: (m: RegExpMatchArray) => m[0],
      corrected: () => 'agree',
      explanation: '"Agree" is already an active verb, not an adjective. You do not need the auxiliary verb "am/is/are".',
      type: 'grammar',
      tip: 'Say "I agree with you" instead of "I am agree".',
    },
    {
      regex: /\brevert\s+back\b/i,
      original: () => 'revert back',
      corrected: () => 'reply / get back to you',
      explanation: '"Revert" already means to return to a previous state, and "revert back" is redundant. In professional communication, use "reply" or "respond".',
      type: 'phrasing',
      tip: 'Use "I will get back to you" or "I will reply shortly".',
    },
    {
      regex: /\bdiscuss\s+about\b/i,
      original: () => 'discuss about',
      corrected: () => 'discuss',
      explanation: 'The transitive verb "discuss" already means "to talk about". Adding "about" is redundant.',
      type: 'preposition',
      tip: 'Say "Let us discuss the project", not "discuss about".',
    },
    {
      regex: /\bpassed\s+out\s+from\b/i,
      original: () => 'passed out from',
      corrected: () => 'graduated from',
      explanation: '"Passed out" in standard English means fainted or became unconscious. For finishing school or university, use "graduated from".',
      type: 'vocabulary',
      tip: 'Say "I graduated from university in 2022".',
    },
    {
      regex: /\bprepone\b/i,
      original: () => 'prepone',
      corrected: () => 'advance / bring forward / reschedule earlier',
      explanation: '"Prepone" is Indian English and not recognized in global international English. Use "bring forward" or "reschedule earlier".',
      type: 'vocabulary',
      tip: 'Say "Can we bring the meeting forward to 2 PM?"',
    },
    {
      regex: /\bmarried\s+with\b/i,
      original: () => 'married with',
      corrected: () => 'married to',
      explanation: 'In English, the correct dependent preposition for "married" is "to", not "with".',
      type: 'preposition',
      tip: 'Say "She is married to Rahul".',
    },
    {
      regex: /\bmore\s+better\b/i,
      original: () => 'more better',
      corrected: () => 'much better',
      explanation: '"Better" is already a comparative adjective. Using "more better" is a double comparative error. Use "much better".',
      type: 'grammar',
      tip: 'Say "This design is much better".',
    },
    {
      regex: /\bdid\s+(went|saw|spoke|ate|took)\b/i,
      original: (m: RegExpMatchArray) => m[0],
      corrected: (m: RegExpMatchArray) => {
        const verbs: Record<string, string> = { went: 'go', saw: 'see', spoke: 'speak', ate: 'eat', took: 'take' };
        return `did ${verbs[m[1].toLowerCase()] || m[1]}`;
      },
      explanation: 'After the auxiliary "did", the following main verb must always be in its base infinitive form (V1), not the past tense.',
      type: 'tense',
      tip: 'Say "Did you see?" or "I did go", not "did saw" or "did went".',
    },
    {
      regex: /\bone\s+of\s+my\s+friend\b/i,
      original: () => 'one of my friend',
      corrected: () => 'one of my friends',
      explanation: 'When saying "one of...", the noun that follows must always be plural because you are choosing one person from a group.',
      type: 'grammar',
      tip: 'Say "One of my friends told me".',
    },
  ];

  for (const rule of rules) {
    const match = text.match(rule.regex);
    if (match) {
      corrections.push({
        original: rule.original(match),
        corrected: rule.corrected(match),
        explanation: rule.explanation,
        type: rule.type,
        confidenceTip: rule.tip,
      });
    }
  }

  // Generate natural roleplay response
  const roleBani = scenario?.roleBani || 'English Coach';
  let replyText = '';
  const suggestions: string[] = [];

  if (scenario?.id === 'job-interview') {
    if (corrections.length > 0) {
      replyText = `Thank you for sharing that! That is a very impressive background. By the way, quick tip on your phrasing: notice how saying "${corrections[0].corrected}" sounds much more natural and professional than "${corrections[0].original}". Tell me, what was one of the biggest challenges you tackled in that role?`;
    } else {
      replyText = `Excellent! You answered with great clarity and professional composure. Could you tell me about a time when you had to adapt to a sudden change in project priorities?`;
    }
    suggestions.push(
      "In my last project, our requirements shifted two weeks before launch.",
      "I prioritize open communication with stakeholders whenever plans change.",
      "Could you tell me more about the team dynamic here?"
    );
  } else if (scenario?.id === 'coffee-shop') {
    if (corrections.length > 0) {
      replyText = `Coming right up! That sounds delicious. Just a friendly coach tip: instead of "${corrections[0].original}", in a cafe it's super natural to say "${corrections[0].corrected}". Would you like any pastry or muffin to go with that?`;
    } else {
      replyText = `You got it! One delicious drink coming right up. Would you like that hot or iced, and for here or to-go?`;
    }
    suggestions.push(
      "I'd love that iced with oat milk, to-go please!",
      "Do you have any fresh blueberry muffins today?",
      "Can I pay with credit card or Apple Pay?"
    );
  } else if (scenario?.id === 'airport-travel') {
    if (corrections.length > 0) {
      replyText = `Thank you! Let me check your itinerary in our system. Quick tip: when speaking to airport staff, saying "${corrections[0].corrected}" is very clear and standard! Do you have any check-in bags or just this carry-on?`;
    } else {
      replyText = `Perfect, I see your booking right here. Your flight is currently on schedule. Would you prefer a window seat or an aisle seat today?`;
    }
    suggestions.push(
      "A window seat towards the front would be wonderful, please.",
      "I have one checked suitcase and a small backpack.",
      "Could you please tell me which gate we will be boarding from?"
    );
  } else {
    if (corrections.length > 0) {
      replyText = `I completely understand what you mean, and that makes total sense! Notice one small detail: saying "${corrections[0].corrected}" is the standard English way instead of "${corrections[0].original}". Let's keep going — tell me more about your thoughts on this!`;
    } else {
      replyText = `That was phrased very naturally! Your sentence structure was smooth and confident. What else would you like to explore or practice together?`;
    }
    suggestions.push(
      "I would like to practice explaining my daily routine.",
      "Could you give me an example sentence using that rule?",
      "Let's try another real-life conversation topic!"
    );
  }

  return { replyText, corrections, suggestions };
}

// Chat & Mistakes Rectification Endpoint
app.post('/api/chat', async (req, res) => {
  const { messages = [], scenario } = req.body;
  const latestUserMessage = messages[messages.length - 1]?.text || '';

  // Attempt Gemini API call first
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemInstruction = `You are "English Coach BANI" — an empathetic, encouraging, and world-class human-like English speaking coach.
The user is practicing real-life English conversation with you in a specific scenario.

Current Scenario Details:
- Title: ${scenario?.title || 'English Conversation'}
- Your Role: ${scenario?.roleBani || 'English Coach & Conversation Partner'}
- User's Role: ${scenario?.roleUser || 'Learner / Traveler / Candidate'}
- Scenario Context: ${scenario?.scenarioContext || 'General conversation'}
- Learning Goals: ${(scenario?.goals || []).join('; ')}

CRITICAL COACHING & RECTIFICATION RULES:
1. Talk like a real, warm human: Never sound like a robotic examiner. React with genuine emotions, follow-up questions, humor, or empathy matching your scenario role.
2. Rectify user errors: Carefully examine the user's latest statement ("${latestUserMessage}"). Detect ANY grammatical mistakes, awkward phrasing, wrong prepositions, incorrect tenses, Indian English habits (e.g. "prepone", "revert back", "I am having two cars", "myself Rahul", "I am agree"), or poor word choices.
3. If the user made errors:
   - In your structured corrections array, provide the exact mistaken phrase ("original"), the natural/correct English ("corrected"), an easy-to-understand explanation of the grammar rule ("explanation"), the error type ("type": 'grammar' | 'vocabulary' | 'pronunciation' | 'phrasing' | 'tense' | 'preposition'), and an encouraging confidence tip.
   - In your spoken response ("replyText"), seamlessly address what they said in character, and include a brief, kind, friendly coach correction note (e.g. "By the way, instead of saying '...', you can say '...'!").
4. If the user spoke perfectly:
   - Set corrections to empty array [].
   - Give positive reinforcement in replyText (e.g., "Great sentence structure!", "Spot on!").
5. Provide 2-3 natural suggestions of what the user can reply next in this scenario to keep the conversation flowing.

You must respond strictly in JSON matching the defined schema.`;

      const contents = messages.map((m: any) => ({
        role: m.sender === 'bani' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello Coach BANI!' }] });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    type: { type: Type.STRING },
                    confidenceTip: { type: Type.STRING },
                  },
                  required: ['original', 'corrected', 'explanation', 'type'],
                },
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['replyText', 'corrections', 'suggestions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.replyText) {
        res.json({
          replyText: parsed.replyText,
          corrections: parsed.corrections || [],
          suggestions: parsed.suggestions || [],
        });
        return;
      }
    } catch (err: any) {
      console.warn('Gemini API call returned error, applying intelligent fallback:', err?.message || err);
    }
  }

  // Graceful fallback to offline NLP linguistic analyzer
  const fallbackResult = analyzeMistakesOffline(latestUserMessage, scenario);
  res.json(fallbackResult);
});

// Text-to-Speech Endpoint using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'Kore' } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text is required for TTS' });
    return;
  }

  const cleanText = text
    .replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[*_#`~]/g, '')
    .trim();

  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText.slice(0, 500),
                speechMetadata: {
                  style: 'Warm, encouraging, friendly, human English mentor speaking clearly at natural pace',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio });
        return;
      }
    } catch (err: any) {
      console.warn('Gemini TTS error, signaling client to use browser speech synthesis:', err?.message);
    }
  }

  // If TTS API unavailable, return empty so client plays immediately via Web Speech API
  res.json({ audio: null, fallbackToBrowser: true });
});

// Scenarios endpoint
app.get('/api/scenarios', (req, res) => {
  res.json(SCENARIOS);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    appName: 'English Coach BANI',
  });
});

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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`English Coach BANI server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
