'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import FileDropzone from '@/components/ui/FileDropzone';
import { Download, Check, Loader2 } from 'lucide-react';
import { canGenerate, recordCall } from '@/lib/generationGuard';

const INDUSTRIES = ['E-commerce', 'SaaS', 'Fashion', 'Food & Beverage', 'Real Estate', 'Health & Wellness', 'Finance', 'Other'];
const PLATFORMS = ['Instagram Post', 'Instagram Story', 'Facebook Feed', 'Facebook Story', 'Google Display', 'LinkedIn', 'Twitter/X'];
const STYLES = ['Minimalist', 'Bold', 'Elegant', 'Playful', 'Corporate'];
const TONES = ['Light', 'Dark', 'Brand Colors'];

export default function AdCreativesPage() {
  const { addAd, addToast, generatedAds } = useAppStore();

  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('E-commerce');
  const [brandColor, setBrandColor] = useState('#111111');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [tagline, setTagline] = useState('');
  const [audience, setAudience] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [style, setStyle] = useState('Minimalist');
  const [tone, setTone] = useState('Light');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [results, setResults] = useState<Array<{ imageUrl: string; platform: string; fromCache?: boolean }>>([]);
  const [cooldown, setCooldown] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!brandName || !productName || platforms.length === 0) {
      addToast('Please fill in brand name, product name, and select at least one platform.', 'error');
      return;
    }

    if (!canGenerate('ideogram')) {
      addToast('Slow down — you\'re generating quickly. Wait a moment.', 'info');
      return;
    }

    setLoading(true);
    setResults([]);
    const newResults: Array<{ imageUrl: string; platform: string; fromCache?: boolean; isFast?: boolean }> = [];

    // Sequential generation - one platform at a time
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      setLoadingStatus(`Generating for ${platform}... (${i + 1}/${platforms.length})`);

      const prompt = `A professional ${style.toLowerCase()} advertisement for ${brandName}, a ${industry} brand. Product: ${productName}. Headline text: '${tagline}'. CTA: '${ctaText}'. Target audience: ${audience}. Color palette: ${brandColor} tones. Clean, ${tone.toLowerCase()} design. Commercial advertising quality. No watermarks.`;

      try {
        recordCall('ideogram');
        const res = await fetch('/api/generate-ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform }),
        });

        if (!res.body) {
          throw new Error('No body returned from server');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalData: { success: boolean; data?: { imageUrl: string; platform: string }; error?: string; fromCache?: boolean } | null = null;

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
                setLoadingStatus(`[${platform}] ${parsed.status}`);
              }
              if (parsed.imageUrl && parsed.isFast) {
                const existingIdx = newResults.findIndex(r => r.platform === platform);
                if (existingIdx >= 0) {
                  newResults[existingIdx].imageUrl = parsed.imageUrl;
                } else {
                  newResults.push({ imageUrl: parsed.imageUrl, platform, isFast: true });
                }
                setResults([...newResults]);
              }
              if (parsed.success !== undefined) {
                finalData = parsed;
              }
            } catch (e) {
              console.error('Error parsing line:', e);
            }
          }
        }

        if (finalData && finalData.success && finalData.data?.imageUrl) {
          const ultraUrl = finalData.data.imageUrl;
          const existingIdx = newResults.findIndex(r => r.platform === platform);
          if (existingIdx >= 0) {
            newResults[existingIdx].imageUrl = ultraUrl;
            delete newResults[existingIdx].isFast;
          } else {
            newResults.push({ imageUrl: ultraUrl, platform, fromCache: finalData.fromCache });
          }
          setResults([...newResults]);

          // Save to store
          addAd({
            id: crypto.randomUUID(),
            brandName,
            industry,
            brandColor,
            productName,
            tagline,
            audience,
            ctaText,
            platform,
            style,
            tone,
            imageUrl: ultraUrl,
            timestamp: Date.now(),
          });
        } else {
          addToast(finalData?.error || `Failed to generate for ${platform}`, 'error');
        }
      } catch {
        addToast(`Error generating for ${platform}`, 'error');
      }
    }

    setLoading(false);
    setLoadingStatus('');

    // Cooldown: 15s per platform
    const cooldownTime = platforms.length * 15;
    setCooldown(cooldownTime);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [brandName, industry, brandColor, productName, tagline, audience, ctaText, platforms, style, tone, addAd, addToast]);

  const isDisabled = loading || cooldown > 0 || !brandName || !productName || platforms.length === 0;

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Ad Creatives</h1>
        <p className="text-sm text-[#6B7280] mt-1">Generate professional ad visuals with AI</p>
      </div>

      <div className="flex gap-6">
        {/* Left Panel - Inputs */}
        <div className="w-[380px] flex-shrink-0 space-y-6">
          {/* Step 1 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#111111]">Step 1 — Brand Details</h3>

            <div>
              <label className="text-sm font-medium text-[#374151]">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#374151]">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] bg-white"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#374151]">Brand Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 border border-[#E5E7EB] rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <FileDropzone
              label="Brand Logo (optional)"
              onFileSelect={(_, preview) => setBrandLogo(preview)}
              preview={brandLogo}
              compact
            />
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#111111]">Step 2 — Ad Details</h3>

            <div>
              <label className="text-sm font-medium text-[#374151]">Product/Service Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                placeholder="SuperWidget Pro"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#374151]">Key Message / Tagline</label>
              <textarea
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                maxLength={100}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111] resize-none h-16"
                placeholder="The future of productivity"
              />
              <p className="text-xs text-[#9CA3AF] text-right">{tagline.length}/100</p>
            </div>

            <div>
              <label className="text-sm font-medium text-[#374151]">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                placeholder="Young professionals aged 25-35"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#374151]">CTA Text</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                placeholder="Shop Now"
              />
            </div>

            <PillSelect
              label="Platform"
              options={PLATFORMS}
              value={platforms}
              onChange={(val) => setPlatforms(val as string[])}
              multi
              maxSelect={4}
            />
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#111111]">Step 3 — Style</h3>
            <PillSelect label="Visual Style" options={STYLES} value={style} onChange={(v) => setStyle(v as string)} />
            <PillSelect label="Color Tone" options={TONES} value={tone} onChange={(v) => setTone(v as string)} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isDisabled}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isDisabled
                ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                : 'bg-[#111111] text-white hover:bg-[#333333]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {loadingStatus}
              </>
            ) : cooldown > 0 ? (
              `Cooling down (${cooldown}s)...`
            ) : (
              'Generate Ad Creatives'
            )}
          </button>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1">
          {loading && results.length === 0 && (
            <div className="grid grid-cols-2 gap-4">
              {platforms.map((p) => (
                <div key={p} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden animate-pulse-subtle">
                  <div className="h-48 bg-[#F4F4F5]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#F4F4F5] rounded w-3/4" />
                    <div className="h-3 bg-[#F4F4F5] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {results.map((result, idx) => (
                <div key={idx} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.imageUrl} alt={result.platform} className="w-full h-48 object-cover" />
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-[#F4F4F5] text-[#374151] px-2 py-0.5 rounded">{result.platform}</span>
                      {result.fromCache && (
                        <span className="text-xs text-[#9CA3AF]">Cached</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={result.imageUrl}
                        download={`ad-${result.platform.toLowerCase().replace(/\s+/g, '-')}.png`}
                        className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => addToast('Saved to Downloads!', 'success')}
                        className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && generatedAds.length === 0 && (
            <div className="flex items-center justify-center h-64 bg-white border border-[#E5E7EB] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">Fill in the details and click Generate to create ad creatives</p>
            </div>
          )}

          {!loading && results.length === 0 && generatedAds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#111111] mb-4">Previous Generations</h3>
              <div className="grid grid-cols-2 gap-4">
                {generatedAds.slice(0, 8).map((ad) => (
                  <div key={ad.id} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ad.imageUrl} alt={ad.platform} className="w-full h-48 object-cover" />
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-xs font-medium bg-[#F4F4F5] text-[#374151] px-2 py-0.5 rounded">{ad.platform}</span>
                      {ad.score && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          ad.score >= 71 ? 'bg-green-50 text-green-700' :
                          ad.score >= 41 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>{ad.score}/100</span>
                      )}
                      <a href={ad.imageUrl} download className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]">
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
