import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { imageUrl, backgroundScene, lightingStyle } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Product image is required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = await hashPayload(JSON.stringify({ imageUrl: imageUrl.substring(0, 200), backgroundScene, lightingStyle }));
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

    const scenePrompts: Record<string, string> = {
      'Studio White': `Seamless pure white infinity cove backdrop. 
  Twin softbox lighting from 45 degrees either side. 
  Clean white surface with a barely visible ground shadow. 
  Clinical perfection. Apple product photography style.`,
      'Lifestyle Home': `Warm luxury home setting. Aged oak wooden surface. 
  Soft natural window light from camera left. White linen fabric 
  draped softly in background. Shallow depth of field. 
  Kinfolk magazine editorial style.`,
      'Outdoor Nature': `Natural outdoor rocky surface. Dappled golden hour 
  sunlight from upper right. Wild grass and bokeh foliage background. 
  Slight morning mist in background. National Geographic product style.`,
      'Urban Street': `Wet urban concrete surface at night. 
  Single harsh overhead street lamp creating dramatic shadows. 
  Neon light color reflections on wet surface. 
  Cinematic color grade — teal shadows, amber highlights. 
  High fashion editorial style.`,
      'Luxury Minimal': `Dark charcoal slate stone surface. 
  Single dramatic side light from camera left creating deep shadows. 
  Pure black background fading to dark grey. 
  Subtle gold rim light from behind the product. 
  Rolex advertisement style. Ultra premium.`,
      'E-commerce Clean': `Pure white background. Perfectly even flat lighting 
  from all sides — zero shadows except a very subtle ground shadow. 
  Product perfectly centered. Amazon main image style. 
  Clean, clinical, conversion-optimized.`,
    };

    let scenePrompt = '';
    if (backgroundScene in scenePrompts) {
      scenePrompt = scenePrompts[backgroundScene];
    } else {
      scenePrompt = `${backgroundScene}. Professional product photography, physically integrated lighting, commercial grade quality.`;
    }

    const sceneLower = (scenePrompt || '').toLowerCase();
    const lightTemp = sceneLower.includes('studio') || sceneLower.includes('white')
      ? '5500K clean daylight'
      : sceneLower.includes('luxury')
      ? '3200K warm golden'
      : sceneLower.includes('outdoor')
      ? '6500K natural sunlight'
      : '4500K neutral';

    const prompt = `You are a world-class commercial product photographer and 
CGI compositor with 20 years experience shooting for Apple, 
Nike, and Vogue.

This is a real product image. Your task is to create a 
photorealistic studio-quality product photograph.

PRODUCT HANDLING:
- Extract the product with perfect precision — clean edges, 
  no fringing, no halo artifacts
- Enhance the product's own texture, material quality, and 
  surface detail — make it look sharper and more premium than 
  the original
- Upscale and sharpen the product itself before compositing
- Preserve every design detail of the product exactly

SCENE: ${scenePrompt}

LIGHTING (CRITICAL):
- Define ONE primary light source for the entire scene
- The product MUST be lit by this exact same light source
- Match the light direction, color temperature, and intensity 
  on the product to the scene lighting perfectly
- Add a subtle secondary fill light from the opposite side 
  to prevent harsh shadows
- Light color temperature: ${lightTemp}

INTEGRATION (CRITICAL — fixes the pasted look):
- The product must cast a natural shadow onto the surface below it
- If the surface is reflective, add a subtle product reflection
- Add very subtle ambient occlusion where the product meets the surface
- The product should feel physically present in the scene, 
  not floating or composited
- Match any environmental color cast onto the product surface

COMPOSITION:
- Rule of thirds placement
- Slight angle (15-25 degrees) for depth unless flat lay is specified
- Leave negative space for text overlays if needed
- Foreground and background elements should frame the product

OUTPUT QUALITY:
- Maximum resolution output — sharp, high detail
- Medium format photography quality
- Zero compression artifacts
- Magazine cover quality — this image should be indistinguishable 
  from a real professional photoshoot
- Commercial advertising grade`;

    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Invalid product image format. Base64 expected.' }, { status: 400 });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendStatus = (status: string) => {
            controller.enqueue(encoder.encode(JSON.stringify({ status }) + '\n'));
          };

          sendStatus('Analysing product...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          sendStatus('Removing background...');
          await new Promise(resolve => setTimeout(resolve, 1500));

          sendStatus('Generating scene...');

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { inlineData: { mimeType, data: base64Data } },
                      { text: prompt }
                    ]
                  }
                ],
                generationConfig: {
                  responseModalities: ['IMAGE', 'TEXT'],
                  temperature: 1.0,
                },
              })
            }
          );

          if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            throw new Error(`Gemini 3 Pro Image error: ${geminiRes.status} ${errText}`);
          }

          const data = await geminiRes.json();
          const part = data.candidates?.[0]?.content?.parts?.find(
            (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
          );
          if (!part?.inlineData?.data) {
            throw new Error('No image was generated by Gemini 3 Pro Image');
          }

          sendStatus('Done');

          const finalImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          const result = { imageUrl: finalImageUrl };
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
