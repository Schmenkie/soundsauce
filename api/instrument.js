/**
 * Vercel Serverless Function: AI Instrument Detection (Gemini)
 *
 * Sends audio to Google Gemini 2.5 Flash for zero-shot instrument classification.
 * Synchronous — single POST request returns results directly (no polling).
 *
 * POST /api/instrument
 *   Body: { audioUrl: string, labels?: string[] }
 *   Returns: { results: [{ label: string, score: number }] }
 *
 * The audio URL (Vercel Blob) is fetched server-side and sent inline to Gemini
 * since Gemini may not be able to fetch from all external URLs directly.
 *
 * @param {object} req - Vercel request object
 * @param {string} req.body.audioUrl - Public URL to audio file (Vercel Blob)
 * @param {string[]} [req.body.labels] - Optional custom labels (defaults to 18 instrument labels)
 * @param {object} res - Vercel response object
 * @returns {{ results: Array<{ label: string, score: number }> }}
 */

import { rateLimit } from './_rateLimit.js';

export const config = {
  maxDuration: 60,
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const DEFAULT_LABELS = [
  'synth pad', 'synth lead', 'synth bass', '808 bass', 'sub bass',
  'acoustic guitar', 'electric guitar', 'piano', 'brass', 'strings',
  'woodwind', 'vocal', 'kick drum', 'snare drum', 'hi-hat', 'drums',
  'pluck synth', 'full mix',
];

/**
 * Determine MIME type from URL extension
 */
function getMimeType(url) {
  const ext = url.split('.').pop().split('?')[0].toLowerCase();
  const mimeMap = { wav: 'audio/wav', mp3: 'audio/mp3', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac' };
  return mimeMap[ext] || 'audio/wav';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimit(req, res, { limit: 20 })) return;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Instrument detection service not configured (missing GEMINI_API_KEY)' });
  }

  try {
    const { audioUrl, labels } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'No audio URL provided' });
    }
    try { new URL(audioUrl); } catch { return res.status(400).json({ error: 'Invalid audio URL format' }); }

    // SSRF protection: only allow Vercel Blob URLs
    const ALLOWED_HOSTS = ['public.blob.vercel-storage.com'];
    const parsedUrl = new URL(audioUrl);
    if (!ALLOWED_HOSTS.some(host => parsedUrl.hostname.endsWith(host))) {
      return res.status(400).json({ error: 'Audio URL must be a Vercel Blob URL' });
    }

    // Validate labels array if provided
    if (labels !== undefined && labels !== null) {
      if (!Array.isArray(labels)) {
        return res.status(400).json({ error: 'labels must be an array' });
      }
      if (labels.length > 30) {
        return res.status(400).json({ error: 'Too many labels (max 30)' });
      }
      if (labels.some(l => typeof l !== 'string' || l.length > 100)) {
        return res.status(400).json({ error: 'Each label must be a string of max 100 characters' });
      }
    }

    const candidateLabels = (labels && labels.length > 0) ? labels : DEFAULT_LABELS;
    const labelList = candidateLabels.map((l, i) => `${i + 1}. "${l}"`).join('\n');

    // Check file size via HEAD request before downloading (avoids buffering huge files)
    const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15MB
    try {
      const headRes = await fetch(audioUrl, { method: 'HEAD' });
      if (headRes.ok) {
        const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_AUDIO_SIZE) {
          return res.status(400).json({ error: 'Audio file too large for classification (max 15MB)' });
        }
      }
    } catch {
      // HEAD failed — fall through to full fetch which has its own size check
    }

    // Fetch audio from Vercel Blob and encode as base64
    // (inline_data is more reliable than file_uri for cross-origin URLs)
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch audio file' });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const mimeType = getMimeType(audioUrl);

    // Fallback size check after download (Content-Length isn't always reliable)
    if (audioBuffer.byteLength > MAX_AUDIO_SIZE) {
      return res.status(400).json({ error: 'Audio file too large for classification (max 15MB)' });
    }

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `You are an expert audio and music instrument classification system. Listen carefully to this audio and classify it against the following instrument/sound labels. For each label, provide a confidence score from 0.0 to 1.0 indicating how well the audio matches that label.

Labels:
${labelList}

Rules:
- Return scores for ALL ${candidateLabels.length} labels
- Scores should roughly sum to 1.0 (they are relative confidences)
- Assign high scores (0.3-0.8) to labels that clearly match the primary sound
- Assign very low scores (0.0-0.02) to labels that don't match at all
- If the audio contains a clear single instrument, one label should dominate
- If the audio is a full mix with multiple instruments, assign "full mix" a high score
- Focus on the PRIMARY instrument/sound — what a music producer would call this sound`,
          },
        ],
      }],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              label: { type: 'STRING' },
              score: { type: 'NUMBER' },
            },
            required: ['label', 'score'],
          },
        },
        temperature: 0.1,
        max_output_tokens: 1024,
      },
    };

    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);

      if (geminiResponse.status === 400) {
        return res.status(400).json({ error: 'Invalid audio format or request' });
      }
      if (geminiResponse.status === 429) {
        return res.status(429).json({ error: 'AI detection rate limit exceeded. Try again in a moment.' });
      }
      return res.status(502).json({ error: 'AI instrument detection failed' });
    }

    const data = await geminiResponse.json();

    // Extract structured JSON response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Gemini returned no text:', JSON.stringify(data));
      return res.status(502).json({ error: 'No response from AI model' });
    }

    let results;
    try {
      results = JSON.parse(text);
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return res.status(502).json({ error: 'Invalid response from AI model' });
    }

    // Validate and normalize results
    if (!Array.isArray(results)) {
      return res.status(502).json({ error: 'Unexpected response format from AI model' });
    }

    // Ensure all results have label and score, filter invalid entries
    const validResults = results
      .filter(r => r && typeof r.label === 'string' && typeof r.score === 'number')
      .map(r => ({ label: r.label, score: Math.max(0, Math.min(1, r.score)) }))
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({ results: validResults });
  } catch (error) {
    console.error('Instrument detection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
