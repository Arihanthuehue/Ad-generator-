'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import FileDropzone from '@/components/ui/FileDropzone';
import { Download, Loader2 } from 'lucide-react';

const VIDEO_STYLES = ['Product Showcase', 'UGC Style', 'Cinematic', 'Minimal'];
const DURATIONS = ['4s', '6s', '8s'];
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'];
const MOTION = ['Subtle', 'Moderate', 'Dynamic'];

export default function VideoAdsPage() {
  const { addVideo, addToast, isFalJobRunning, setFalJobRunning } = useAppStore();

  const [mode, setMode] = useState<'image' | 'text'>('text');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState('');
  const [videoStyle, setVideoStyle] = useState('Product Showcase');
  const [duration, setDuration] = useState('4s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [motionIntensity, setMotionIntensity] = useState('Moderate');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (mode === 'image' && !productImage) {
      addToast('Please upload a product image.', 'error');
      return;
    }
    if (mode === 'text' && !textPrompt) {
      addToast('Please enter a text description.', 'error');
      return;
    }

    if (isFalJobRunning) {
      addToast('A generation is already in progress. Please wait.', 'info');
      return;
    }

    setLoading(true);
    setFalJobRunning(true);
    setVideoUrl(null);
    setLoadingStatus('Initializing...');

    const statusMessages = ['Generating frames...', 'Rendering video...', 'Almost ready...'];
    let msgIdx = 0;
    const statusInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, statusMessages.length - 1);
      setLoadingStatus(statusMessages[msgIdx]);
    }, 15000);

    try {
      const prompt = mode === 'text'
        ? `${videoStyle} video ad: ${textPrompt}. ${motionIntensity} motion.`
        : `${videoStyle} product showcase video. ${motionIntensity} motion.`;

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageUrl: mode === 'image' ? productImage : undefined,
          mode,
          duration,
          aspectRatio,
          motionIntensity,
        }),
      });

      if (!res.body) {
        throw new Error('No body returned from server');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: { success: boolean; data?: { videoUrl: string }; error?: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.status) {
              setLoadingStatus(parsed.status);
            }
            if (parsed.success !== undefined) {
              finalData = parsed;
            }
          } catch (e) {
            console.error('Error parsing line:', e);
          }
        }
      }

      if (finalData && finalData.success && finalData.data?.videoUrl) {
        setVideoUrl(finalData.data.videoUrl);
        addVideo({
          id: crypto.randomUUID(),
          mode,
          videoUrl: finalData.data.videoUrl,
          style: videoStyle,
          duration,
          aspectRatio,
          motionIntensity,
          promptOrImage: mode === 'text' ? textPrompt : 'Image upload',
          timestamp: Date.now(),
        });
        addToast('Video generated successfully!', 'success');
      } else {
        addToast(finalData?.error || 'Failed to generate video', 'error');
      }
    } catch {
      addToast('Error generating video', 'error');
    }

    clearInterval(statusInterval);
    setLoading(false);
    setFalJobRunning(false);
    setLoadingStatus('');
  }, [mode, productImage, textPrompt, videoStyle, duration, aspectRatio, motionIntensity, addVideo, addToast, isFalJobRunning, setFalJobRunning]);

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Video Ads</h1>
        <p className="text-sm text-[#6B7280] mt-1">Generate short video ads with AI</p>
      </div>

      <div className="flex gap-6">
        <div className="w-[380px] flex-shrink-0 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#374151] mb-2 block">Generation Mode</label>
              <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'text' ? 'bg-[#111111] text-white' : 'bg-white text-[#6B7280]'}`}
                >
                  From Text
                </button>
                <button
                  onClick={() => setMode('image')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'image' ? 'bg-[#111111] text-white' : 'bg-white text-[#6B7280]'}`}
                >
                  From Image
                </button>
              </div>
            </div>

            {mode === 'image' ? (
              <FileDropzone
                label="Product Image"
                onFileSelect={(_, preview) => setProductImage(preview)}
                preview={productImage}
              />
            ) : (
              <div>
                <label className="text-sm font-medium text-[#374151]">Text Description</label>
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] resize-none h-24"
                  placeholder="Describe the video you want..."
                />
              </div>
            )}

            <PillSelect label="Video Style" options={VIDEO_STYLES} value={videoStyle} onChange={(v) => setVideoStyle(v as string)} />
            <PillSelect label="Duration" options={DURATIONS} value={duration} onChange={(v) => setDuration(v as string)} />
            <PillSelect label="Aspect Ratio" options={ASPECT_RATIOS} value={aspectRatio} onChange={(v) => setAspectRatio(v as string)} />
            <PillSelect label="Motion Intensity" options={MOTION} value={motionIntensity} onChange={(v) => setMotionIntensity(v as string)} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              loading ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed' : 'bg-[#111111] text-white hover:bg-[#333333]'
            }`}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />{loadingStatus}</> : 'Generate Video Ad'}
          </button>

          <p className="text-xs text-[#9CA3AF] text-center">Video generation takes 30-90 seconds. Please wait after clicking generate.</p>
        </div>

        <div className="flex-1">
          {loading && !videoUrl && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center">
              <Loader2 size={32} className="animate-spin mx-auto text-[#9CA3AF] mb-4" />
              <p className="text-sm font-medium text-[#374151]">{loadingStatus}</p>
              <div className="mt-4 h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#111111] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <video src={videoUrl} controls className="w-full" />
              <div className="p-4 flex items-center gap-3">
                <a
                  href={videoUrl}
                  download="video-ad.mp4"
                  className="flex items-center gap-2 px-4 py-2 bg-[#111111] text-white rounded-lg text-sm font-medium hover:bg-[#333333]"
                >
                  <Download size={14} /> Download MP4
                </a>
                <button
                  onClick={() => { setVideoUrl(null); }}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F4F4F5]"
                >
                  Generate Another
                </button>
              </div>
            </div>
          )}

          {!loading && !videoUrl && (
            <div className="flex items-center justify-center h-64 bg-white border border-[#E5E7EB] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">Configure your video settings and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
