'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import FileDropzone from '@/components/ui/FileDropzone';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { canGenerate, recordCall } from '@/lib/generationGuard';

const SCORE_PLATFORMS = ['Instagram', 'Facebook', 'Google', 'LinkedIn'];
const GOALS = ['Brand Awareness', 'Lead Generation', 'Sales', 'Engagement'];

interface ScoreData {
  overallScore: number;
  subScores: {
    visualAppeal: number;
    messageClarity: number;
    ctaStrength: number;
    audienceFit: number;
    platformSuitability: number;
  };
  strengths: string[];
  improvements: string[];
}

export default function CreativeScorePage() {
  const { addCreativeScore, addToast, generatedAds } = useAppStore();

  const [imageData, setImageData] = useState<string | null>(null);
  const [platform, setPlatform] = useState('Instagram');
  const [goal, setGoal] = useState('Brand Awareness');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score counting up
  const animateScore = useCallback((target: number) => {
    let current = 0;
    const step = Math.ceil(target / 40);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedScore(current);
      if (current >= target) clearInterval(interval);
    }, 30);
  }, []);

  const handleAnalyse = useCallback(async () => {
    if (!imageData) {
      addToast('Please upload or select an ad image.', 'error');
      return;
    }

    if (!canGenerate('gemini')) {
      addToast('Slow down — AI is rate limited. Wait a moment.', 'info');
      return;
    }

    setLoading(true);
    setScore(null);
    setAnimatedScore(0);

    try {
      recordCall('gemini');
      const res = await fetch('/api/score-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageData, platform, goal }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setScore(data.data as ScoreData);
        animateScore((data.data as ScoreData).overallScore);

        addCreativeScore({
          id: crypto.randomUUID(),
          imageUrl: imageData.substring(0, 100),
          platform,
          goal,
          ...(data.data as ScoreData),
          timestamp: Date.now(),
        });
      } else {
        addToast(data.error || 'Failed to score creative', 'error');
      }
    } catch {
      addToast('Error scoring creative', 'error');
    }

    setLoading(false);
  }, [imageData, platform, goal, addCreativeScore, addToast, animateScore]);

  const scoreColor = (val: number) => val >= 71 ? '#22c55e' : val >= 41 ? '#f59e0b' : '#ef4444';

  const subScoreLabels: Array<{ key: keyof ScoreData['subScores']; label: string }> = [
    { key: 'visualAppeal', label: 'Visual Appeal' },
    { key: 'messageClarity', label: 'Message Clarity' },
    { key: 'ctaStrength', label: 'CTA Strength' },
    { key: 'audienceFit', label: 'Audience Fit' },
    { key: 'platformSuitability', label: 'Platform Suitability' },
  ];

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Creative Score</h1>
        <p className="text-sm text-[#6B7280] mt-1">Analyse ad creatives with AI-powered scoring</p>
      </div>

      <div className="flex gap-6">
        <div className="w-[380px] flex-shrink-0 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <FileDropzone
              label="Upload Ad Image"
              onFileSelect={(_, preview) => setImageData(preview)}
              preview={imageData}
            />

            {generatedAds.length > 0 && !imageData && (
              <div>
                <label className="text-sm font-medium text-[#374151]">Or select a recent ad</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {generatedAds.slice(0, 6).map((ad) => (
                    <button
                      key={ad.id}
                      onClick={() => setImageData(ad.imageUrl)}
                      className="border border-[#E5E7EB] rounded-lg overflow-hidden hover:border-[#111111]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ad.imageUrl} alt="Ad" className="w-full h-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <PillSelect label="Platform Context" options={SCORE_PLATFORMS} value={platform} onChange={(v) => setPlatform(v as string)} />
            <PillSelect label="Campaign Goal" options={GOALS} value={goal} onChange={(v) => setGoal(v as string)} />
          </div>

          <button
            onClick={handleAnalyse}
            disabled={loading || !imageData}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              loading || !imageData ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed' : 'bg-[#111111] text-white hover:bg-[#333333]'
            }`}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />Analysing...</> : 'Analyse Creative'}
          </button>
        </div>

        <div className="flex-1">
          {loading && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center">
              <Loader2 size={32} className="animate-spin mx-auto text-[#9CA3AF] mb-4" />
              <p className="text-sm text-[#6B7280]">Analysing your creative...</p>
            </div>
          )}

          {score && (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex items-center gap-8">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#F4F4F5" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={scoreColor(animatedScore)}
                      strokeWidth="8"
                      strokeDasharray={`${(animatedScore / 100) * 264} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: scoreColor(animatedScore) }}>{animatedScore}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#111111]">Overall Score</h3>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {animatedScore >= 71 ? 'Great creative!' : animatedScore >= 41 ? 'Room for improvement' : 'Needs significant work'}
                  </p>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-[#111111]">Breakdown</h3>
                {subScoreLabels.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#374151]">{label}</span>
                      <span className="font-medium" style={{ color: scoreColor(score.subScores[key]) }}>
                        {score.subScores[key]}
                      </span>
                    </div>
                    <div className="h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${score.subScores[key]}%`, backgroundColor: scoreColor(score.subScores[key]) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" /> What&apos;s Working
                  </h3>
                  <ul className="space-y-2">
                    {score.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-[#374151] flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" /> Improve This
                  </h3>
                  <ul className="space-y-2">
                    {score.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-[#374151] flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!loading && !score && (
            <div className="flex items-center justify-center h-64 bg-white border border-[#E5E7EB] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">Upload an ad image to get an AI-powered creative score</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
