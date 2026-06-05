import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, platform } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = await hashPayload(JSON.stringify({ prompt, platform }));
    const cached = getCached(cacheKey);
    if (cached) {
      const encoder = new TextEncoder();
      const cachedStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'Serving from cache...' }) + '\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: cached }) + '\n'));
          controller.close();
        }
      });
      return new Response(cachedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Map platform to Aspect Ratio
    let aspectRatio = '1:1';
    const platLower = (platform || '').toLowerCase();
    if (platLower.includes('instagram post')) {
      aspectRatio = '1:1';
    } else if (platLower.includes('instagram story')) {
      aspectRatio = '9:16';
    } else if (platLower.includes('facebook feed')) {
      aspectRatio = '4:3';
    } else if (platLower.includes('facebook story')) {
      aspectRatio = '9:16';
    } else if (platLower.includes('google display')) {
      aspectRatio = '4:3';
    } else if (platLower.includes('linkedin')) {
      aspectRatio = '4:3';
    } else if (platLower.includes('twitter') || platLower.includes('x')) {
      aspectRatio = '16:9';
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendStatus = (status: string) => {
            controller.enqueue(encoder.encode(JSON.stringify({ status }) + '\n'));
          };

          sendStatus('Generating ad creative...');

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: `${prompt}. Generate this image in ${aspectRatio} aspect ratio, optimized for ${platform} format.` }
                    ]
                  }
                ],
                generationConfig: {
                  responseModalities: ['IMAGE', 'TEXT'],
                  temperature: 1.0,

                },
              }),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini 3.1 Flash Image error: ${res.status} ${errText}`);
          }

          const data = await res.json();
          const part = data.candidates?.[0]?.content?.parts?.find(
            (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
          );
          const bytes = part?.inlineData?.data;
          if (!bytes) {
            throw new Error('Failed to generate image');
          }

          const imageBase64 = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${bytes}`;
          const result = { imageUrl: imageBase64, platform };
          setCached(cacheKey, result, 86400);

          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: result }) + '\n'));
          controller.close();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: message }) + '\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
