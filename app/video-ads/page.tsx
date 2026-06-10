'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import FileDropzone from '@/components/ui/FileDropzone';
import { Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const VIDEO_STYLES = ['Product Showcase', 'UGC Style', 'Cinematic', 'Minimal', 'UGC Creator'];
const DURATIONS = ['4s', '6s', '8s'];
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'];
const MOTION = ['Subtle', 'Moderate', 'Dynamic'];

const TEXT_POSITIONS = ['Top', 'Center', 'Bottom', 'Lower Third'];
const TEXT_STYLES = ['Bold', 'Minimal', 'Elegant', 'Streetwear'];

const VOICEOVER_TONES = ['Energetic', 'Calm', 'Authoritative', 'Friendly', 'Luxury'];
const MUSIC_MOODS = ['Upbeat', 'Cinematic', 'Minimal', 'Dramatic', 'None'];

const SUBTITLE_POSITIONS = ['Bottom', 'Top'];
const SUBTITLE_STYLES = ['Clean', 'Bold', 'Highlighted'];

const COLOR_GRADES = ['Natural', 'Warm', 'Cold', 'High Contrast', 'Cinematic Teal-Orange'];
const SETTINGS = ['Studio', 'Outdoor', 'Urban', 'Home', 'Abstract'];

export default function VideoAdsPage() {
  const { addVideo, addToast, isFalJobRunning, setFalJobRunning } = useAppStore();

  // Section 1 — Brand & Product
  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [keyMessage, setKeyMessage] = useState('');

  // Section 2 — Video Content
  const [mode, setMode] = useState<'image' | 'text'>('text');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState('');
  const [videoStyle, setVideoStyle] = useState('Product Showcase');
  const [duration, setDuration] = useState('4s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [motionIntensity, setMotionIntensity] = useState('Moderate');

  // Creator Details (Conditional on videoStyle === 'UGC Creator')
  const [creatorDescription, setCreatorDescription] = useState('');
  const [creatorPosition, setCreatorPosition] = useState('Standing');
  const [productInteraction, setProductInteraction] = useState('Holding');
  const [creatorScript, setCreatorScript] = useState('');
  const [energyLevel, setEnergyLevel] = useState('Authentic');
  const [ugcSetting, setUgcSetting] = useState('Bedroom');

  // Section 3 — Text Overlays
  const [headlineText, setHeadlineText] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [textPosition, setTextPosition] = useState('Center');
  const [textStyle, setTextStyle] = useState('Bold');

  // Section 4 — Audio & Dialogue
  const [voiceoverScript, setVoiceoverScript] = useState('');
  const [voiceoverTone, setVoiceoverTone] = useState('Friendly');
  const [musicMood, setMusicMood] = useState('Upbeat');

  // Section 5 — Subtitles
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitlePosition, setSubtitlePosition] = useState('Bottom');
  const [subtitleStyle, setSubtitleStyle] = useState('Clean');

  // Section 6 — Scene & Mood
  const [colorGrade, setColorGrade] = useState('Natural');
  const [setting, setSetting] = useState('Studio');

  // Expand/Collapse States
  const [brandExpanded, setBrandExpanded] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(true);
  const [creatorExpanded, setCreatorExpanded] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [sceneExpanded, setSceneExpanded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const voWordCount = voiceoverScript ? voiceoverScript.trim().split(/\s+/).filter(Boolean).length : 0;
  const voDurationNum = parseInt(duration) || 4;
  const voMaxWords = Math.floor(voDurationNum * 2.5);

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
    if (mode === 'text' && !textPrompt && !productName) {
      addToast('Please enter a text description or product name.', 'error');
      return;
    }

    if (isFalJobRunning) {
      addToast('A generation is already in progress. Please wait.', 'info');
      return;
    }

    setLoading(true);
    setFalJobRunning(true);
    setVideoUrl(null);
    setLoadingStatus('Building your ad...');

    try {
      setLoadingStatus('Submitting to Veo 3.0...');

      const prompt = textPrompt; // the description textarea maps to prompt

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageUrl: mode === 'image' ? productImage : undefined,
          mode,
          duration,
          aspectRatio,
          brandName,
          productName,
          keyMessage,
          videoStyle,
          motionIntensity,
          headlineText,
          subheadline,
          ctaText,
          textPosition,
          textStyle,
          voiceoverScript,
          voiceoverTone,
          musicMood,
          subtitlesEnabled,
          subtitlePosition,
          subtitleStyle,
          colorGrade,
          setting,
          // UGC Creator fields
          creatorDescription: videoStyle === 'UGC Creator' ? creatorDescription : undefined,
          creatorPosition: videoStyle === 'UGC Creator' ? creatorPosition : undefined,
          productInteraction: videoStyle === 'UGC Creator' ? productInteraction : undefined,
          creatorScript: videoStyle === 'UGC Creator' ? creatorScript : undefined,
          energyLevel: videoStyle === 'UGC Creator' ? energyLevel : undefined,
          ugcSetting: videoStyle === 'UGC Creator' ? ugcSetting : undefined,
        }),
      });

      const postData = await res.json();

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

      if (!operationName) {
        throw new Error('No operation name returned');
      }

      setLoadingStatus('Generating video...');

      let elapsed = 0;
      const maxElapsed = 180000;
      const pollIntervalId = setInterval(async () => {
        elapsed += 5000;

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
          const pollData = await pollRes.json();

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
  }, [
    mode, productImage, textPrompt, videoStyle, duration, aspectRatio, motionIntensity,
    brandName, productName, keyMessage, headlineText, subheadline, ctaText, textPosition, textStyle,
    voiceoverScript, voiceoverTone, musicMood, subtitlesEnabled, subtitlePosition, subtitleStyle,
    colorGrade, setting, creatorDescription, creatorPosition, productInteraction, creatorScript,
    energyLevel, ugcSetting, addVideo, addToast, isFalJobRunning, setFalJobRunning
  ]);

  const isDisabled = loading || !mode;

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Video Ads</h1>
        <p className="text-sm text-[#6B7280] mt-1">Generate short video ads with AI</p>
      </div>

      <div className="flex gap-6">
        {/* Left Input Panel */}
        <div className="w-[380px] flex-shrink-0 space-y-6">
          
          {/* SECTION 1 — Brand & Product */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setBrandExpanded(!brandExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Brand & Product</span>
              {brandExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {brandExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                <div>
                  <label className="text-sm font-medium text-[#374151]">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="e.g. Apple"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#374151]">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="e.g. iPhone 17 Pro Max"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#374151]">Key Message / Tagline</label>
                  <input
                    type="text"
                    value={keyMessage}
                    onChange={(e) => setKeyMessage(e.target.value.slice(0, 80))}
                    maxLength={80}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="e.g. The future is here"
                  />
                  <p className="text-xs text-[#9CA3AF] text-right mt-1">{keyMessage.length}/80</p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 — Video Content */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setContentExpanded(!contentExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Video Content</span>
              {contentExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {contentExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
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
            )}
          </div>

          {/* Section: Creator Details (Conditional on videoStyle === 'UGC Creator') */}
          {videoStyle === 'UGC Creator' && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
              <button
                onClick={() => setCreatorExpanded(!creatorExpanded)}
                className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
              >
                <span>Creator Details</span>
                {creatorExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {creatorExpanded && (
                <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                  <div>
                    <label className="text-sm font-medium text-[#374151]">Creator Appearance</label>
                    <input
                      type="text"
                      value={creatorDescription}
                      onChange={(e) => setCreatorDescription(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                      placeholder="e.g. Young woman, casual style, energetic"
                    />
                    <p className="text-xs text-[#9CA3AF] mt-1">Describe the AI creator's look and style</p>
                  </div>

                  <PillSelect
                    label="Creator Position"
                    options={['Standing', 'Sitting', 'Walking', 'Random']}
                    value={creatorPosition}
                    onChange={(v) => setCreatorPosition(v as string)}
                  />

                  <PillSelect
                    label="Product Interaction"
                    options={['Holding', 'Unboxing', 'Demonstrating', 'Reviewing', 'Gesturing toward']}
                    value={productInteraction}
                    onChange={(v) => setProductInteraction(v as string)}
                  />

                  <div>
                    <label className="text-sm font-medium text-[#374151]">Creator Script</label>
                    <textarea
                      value={creatorScript}
                      onChange={(e) => setCreatorScript(e.target.value.slice(0, 200))}
                      maxLength={200}
                      className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] resize-none h-20"
                      placeholder="Write what the creator says about the product..."
                    />
                    <p className="text-xs text-[#9CA3AF] text-right mt-1">{creatorScript.length}/200</p>
                  </div>

                  <PillSelect
                    label="Energy Level"
                    options={['Excited', 'Calm', 'Authentic', 'Professional', 'Hype']}
                    value={energyLevel}
                    onChange={(v) => setEnergyLevel(v as string)}
                  />

                  <PillSelect
                    label="Setting for UGC"
                    options={['Bedroom', 'Kitchen', 'Office', 'Outdoor', 'Gym', 'Coffee Shop']}
                    value={ugcSetting}
                    onChange={(v) => setUgcSetting(v as string)}
                  />
                </div>
              )}
            </div>
          )}

          {/* SECTION 3 — Text Overlays */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setTextExpanded(!textExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Text Overlays</span>
              {textExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {textExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                <div>
                  <label className="text-sm font-medium text-[#374151]">Headline Text</label>
                  <input
                    type="text"
                    value={headlineText}
                    onChange={(e) => setHeadlineText(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="Main text shown on screen"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#374151]">Subheadline</label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="Secondary text or description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#374151]">CTA Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    placeholder="e.g. Shop Now, Learn More, Get Started"
                  />
                </div>
                <PillSelect label="Text Position" options={TEXT_POSITIONS} value={textPosition} onChange={(v) => setTextPosition(v as string)} />
                <PillSelect label="Text Style" options={TEXT_STYLES} value={textStyle} onChange={(v) => setTextStyle(v as string)} />
              </div>
            )}
          </div>

          {/* SECTION 4 — Audio & Dialogue */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setAudioExpanded(!audioExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Audio & Dialogue</span>
              {audioExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {audioExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                <div>
                  <label className="text-sm font-medium text-[#374151]">Voiceover Script</label>
                  <textarea
                    value={voiceoverScript}
                    onChange={(e) => setVoiceoverScript(e.target.value.slice(0, 300))}
                    maxLength={300}
                    className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] resize-none h-24"
                    placeholder="Write what should be spoken in the video..."
                  />
                  <p className="text-xs text-[#9CA3AF] text-right mt-1">{voiceoverScript.length}/300</p>
                  {voiceoverScript && (
                    voWordCount > voMaxWords ? (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        ⚠️ {voWordCount} words may be tight for {duration}. Recommended max: {voMaxWords} words.
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ✓ Good fit for {duration}
                      </p>
                    )
                  )}
                </div>
                <PillSelect label="Voiceover Tone" options={VOICEOVER_TONES} value={voiceoverTone} onChange={(v) => setVoiceoverTone(v as string)} />
                <PillSelect label="Background Music Mood" options={MUSIC_MOODS} value={musicMood} onChange={(v) => setMusicMood(v as string)} />
              </div>
            )}
          </div>

          {/* SECTION 5 — Subtitles */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setSubtitlesExpanded(!subtitlesExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Subtitles</span>
              {subtitlesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {subtitlesExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#374151]">Enable Subtitles</label>
                  <input
                    type="checkbox"
                    checked={subtitlesEnabled}
                    onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#111111] border-[#E5E7EB] rounded focus:ring-[#111111]"
                  />
                </div>
                {subtitlesEnabled && (
                  <>
                    <PillSelect label="Subtitle Position" options={SUBTITLE_POSITIONS} value={subtitlePosition} onChange={(v) => setSubtitlePosition(v as string)} />
                    <PillSelect label="Subtitle Style" options={SUBTITLE_STYLES} value={subtitleStyle} onChange={(v) => setSubtitleStyle(v as string)} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* SECTION 6 — Scene & Mood */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <button
              onClick={() => setSceneExpanded(!sceneExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#111111] focus:outline-none"
            >
              <span>Scene & Mood</span>
              {sceneExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {sceneExpanded && (
              <div className="space-y-4 pt-2 border-t border-[#F3F4F6]">
                <PillSelect label="Color Grade" options={COLOR_GRADES} value={colorGrade} onChange={(v) => setColorGrade(v as string)} />
                <PillSelect label="Setting" options={SETTINGS} value={setting} onChange={(v) => setSetting(v as string)} />
              </div>
            )}
          </div>

          {/* Generate Button */}
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

        {/* Right Panel - Result */}
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
