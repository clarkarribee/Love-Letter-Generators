import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;

// Groq's API is OpenAI-compatible (chat completions format), so a Groq key
// (starts with "gsk_") works here instead of an OpenAI key.
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

app.use(express.json({ limit: '64kb' }));
app.use(express.static(__dirname));

// Simple diagnostic endpoint. It never exposes the API key.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    model: process.env.GROQ_MODEL || DEFAULT_MODEL
  });
});

app.post('/api/generate-letter', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;

    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_API_KEY_HERE' || apiKey === 'your_real_openai_api_key') {
      return res.status(503).json({
        code: 'AI_NOT_CONFIGURED',
        error: 'The AI writer is not configured. Add your Groq API key to the .env file, then restart npm start.'
      });
    }

    const {
      prompt,
      style = 'romantic',
      recipient = '',
      relationship = '',
      context = {}
    } = req.body || {};

    if (typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({
        code: 'INVALID_PROMPT',
        error: 'Please describe what you want the letter to say.'
      });
    }

    if (prompt.length > 1200) {
      return res.status(400).json({
        code: 'PROMPT_TOO_LONG',
        error: 'Your AI prompt is too long. Please keep it under 1200 characters.'
      });
    }

    const styleInstructions = {
      romantic: 'deeply romantic, sincere, intimate, and heartfelt',
      cute: 'cute, warm, playful, affectionate, and natural',
      emotional: 'emotionally honest, vulnerable, touching, and sincere',
      simple: 'simple, natural, conversational, and easy to read'
    };

    const instruction = [
      'Write a first-draft personal love letter that the user can edit.',
      `Writing style: ${styleInstructions[style] || styleInstructions.romantic}.`,
      `Recipient: ${recipient || 'someone special'}.`,
      `Relationship: ${relationship || 'romantic partner'}.`,
      `What the user wants to say: ${prompt.trim()}.`,
      context?.memory ? `Special memory: ${String(context.memory).slice(0, 400)}.` : '',
      context?.loveAbout ? `What they love about the recipient: ${String(context.loveAbout).slice(0, 400)}.` : '',
      context?.promise ? `Promise for the future: ${String(context.promise).slice(0, 300)}.` : '',
      '',
      'Return only the letter body.',
      'Do not add a title, greeting label, quotation marks, markdown, or signature.',
      'Use natural paragraphs and do not invent highly specific facts that the user did not provide.'
    ].filter(Boolean).join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let apiResponse;
    try {
      apiResponse = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: instruction }],
          max_tokens: 900
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await apiResponse.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON response */ }

    if (!apiResponse.ok) {
      console.error('Groq request failed:', apiResponse.status, payload?.error?.message || raw.slice(0, 300));

      if (apiResponse.status === 401) {
        return res.status(502).json({
          code: 'AI_AUTH_ERROR',
          error: 'The AI service rejected the API key. Check your GROQ_API_KEY in .env and restart the server.'
        });
      }

      if (apiResponse.status === 429) {
        return res.status(502).json({
          code: 'AI_RATE_LIMIT',
          error: 'The AI service is temporarily busy or your account has reached its usage limit. Please try again in a moment.'
        });
      }

      return res.status(502).json({
        code: 'AI_PROVIDER_ERROR',
        error: `The AI service rejected the request (HTTP ${apiResponse.status}). Check GROQ_MODEL in .env.`
      });
    }

    const text = extractResponseText(payload);
    if (!text) {
      return res.status(502).json({
        code: 'EMPTY_AI_RESPONSE',
        error: 'The AI service returned an empty draft. Please try again.'
      });
    }

    res.json({ text });
  } catch (error) {
    console.error('AI route error:', error);

    if (error?.name === 'AbortError') {
      return res.status(504).json({
        code: 'AI_TIMEOUT',
        error: 'The AI request took too long. Please try again.'
      });
    }

    res.status(500).json({
      code: 'AI_SERVER_ERROR',
      error: 'The local AI server could not complete the request. Check the PowerShell window running npm start.'
    });
  }
});

// Groq's chat completions response shape: choices[0].message.content
function extractResponseText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Love Letter Generator running at http://localhost:${port}`);
  console.log(`AI writer configured: ${Boolean(process.env.GROQ_API_KEY?.trim())}`);
  console.log(`AI model: ${process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL}`);
});
