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
      colorGrade, setting,
      // UGC Creator details
      creatorDescription, creatorPosition, productInteraction,
      creatorScript, energyLevel, ugcSetting
    } = body;

    // Check cache using all payload fields
    const cacheKey = await hashPayload(JSON.stringify({ 
      prompt, imageUrl, mode, duration, aspectRatio,
      brandName, productName, keyMessage,
      videoStyle, motionIntensity,
      headlineText, subheadline, ctaText, textPosition, textStyle,
      voiceoverScript, voiceoverTone, musicMood,
      subtitlesEnabled, subtitlePosition, subtitleStyle,
      colorGrade, setting,
      creatorDescription, creatorPosition, productInteraction,
      creatorScript, energyLevel, ugcSetting
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

    // Fix 1: Calculate Speaking Pace
    const wordCount = voiceoverScript ? voiceoverScript.trim().split(/\s+/).length : 0;
    const durationNum = parseInt(duration) || 4;
    const maxWords = Math.floor(durationNum * 2.5);
    const speakingPace = wordCount <= maxWords ? 'natural comfortable pace' 
      : wordCount <= maxWords * 1.2 ? 'slightly faster than normal, urgent energy'
      : 'fast energetic delivery, every word counts';

    let veoPrompt = '';

    if (videoStyle === 'UGC Creator') {
      const textLanguage = textPosition ? `
    TITLES AND GRAPHICS:
    Display "${headlineText}" in ${textStyle} typography at ${textPosition} of frame.
    ${subheadline ? `Secondary text "${subheadline}" below headline.` : ''}
    ${ctaText ? `Bold CTA "${ctaText}" appears in final frames with strong visual emphasis.` : ''}
    Text appears with elegant motion — fade up or slide in, never jarring.
    Typography feels intentional and brand-consistent.` : '';

      veoPrompt = `
UGC CREATOR ADVERTISEMENT — SOCIAL MEDIA STYLE

A stylized digital CGI creator — ${creatorDescription || 'a stylish young person, casual confident style'} — 
is ${creatorPosition || 'standing'} in a ${ugcSetting || 'modern'} setting.

The creator is ${productInteraction || 'holding'} the ${productName || 'product'} 
for ${brandName || 'the brand'}.

CREATOR APPEARANCE (MANDATORY):
A stylized digital CGI human creator — ${creatorDescription || 'young stylish person, casual confident energy'}.
FACE IS MANDATORY — the creator's face must be clearly 
visible and expressive throughout the entire video.
Full face shown — not obscured, not cut off, not turned away.
Photorealistic CGI human face — not cartoon, not anime.
Stylized digital human aesthetic — uncanny valley avoided.
Natural micro-expressions: smile, raised eyebrow, enthusiasm.
Real eye movement — blinks, glances at product, back to camera.
Genuine human warmth and personality visible in the face.
The face drives the emotional connection with the viewer.
Primary shot framing: medium shot (chest up) so face 
dominates the frame at all times.
Even during product demonstration shots, face remains 
partially visible or returns to frame immediately after.

PERFORMANCE:
Energy: ${energyLevel || 'Authentic'}.
The creator speaks directly to camera with genuine enthusiasm.
${creatorScript ? `They say: "${creatorScript}"` : `They enthusiastically describe the ${productName || 'product'} features naturally.`}
Natural hand gestures while talking.
maintains strong eye contact with camera while gesturing naturally toward the product.
Feels like a real person, not a performer.

PRODUCT HANDLING:
Product is ${productInteraction || 'held'} naturally and confidently.
Product is clearly visible and well-lit at all times.
When demonstrating, product features are highlighted naturally.
Product looks premium and desirable in their hands.

CINEMATOGRAPHY:
Handheld aesthetic — slight natural camera shake.
Primary shot: medium shot (waist up) facing camera.
Intercut with: close-up on product details, creator's face reaction.
Shallow depth of field — creator and product sharp, background soft.
Natural room lighting + subtle ring light reflection in eyes.

SETTING:
${ugcSetting || 'Modern'} environment, lived-in and real.
Background is recognizable but not distracting.
Real textures — fabric, wood, concrete, plants.

COLOR:
Warm natural color grade. Bright and clean.
High saturation for social media scroll-stopping appeal.
Looks great on a phone screen.

AUDIO:
${voiceoverScript ? `
Voiceover timing is CRITICAL:
The entire script "${voiceoverScript}" must be delivered 
completely within ${durationNum} seconds.
Speaking pace: ${speakingPace}.
Script is ${wordCount} words for ${durationNum} seconds — 
${wordCount <= maxWords 
  ? 'comfortable pacing, allow natural breath and emphasis.' 
  : 'tight pacing required, minimal pauses, crisp delivery.'}
The voiceover must START within the first 0.5 seconds and 
END before the final 0.5 seconds of the video.
Every single word in the script must be spoken — do not 
cut off or truncate the voiceover.` : ''}
${creatorScript ? `Creator speaks: "${creatorScript}" — clear, natural, conversational.` : ''}
${musicMood !== 'None' ? `Subtle ${musicMood} background track underneath.` : ''}
${subtitlesEnabled ? `Subtitles at ${subtitlePosition} — ${subtitleStyle} style.` : ''}

${textLanguage}

TECHNICAL:
Duration: ${duration} seconds.
Aspect ratio: ${aspectRatio} — optimized for social media.
Vertical format preferred for Stories/Reels if 9:16 selected.
Quality: Ultra sharp, broadcast ready.
Feels authentic enough to be mistaken for a real UGC creator post.
`.trim();
    } else {
      const styleLanguage: Record<string, string> = {
        'Product Showcase': `
      Slow cinematic orbital shot around the hero product. 
      Camera begins at eye level, executes a smooth 180-degree 
      arc with a subtle push-in. Shot on ARRI Alexa with 
      anamorphic 85mm lens. Razor-sharp product focus with 
      creamy bokeh background separation. 
      Lens flares catch the key light naturally.
      Product surfaces catch light with photorealistic material response.
      Every frame feels like a $500,000 Apple commercial.`,
        
        'UGC Style': `
      Authentic handheld camera movement, slight natural shake.
      Shot on iPhone aesthetic — intimate, real, slightly imperfect.
      Close-up product detail shots intercut with wider context shots.
      Natural available light, slightly overexposed highlights.
      Feels genuine and organic, like a real person filmed it.
      Trending social media aesthetic, raw and authentic energy.`,
        
        'Cinematic': `
      Hollywood-grade cinematography. Shot on RED Monstro 8K.
      Dramatic motivated lighting with deep shadows and bright highlights.
      Slow motion sequences at key moments (120fps aesthetic).
      Sweeping camera movements — tracking shots, crane movements.
      Anamorphic lens breathing and oval bokeh visible.
      Color grade: rich shadows, lifted midtones, desaturated highlights.
      Every frame could be a movie poster.`,
        
        'Minimal': `
      Ultra-clean, zen aesthetic. Camera completely static or 
      barely perceptible slow push.
      Single hero product on an infinite clean surface.
      Soft diffused light from camera left, gentle fill from right.
      Negative space dominates — product is the only element.
      Swiss design sensibility. Silence and restraint.
      Reminiscent of Braun product photography brought to video.`
      };

      const motionLanguage: Record<string, string> = {
        'Subtle': 'Almost imperceptible camera drift. Product and elements move with extreme elegance and restraint. Barely there motion — meditative pacing.',
        'Moderate': 'Confident deliberate camera movement. Smooth controlled motion. Professional broadcast pacing. Dynamic but never chaotic.',
        'Dynamic': 'Energetic fast-cut aesthetic. Quick camera movements, whip pans, snap zooms. High energy commercial pacing. Gen-Z attention-grabbing rhythm.'
      };

      const settingLanguage: Record<string, string> = {
        'Studio': 'Infinite white or dark cyclorama studio. Professional lighting rig. Controlled perfect environment.',
        'Outdoor': 'Golden hour natural environment. Sun-drenched outdoor setting. Real sky, real textures, natural imperfection.',
        'Urban': 'Gritty urban environment. City architecture, concrete, glass reflections. Neon and street lighting. Metropolitan energy.',
        'Home': 'Warm lived-in interior. Natural window light. Cozy authentic domestic environment. Real wood, fabric, texture.',
        'Abstract': 'Surreal abstract environment. Non-physical space. Light and color as environment. Dreamlike impossible geometry.'
      };

      const colorLanguage: Record<string, string> = {
        'Natural': 'True-to-life color. Accurate skin tones and product colors. Clean neutral grade. What your eyes would actually see.',
        'Warm': 'Golden warm color grade. Lifted shadows with amber tones. Sunset warmth. Honey and gold color palette.',
        'Cold': 'Cool blue-teal grade. Crisp cold shadows. Clinical precision. Steel and ice color palette.',
        'High Contrast': 'Punchy high contrast grade. Deep crushed blacks. Bright clean highlights. Maximum pop and punch.',
        'Cinematic Teal-Orange': 'Hollywood teal-orange complementary grade. Teal shadows, orange midtones. Blockbuster film aesthetic. Premium cinematic look.'
      };

      const textLanguage = textPosition ? `
    TITLES AND GRAPHICS:
    Display "${headlineText}" in ${textStyle} typography at ${textPosition} of frame.
    ${subheadline ? `Secondary text "${subheadline}" below headline.` : ''}
    ${ctaText ? `Bold CTA "${ctaText}" appears in final frames with strong visual emphasis.` : ''}
    Text appears with elegant motion — fade up or slide in, never jarring.
    Typography feels intentional and brand-consistent.` : '';

      const audioLanguage = `
    SOUND DESIGN:
    ${voiceoverScript ? `
    Voiceover timing is CRITICAL:
    The entire script "${voiceoverScript}" must be delivered 
    completely within ${durationNum} seconds.
    Speaking pace: ${speakingPace}.
    Script is ${wordCount} words for ${durationNum} seconds — 
    ${wordCount <= maxWords 
      ? 'comfortable pacing, allow natural breath and emphasis.' 
      : 'tight pacing required, minimal pauses, crisp delivery.'}
    The voiceover must START within the first 0.5 seconds and 
    END before the final 0.5 seconds of the video.
    Every single word in the script must be spoken — do not 
    cut off or truncate the voiceover.
    
    Voiceover: A ${voiceoverTone} voice narrates: "${voiceoverScript}"
    Voice quality: broadcast professional, perfectly clear, emotionally resonant.
    Voice tone: ${voiceoverTone} — this must be felt in every word.` : ''}
    ${musicMood !== 'None' ? `
    Score: ${musicMood} original music score.
    Music sits underneath any voiceover, never competing.
    Sound design enhances every visual moment.` : ''}
    ${subtitlesEnabled ? `
    Subtitles displayed at ${subtitlePosition} of frame.
    Style: ${subtitleStyle}. Clean, readable, never distracting.` : ''}`;

      veoPrompt = `
COMMERCIAL VIDEO ADVERTISEMENT
Brand: ${brandName || 'Premium Brand'}
Product: ${productName || prompt}
${keyMessage ? `Core Message: "${keyMessage}"` : ''}

CINEMATOGRAPHY:
${styleLanguage[videoStyle] || styleLanguage['Product Showcase']}

MOTION:
${motionLanguage[motionIntensity] || motionLanguage['Moderate']}

ENVIRONMENT:
${settingLanguage[setting] || settingLanguage['Studio']}

COLOR:
${colorLanguage[colorGrade] || colorLanguage['Natural']}

${textLanguage}

${audioLanguage}

TECHNICAL SPECS:
Duration: exactly ${duration} seconds.
Aspect ratio: ${aspectRatio}.
Resolution: Maximum quality, ultra sharp.
Render quality: Photorealistic, indistinguishable from real footage.
Standard: Cannes Lions Grand Prix commercial quality.
Every frame must be beautiful enough to pause on.
      `.trim();
    }

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
