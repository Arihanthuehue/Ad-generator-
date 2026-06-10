import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, platform, referenceImageBase64, referenceImageMime } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = await hashPayload(
      JSON.stringify({
        prompt,
        platform,
        referenceImageBase64: referenceImageBase64 ? referenceImageBase64.substring(0, 100) : undefined
      })
    );
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

          let res: Response;

          if (referenceImageBase64) {
            sendStatus('Using your reference image...');

            const parts = [];
            parts.push({
              inlineData: {
                mimeType: referenceImageMime || 'image/jpeg',
                data: referenceImageBase64
              }
            });
            parts.push({
              text: `This is the EXACT product that must appear in the ad. 
    Study every physical detail carefully:
    - The exact shape, form factor, and silhouette
    - Every curve, edge, and corner
    - The exact camera module design, size, and placement
    - Button positions, port locations, speaker grilles
    - The exact color, finish, and material texture
    - Screen shape, bezels, notch or dynamic island if present
    - Any unique design elements specific to this exact model
    
    You MUST reproduce this product with 100% physical accuracy.
    Do NOT redesign it. Do NOT simplify it. Do NOT alter any 
    physical characteristic. Do NOT use a different model or 
    generation. The product shape and design is FIXED and LOCKED.
    Only the background, lighting, composition, and ad context 
    should be creative.`
            });
            parts.push({
              text: `Now create a professional advertising image with the 
  EXACT product shown above.
  
  Ad details: ${prompt}
  
  STRICT RULES:
  - The product must look IDENTICAL to the reference image
  - Same camera bump shape and layout — do not simplify or alter
  - Same exact color: ${prompt.includes('color') ? 'as described' : 'match reference exactly'}
  - Same form factor and proportions
  - Same screen design and bezels
  - Only change: background scene, lighting mood, composition angle
  
  Style: Professional commercial product photography
  Format: ${aspectRatio} aspect ratio, optimized for ${platform}
  Quality: Magazine-grade advertising photography`
            });

            res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts }],
                  generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                    temperature: 1.0,
                  }
                })
              }
            );
          } else {
            sendStatus('Generating ad creative...');

            res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: `${prompt}. Generate this image in ${aspectRatio} aspect ratio, optimized for ${platform} format. Professional commercial advertising quality.` }
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
          }

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini Image API error: ${res.status} ${errText}`);
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
          setCached(cacheKey, result, 3600);

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
