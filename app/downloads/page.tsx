'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, Trash2 } from 'lucide-react';

type FilterType = 'All' | 'Images' | 'Videos' | 'Copy';

export default function DownloadsPage() {
  const { generatedAds, generatedPhotoshoots, generatedVideos, generatedCopies, clearAllDownloads, addToast } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('All');

  const allItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'Ad' | 'Photoshoot' | 'Video' | 'Copy';
      preview: string;
      label: string;
      timestamp: number;
      downloadUrl?: string;
    }> = [];

    generatedAds.forEach((ad) => items.push({
      id: ad.id, type: 'Ad', preview: ad.imageUrl, label: ad.platform, timestamp: ad.timestamp, downloadUrl: ad.imageUrl,
    }));

    generatedPhotoshoots.forEach((p) => items.push({
      id: p.id, type: 'Photoshoot', preview: p.imageUrl, label: p.backgroundScene, timestamp: p.timestamp, downloadUrl: p.imageUrl,
    }));

    generatedVideos.forEach((v) => items.push({
      id: v.id, type: 'Video', preview: v.videoUrl, label: v.style, timestamp: v.timestamp, downloadUrl: v.videoUrl,
    }));

    generatedCopies.forEach((c) => items.push({
      id: c.id, type: 'Copy', preview: '', label: c.headline, timestamp: c.timestamp,
    }));

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [generatedAds, generatedPhotoshoots, generatedVideos, generatedCopies]);

  const filteredItems = useMemo(() => {
    if (filter === 'All') return allItems;
    if (filter === 'Images') return allItems.filter((i) => i.type === 'Ad' || i.type === 'Photoshoot');
    if (filter === 'Videos') return allItems.filter((i) => i.type === 'Video');
    if (filter === 'Copy') return allItems.filter((i) => i.type === 'Copy');
    return allItems;
  }, [allItems, filter]);

  const filters: FilterType[] = ['All', 'Images', 'Videos', 'Copy'];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">Downloads</h1>
          <p className="text-sm text-[#6B7280] mt-1">{allItems.length} items generated</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { clearAllDownloads(); addToast('All downloads cleared', 'info'); }}
            className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#111111] text-white'
                : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111111]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center">
          <p className="text-sm text-[#9CA3AF]">No items yet. Start generating to see them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              {item.type === 'Copy' ? (
                <div className="p-4 h-40 flex flex-col justify-between">
                  <p className="text-sm font-medium text-[#111111] line-clamp-3">{item.label}</p>
                  <span className="text-xs text-[#9CA3AF]">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              ) : item.type === 'Video' ? (
                <>
                  <video src={item.preview} className="w-full h-40 object-cover bg-[#F9FAFB]" />
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-[#F4F4F5] text-[#374151] px-2 py-0.5 rounded">{item.type}</span>
                      <span className="text-xs text-[#9CA3AF]">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    {item.downloadUrl && (
                      <a href={item.downloadUrl} download className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]">
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt={item.type} className="w-full h-40 object-cover bg-[#F9FAFB]" />
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-[#F4F4F5] text-[#374151] px-2 py-0.5 rounded">{item.type}</span>
                      <span className="text-xs text-[#9CA3AF]">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    {item.downloadUrl && (
                      <a href={item.downloadUrl} download className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F4F4F5] text-[#6B7280]">
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
