import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { imageBase64, platform, goal } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Image is required' }, { status: 400 });
    }

    // Check cache (use truncated image hash for performance)
    const imageHash = imageBase64.substring(0, 200);
    const cacheKey = await hashPayload(JSON.stringify({ imageHash, platform, goal }));
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, fromCache: true });
    }

    const prompt = `You are an expert advertising analyst. Analyse this ad creative for ${platform || 'Instagram'} with the goal of ${goal || 'Brand Awareness'}. Score it out of 100 overall and give sub-scores (0-100) for: visualAppeal, messageClarity, ctaStrength, audienceFit, platformSuitability. List 2-3 strengths and 2-3 improvements. Return only valid JSON: {"overallScore":0,"subScores":{"visualAppeal":0,"messageClarity":0,"ctaStrength":0,"audienceFit":0,"platformSuitability":0},"strengths":[],"improvements":[]}`;

    // Extract mimeType and base64 data
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const rawBase64 = match ? match[2] : imageBase64;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: rawBase64
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      })
    });

    if (res.status === 429) {
      return NextResponse.json({ success: false, error: 'AI rate limit hit, please wait a moment.' }, { status: 503 });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: `Gemini API error: ${res.status} ${errorText}` }, { status: 503 });
    }

    const resData = await res.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.substring(7);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      }
      jsonStr = jsonStr.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 503 });
    }

    // Cache for 1 hour
    setCached(cacheKey, parsed, 3600);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
