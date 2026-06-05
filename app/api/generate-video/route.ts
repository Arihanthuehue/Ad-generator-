import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, imageUrl, mode, duration, aspectRatio } = body;

    // Check cache
    const cacheKey = await hashPayload(JSON.stringify({ prompt, imageUrl, mode, duration, aspectRatio }));
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

    // Extract aspect ratio
    const ratio = aspectRatio || '16:9';

    // Parse durationSeconds
    let durationSeconds = parseInt(duration) || 4;
    if (durationSeconds < 4 || durationSeconds > 8) {
      durationSeconds = 4;
    }

    // Build base64 image data if present
    let bytesBase64Encoded = '';
    if (mode === 'image' && imageUrl) {
      const match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (match) {
        bytesBase64Encoded = match[1];
      }
    }

    // Prepare Request Payload
    const instances: Array<Record<string, unknown>> = [];
    if (mode === 'image' && bytesBase64Encoded) {
      instances.push({
        prompt: prompt || 'Product showcase video ad',
        image: {
          bytesBase64Encoded,
          mimeType: 'image/jpeg'
        }
      });
    } else {
      instances.push({
        prompt: prompt || 'Cinematic video ad description'
      });
    }

    const parameters = {
      aspectRatio: ratio,
      durationSeconds,
      sampleCount: 1
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendStatus = (status: string) => {
            controller.enqueue(encoder.encode(JSON.stringify({ status }) + '\n'));
          };

          // Step 1: Submit job
          sendStatus('Submitting to Veo 3.0...');

          const submitRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instances, parameters })
            }
          );

          if (!submitRes.ok) {
            const errText = await submitRes.text();
            throw new Error(`Failed to submit Veo generation job: ${submitRes.status} ${errText}`);
          }

          const submitData = await submitRes.json();
          const operationName = submitData.name;
          if (!operationName) {
            throw new Error('No operation name returned from Veo API');
          }

          // Step 2: Poll for completion
          let elapsed = 0;
          const pollInterval = 5000; // 5 seconds
          const maxElapsed = 120000; // 120 seconds
          let pollData: { done?: boolean; error?: { message?: string }; response?: { predictions?: Array<{ bytesBase64Encoded: string }> } } | null = null;

          while (elapsed < maxElapsed) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            elapsed += pollInterval;

            // Stream progress messages based on elapsed time
            if (elapsed <= 10000) {
              sendStatus('Generating video...');
            } else if (elapsed <= 30000) {
              sendStatus('Processing frames...');
            } else {
              sendStatus('Almost ready...');
            }

            const pollRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`,
              { method: 'GET' }
            );

            if (pollRes.ok) {
              pollData = await pollRes.json();
              if (pollData && pollData.done === true) {
                break;
              }
            }
          }

          if (!pollData || pollData.done !== true) {
            throw new Error('Video generation timed out (exceeded 120 seconds)');
          }

          if (pollData.error) {
            throw new Error(`Veo generation failed: ${pollData.error.message || 'Unknown error'}`);
          }

          // Step 3: Extract final video bytes
          const videoBytes = pollData.response?.predictions?.[0]?.bytesBase64Encoded;
          if (!videoBytes) {
            throw new Error('Failed to retrieve video data from Veo response');
          }

          const finalVideoUrl = `data:video/mp4;base64,${videoBytes}`;
          const result = { videoUrl: finalVideoUrl };
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
