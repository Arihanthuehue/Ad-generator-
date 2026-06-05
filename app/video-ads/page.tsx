'use client';

import { useState, useCallback, useEffect } from 'react';
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

  useEffect(() => {
    setFalJobRunning(false);
    setLoading(false);
    setLoadingStatus('');
  }, [setFalJobRunning]);

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

    try {
      console.log('handleGenerate called');
      setLoading(true);
      setFalJobRunning(true);
      setVideoUrl(null);
      setLoadingStatus('Initializing...');

      const prompt = mode === 'text'
        ? `${videoStyle} video ad: ${textPrompt}. ${motionIntensity} motion.`
        : `${videoStyle} product showcase video. ${motionIntensity} motion.`;

      console.log('Submitting with prompt:', prompt);

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

      console.log('Response status:', res.status, res.ok);
      const postData = await res.json();
      console.log('Response data:', JSON.stringify(postData));

      if (!postData.success) {
        throw new Error(postData.error || 'Failed to submit job');
      }

      if (postData.videoUrl) {
        setVideoUrl(postData.videoUrl);
        setLoading(false);
        setFalJobRunning(false);
        setLoadingStatus('');
        addToast('Video loaded from cache!', 'success');
        return;
      }

      const { operationName, cacheKey } = postData;
      console.log('Operation name:', operationName);

      if (!operationName) {
        throw new Error('No operation name returned');
      }

      setLoadingStatus('Video submitted, generating...');

      let elapsed = 0;
      const maxElapsed = 180000;
      const pollIntervalId = setInterval(async () => {
        elapsed += 5000;
        console.log('Polling... elapsed:', elapsed);

        if (elapsed >= maxElapsed) {
          clearInterval(pollIntervalId);
          setLoading(false);
          setFalJobRunning(false);
          setLoadingStatus('');
          addToast('Video generation timed out', 'error');
          return;
        }

        if (elapsed <= 15000) setLoadingStatus('Generating video...');
        else if (elapsed <= 60000) setLoadingStatus('Processing frames...');
        else setLoadingStatus('Almost ready...');

        try {
          const cacheParam = cacheKey ? `&cacheKey=${encodeURIComponent(cacheKey)}` : '';
          const pollRes = await fetch(
            `/api/generate-video/poll?operation=${encodeURIComponent(operationName)}${cacheParam}`
          );
          console.log('Poll response status:', pollRes.status);
          const pollData = await pollRes.json();
          console.log('Poll data:', JSON.stringify(pollData));

          if (pollData.done && pollData.videoUrl) {
            clearInterval(pollIntervalId);
            setVideoUrl(pollData.videoUrl);
            addVideo({
              id: crypto.randomUUID(),
              mode,
              videoUrl: pollData.videoUrl,
              style: videoStyle,
              duration,
              aspectRatio,
              motionIntensity,
              promptOrImage: mode === 'text' ? textPrompt : 'Image upload',
              timestamp: Date.now(),
            });
            setLoading(false);
            setFalJobRunning(false);
            setLoadingStatus('');
            addToast('Video generated successfully!', 'success');
          }

          if (!pollData.success) {
            throw new Error(pollData.error || 'Polling error');
          }
        } catch (pollErr) {
          console.error('Poll error:', pollErr);
          clearInterval(pollIntervalId);
          setLoading(false);
          setFalJobRunning(false);
          setLoadingStatus('');
          addToast(pollErr instanceof Error ? pollErr.message : 'Polling failed', 'error');
        }
      }, 5000);

    } catch (err) {
      console.error('FULL ERROR:', err);
      setLoading(false);
      setFalJobRunning(false);
      setLoadingStatus('');
      addToast(err instanceof Error ? err.message : 'Failed to generate video', 'error');
    }
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
            onClick={() => {
              console.log('BUTTON CLICKED');
              handleGenerate();
            }}
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
