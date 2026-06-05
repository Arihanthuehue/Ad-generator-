import { NextRequest, NextResponse } from 'next/server';
import { setCached } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const operation = searchParams.get('operation');
    const cacheKey = searchParams.get('cacheKey');

    if (!operation) {
      return NextResponse.json({ success: false, error: 'Operation name is required' }, { status: 400 });
    }

    console.log('Polling operation:', operation);

    const pollRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operation}?key=${apiKey}`,
      { method: 'GET' }
    );

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      return NextResponse.json({ success: false, error: `Failed to poll Veo job status: ${pollRes.status} ${errText}` }, { status: pollRes.status });
    }

    const pollData = await pollRes.json();
    console.log('Poll response:', JSON.stringify(pollData, null, 2));

    if (pollData.done === true) {
      if (pollData.error) {
        return NextResponse.json({ success: false, error: `Veo generation failed: ${pollData.error.message || 'Unknown error'}` });
      }

      console.log('Full Veo done response:', JSON.stringify(pollData, null, 2));

      const sample = pollData?.response?.generateVideoResponse?.generatedSamples?.[0];
      const videoUri = sample?.video?.uri;
      const videoBytes = sample?.video?.bytesBase64Encoded;

      if (videoUri) {
        // Download the video from the URI and convert to base64
        const videoRes = await fetch(`${videoUri}&key=${apiKey}`);
        if (!videoRes.ok) {
          return NextResponse.json({ 
            success: false, 
            error: `Failed to download video: ${videoRes.status}` 
          });
        }
        const videoBuffer = await videoRes.arrayBuffer();
        const videoBase64 = Buffer.from(videoBuffer).toString('base64');
        const videoUrl = `data:video/mp4;base64,${videoBase64}`;
        
        if (cacheKey) setCached(cacheKey, { videoUrl }, 86400);
        return NextResponse.json({ success: true, done: true, videoUrl });
      }

      if (videoBytes) {
        const videoUrl = `data:video/mp4;base64,${videoBytes}`;
        if (cacheKey) setCached(cacheKey, { videoUrl }, 86400);
        return NextResponse.json({ success: true, done: true, videoUrl });
      }

      return NextResponse.json({ 
        success: false, 
        error: 'No video data in response' 
      });
    }

    return NextResponse.json({ success: true, done: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
