import { NextRequest, NextResponse } from 'next/server';
import { getCached, hashPayload } from '@/lib/cache';

export async function POST(req: NextRequest) {
  console.log('Video generation route hit');
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { 
      prompt, imageUrl, mode, duration, aspectRatio,
      brandName, productName, keyMessage,
      videoStyle, motionIntensity,
      headlineText, subheadline, ctaText, textPosition, textStyle,
      voiceoverScript, voiceoverTone, musicMood,
      subtitlesEnabled, subtitlePosition, subtitleStyle,
      colorGrade, setting
    } = body;

    // Check cache using all payload fields
    const cacheKey = await hashPayload(JSON.stringify({ 
      prompt, imageUrl, mode, duration, aspectRatio,
      brandName, productName, keyMessage,
      videoStyle, motionIntensity,
      headlineText, subheadline, ctaText, textPosition, textStyle,
      voiceoverScript, voiceoverTone, musicMood,
      subtitlesEnabled, subtitlePosition, subtitleStyle,
      colorGrade, setting
    }));
    const cached = getCached(cacheKey) as { videoUrl?: string } | null;
    if (cached) {
      return NextResponse.json({ success: true, videoUrl: cached.videoUrl, fromCache: true });
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

    // Build comprehensive Veo prompt
    const veoPrompt = `
${videoStyle} video advertisement for ${brandName || 'a brand'}.
Product: ${productName || prompt}.
${keyMessage ? `Key message: "${keyMessage}".` : ''}

SCENE & VISUAL:
Setting: ${setting} environment.
Color grade: ${colorGrade} color treatment throughout.
Motion: ${motionIntensity} camera and subject motion.
Cinematic quality, commercial advertising standard.

${headlineText ? `TEXT OVERLAYS:
Display headline text "${headlineText}" at ${textPosition} of frame.
${subheadline ? `Subheadline: "${subheadline}".` : ''}
${ctaText ? `CTA button/text: "${ctaText}" prominently displayed.` : ''}
Text style: ${textStyle} typography.` : ''}

${voiceoverScript ? `VOICEOVER:
A ${voiceoverTone} voice speaks: "${voiceoverScript}"
Voiceover should feel ${voiceoverTone} and match the brand tone.` : ''}

${musicMood !== 'None' ? `AUDIO:
Background music mood: ${musicMood}. 
Music should complement the ${voiceoverTone || 'brand'} tone.` : 'No background music.'}

${subtitlesEnabled ? `SUBTITLES:
Display subtitles at ${subtitlePosition} of frame.
Subtitle style: ${subtitleStyle}.
Subtitles should match the voiceover text exactly.` : ''}

Duration: ${duration} seconds.
Aspect ratio: ${aspectRatio}.
Professional commercial advertising quality.
`.trim();

    // Prepare Request Payload
    const instances: Array<Record<string, unknown>> = [];
    if (mode === 'image' && bytesBase64Encoded) {
      instances.push({
        prompt: veoPrompt,
        image: {
          bytesBase64Encoded,
          mimeType: 'image/jpeg'
        }
      });
    } else {
      instances.push({
        prompt: veoPrompt
      });
    }

    const parameters = {
      aspectRatio: ratio,
      durationSeconds,
      sampleCount: 1
    };

    console.log('Sending to Veo:', JSON.stringify({ instances, parameters }, null, 2));

    const submitRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances, parameters })
      }
    );

    try {
      console.log('Veo submit response:', JSON.stringify(await submitRes.clone().json(), null, 2));
    } catch (e) {
      console.error('Failed to parse Veo submit response clone as JSON:', e);
    }

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return NextResponse.json({ success: false, error: `Failed to submit Veo job: ${submitRes.status} ${errText}` }, { status: submitRes.status });
    }

    const submitData = await submitRes.json();
    const operationName = submitData.name;
    if (!operationName) {
      return NextResponse.json({ success: false, error: 'No operation name returned from Veo API' }, { status: 500 });
    }

    return NextResponse.json({ success: true, operationName, cacheKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
