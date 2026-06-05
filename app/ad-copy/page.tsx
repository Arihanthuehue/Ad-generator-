'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import { Copy, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { canGenerate, recordCall } from '@/lib/generationGuard';

const TONES = ['Professional', 'Friendly', 'Urgent', 'Witty', 'Inspirational'];
const COPY_PLATFORMS = ['Facebook', 'Instagram', 'Google', 'LinkedIn', 'Twitter/X', 'Email'];
const VARIATION_COUNTS = ['3', '5', '10'];

export default function AdCopyPage() {
  const { addCopy, addToast, generatedCopies, toggleCopyFeedback } = useAppStore();

  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [benefit, setBenefit] = useState('');
  const [tone, setTone] = useState('Professional');
  const [platform, setPlatform] = useState('Facebook');
  const [variationCount, setVariationCount] = useState('3');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ headline: string; primaryText: string; cta: string; characterCounts: { headline: number; primaryText: number; cta: number } }>>([]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  const handleGenerate = useCallback(async () => {
    if (!brandName || !productName) {
      addToast('Please fill in brand name and product name.', 'error');
      return;
    }

    if (!canGenerate('gemini')) {
      addToast('Slow down — AI is rate limited. Wait a moment.', 'info');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      recordCall('gemini');
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, productName, benefit, tone, platform, variations: Number(variationCount) }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setResults(data.data);

        // Save each variation to store
        data.data.forEach((item: { headline: string; primaryText: string; cta: string; characterCounts: { headline: number; primaryText: number; cta: number } }) => {
          addCopy({
            id: crypto.randomUUID(),
            brandName,
            productName,
            benefit,
            tone,
            platform,
            headline: item.headline,
            primaryText: item.primaryText,
            cta: item.cta,
            characterCounts: item.characterCounts,
            timestamp: Date.now(),
          });
        });
      } else {
        addToast(data.error || 'Failed to generate copy', 'error');
      }
    } catch {
      addToast('Error generating copy', 'error');
    }

    setLoading(false);
  }, [brandName, productName, benefit, tone, platform, variationCount, addCopy, addToast]);

  // For display — use results if fresh, otherwise show stored copies
  const displayCopies = results.length > 0 ? results : [];

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Ad Copy</h1>
        <p className="text-sm text-[#6B7280] mt-1">Generate compelling ad copy with AI</p>
      </div>

      <div className="flex gap-6">
        <div className="w-[380px] flex-shrink-0 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#374151]">Brand Name</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#374151]">Product/Service</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]" placeholder="SuperWidget Pro" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#374151]">Key Benefit</label>
              <textarea value={benefit} onChange={(e) => setBenefit(e.target.value)} className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] resize-none h-20" placeholder="What problem does it solve?" />
            </div>
            <PillSelect label="Tone of Voice" options={TONES} value={tone} onChange={(v) => setTone(v as string)} />
            <PillSelect label="Platform" options={COPY_PLATFORMS} value={platform} onChange={(v) => setPlatform(v as string)} />
            <PillSelect label="Number of Variations" options={VARIATION_COUNTS} value={variationCount} onChange={(v) => setVariationCount(v as string)} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !brandName || !productName}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              loading || !brandName || !productName
                ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                : 'bg-[#111111] text-white hover:bg-[#333333]'
            }`}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />Generating copy...</> : 'Generate Ad Copy'}
          </button>
        </div>

        <div className="flex-1 space-y-4">
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: Number(variationCount) }).map((_, i) => (
                <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-5 animate-pulse-subtle">
                  <div className="h-5 bg-[#F4F4F5] rounded w-3/4 mb-3" />
                  <div className="h-4 bg-[#F4F4F5] rounded w-full mb-2" />
                  <div className="h-4 bg-[#F4F4F5] rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {displayCopies.map((item, idx) => {
            const storedCopy = generatedCopies.find(c => c.headline === item.headline);
            return (
              <div key={idx} className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-[#111111]">{item.headline}</h3>
                  <button onClick={() => copyToClipboard(item.headline)} className="p-1 text-[#9CA3AF] hover:text-[#111111]">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-[#374151] leading-relaxed">{item.primaryText}</p>
                  <button onClick={() => copyToClipboard(item.primaryText)} className="p-1 text-[#9CA3AF] hover:text-[#111111] flex-shrink-0 ml-2">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#F4F4F5]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium bg-[#111111] text-white px-2.5 py-1 rounded">{item.cta}</span>
                    <button onClick={() => copyToClipboard(item.cta)} className="p-1 text-[#9CA3AF] hover:text-[#111111]">
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <span>H:{item.characterCounts?.headline || 0}</span>
                    <span>P:{item.characterCounts?.primaryText || 0}</span>
                    <span>C:{item.characterCounts?.cta || 0}</span>
                  </div>
                </div>
                {storedCopy && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => toggleCopyFeedback(storedCopy.id, 'up')}
                      className={`p-1.5 rounded border ${storedCopy.thumbsUp ? 'bg-green-50 border-green-200 text-green-600' : 'border-[#E5E7EB] text-[#9CA3AF] hover:text-[#111111]'}`}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => toggleCopyFeedback(storedCopy.id, 'down')}
                      className={`p-1.5 rounded border ${storedCopy.thumbsDown ? 'bg-red-50 border-red-200 text-red-600' : 'border-[#E5E7EB] text-[#9CA3AF] hover:text-[#111111]'}`}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && displayCopies.length === 0 && (
            <div className="flex items-center justify-center h-64 bg-white border border-[#E5E7EB] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">Fill in the details and generate compelling ad copy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
