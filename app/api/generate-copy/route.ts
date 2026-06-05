import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload, getStale } from '@/lib/cache';

export async function POST(req: NextRequest) {
  let body;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    body = await req.json();
    const { brandName, productName, benefit, tone, platform, variations } = body;

    if (!brandName || !productName) {
      return NextResponse.json({ success: false, error: 'Brand name and product name are required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = await hashPayload(JSON.stringify({ brandName, productName, benefit, tone, platform, variations }));
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, fromCache: true });
    }

    const prompt = `Generate ${variations || 3} ad copy variations for ${brandName}.
Product/Service: ${productName}. Key benefit: ${benefit || 'Not specified'}.
Tone: ${tone || 'Professional'}. Platform: ${platform || 'Facebook'}.
Return a JSON object containing a "variations" array where each element contains headline, primaryText, cta, and characterCounts.
Format: {"variations": [{"headline":"...","primaryText":"...","cta":"...","characterCounts":{"headline":0,"primaryText":0,"cta":0}}]}`;

    const systemInstruction = 'You are an expert advertising copywriter with 15 years experience writing high-converting ad copy for major brands. Output only valid JSON.';
    const fullPrompt = `${systemInstruction}\n\n${prompt}`;

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
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json'
        }
      })
    });

    if (res.status === 429) {
      const cacheKey = await hashPayload(JSON.stringify(body));
      const stale = getStale(cacheKey);
      if (stale) {
        return NextResponse.json({ success: true, data: stale, fromCache: true });
      }
      return NextResponse.json({ success: false, error: 'AI rate limit hit, please wait a moment.' }, { status: 503 });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: `Gemini API error: ${res.status} ${errorText}` }, { status: 503 });
    }

    const resData = await res.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
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
      const jsonObj = JSON.parse(jsonStr);
      parsed = Array.isArray(jsonObj) ? jsonObj : (jsonObj.variations || []);
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 503 });
    }

    // Ensure characterCounts are populated
    if (Array.isArray(parsed)) {
      parsed = parsed.map((item: { headline?: string; primaryText?: string; cta?: string; characterCounts?: { headline: number; primaryText: number; cta: number } }) => ({
        ...item,
        characterCounts: {
          headline: (item.headline || '').length,
          primaryText: (item.primaryText || '').length,
          cta: (item.cta || '').length,
        },
      }));
    }

    // Cache for 30 minutes
    setCached(cacheKey, parsed, 1800);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: unknown) {
    if (body) {
      const cacheKey = await hashPayload(JSON.stringify(body));
      const stale = getStale(cacheKey);
      if (stale) {
        return NextResponse.json({ success: true, data: stale, fromCache: true });
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
