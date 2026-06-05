'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PillSelect from '@/components/ui/PillSelect';
import FileDropzone from '@/components/ui/FileDropzone';
import { Download, Loader2 } from 'lucide-react';

const SCENES = ['Studio White', 'Lifestyle Home', 'Outdoor Nature', 'Urban Street', 'Luxury Minimal', 'E-commerce Clean', 'Custom'];
const LIGHTING = ['Soft', 'Dramatic', 'Natural', 'Neon'];

export default function ProductPhotoshootPage() {
  const { addPhotoshoot, addToast, isFalJobRunning, setFalJobRunning } = useAppStore();

  const [productImage, setProductImage] = useState<string | null>(null);
  const [scene, setScene] = useState('Studio White');
  const [customScene, setCustomScene] = useState('');
  const [lighting, setLighting] = useState('Soft');
  const [variations, setVariations] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [results, setResults] = useState<Array<{ imageUrl: string }>>([]);

  const handleGenerate = useCallback(async () => {
    if (!productImage) {
      addToast('Please upload a product image.', 'error');
      return;
    }

    if (isFalJobRunning) {
      addToast('A generation is already in progress. Please wait.', 'info');
      return;
    }

    setLoading(true);
    setFalJobRunning(true);
    setResults([]);

    const bgScene = scene === 'Custom' ? customScene : scene;
    const newResults: Array<{ imageUrl: string }> = [];

    for (let i = 0; i < variations; i++) {
      setLoadingStatus(`Generating variation ${i + 1} of ${variations}...`);
      try {
        const res = await fetch('/api/generate-photoshoot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: productImage, backgroundScene: bgScene, lightingStyle: lighting }),
        });

        if (!res.body) {
          throw new Error('No body returned from server');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalData: { success: boolean; data?: { imageUrl: string }; error?: string } | null = null;

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
                setLoadingStatus(`[Variation ${i + 1}/${variations}] ${parsed.status}`);
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
          newResults.push({ imageUrl: finalData.data.imageUrl });
          setResults([...newResults]);

          addPhotoshoot({
            id: crypto.randomUUID(),
            originalImage: productImage,
            backgroundScene: bgScene,
            lightingStyle: lighting,
            imageUrl: finalData.data.imageUrl,
            timestamp: Date.now(),
          });
        } else {
          addToast(finalData?.error || `Failed to generate variation ${i + 1}`, 'error');
        }
      } catch {
        addToast(`Error generating variation ${i + 1}`, 'error');
      }
    }

    setLoading(false);
    setFalJobRunning(false);
    setLoadingStatus('');
  }, [productImage, scene, customScene, lighting, variations, addPhotoshoot, addToast, isFalJobRunning, setFalJobRunning]);

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111111]">Product Photoshoot</h1>
        <p className="text-sm text-[#6B7280] mt-1">Transform product images with AI backgrounds</p>
      </div>

      <div className="flex gap-6">
        <div className="w-[380px] flex-shrink-0 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <FileDropzone
              label="Product Image"
              onFileSelect={(_, preview) => setProductImage(preview)}
              preview={productImage}
            />

            <PillSelect label="Background Scene" options={SCENES} value={scene} onChange={(v) => setScene(v as string)} />

            {scene === 'Custom' && (
              <div>
                <label className="text-sm font-medium text-[#374151]">Custom Scene</label>
                <input
                  type="text"
                  value={customScene}
                  onChange={(e) => setCustomScene(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                  placeholder="Describe the background..."
                />
              </div>
            )}

            <PillSelect label="Lighting Style" options={LIGHTING} value={lighting} onChange={(v) => setLighting(v as string)} />

            <div>
              <label className="text-sm font-medium text-[#374151]">
                Number of Variations: {variations}
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={variations}
                onChange={(e) => setVariations(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !productImage}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              loading || !productImage
                ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                : 'bg-[#111111] text-white hover:bg-[#333333]'
            }`}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />{loadingStatus}</> : 'Generate Photoshoot'}
          </button>
        </div>

        <div className="flex-1">
          {loading && results.length === 0 && (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: variations }).map((_, i) => (
                <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden animate-pulse-subtle">
                  <div className="h-64 bg-[#F4F4F5]" />
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {results.map((r, idx) => (
                <div key={idx} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.imageUrl} alt="Photoshoot" className="w-full h-64 object-cover" />
                  <div className="p-3 flex justify-end">
                    <a href={r.imageUrl} download className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]">
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex items-center justify-center h-64 bg-white border border-[#E5E7EB] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">Upload a product image and generate professional photoshoots</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
