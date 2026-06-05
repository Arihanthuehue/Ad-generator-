'use client';

import { useAppStore } from '@/store/useAppStore';
import { Layers, Type, Video, Camera, ArrowRight, Download } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { stats, generatedAds, generatedVideos, generatedPhotoshoots } = useAppStore();

  const statCards = [
    { label: 'Ads Generated', value: stats.adsGenerated, icon: Layers },
    { label: 'Copies Written', value: stats.copiesWritten, icon: Type },
    { label: 'Videos Created', value: stats.videosCreated, icon: Video },
    { label: 'Photoshoots Done', value: stats.photoshootsDone, icon: Camera },
  ];

  const quickLinks = [
    { label: 'Create Ad', href: '/ad-creatives', icon: Layers },
    { label: 'Write Copy', href: '/ad-copy', icon: Type },
    { label: 'Product Shoot', href: '/product-photoshoot', icon: Camera },
    { label: 'Make Video', href: '/video-ads', icon: Video },
  ];

  // Get last 6 items across all categories
  const recentItems = [
    ...generatedAds.map(a => ({ type: 'Ad', imageUrl: a.imageUrl, id: a.id, timestamp: a.timestamp })),
    ...generatedPhotoshoots.map(p => ({ type: 'Photoshoot', imageUrl: p.imageUrl, id: p.id, timestamp: p.timestamp })),
    ...generatedVideos.map(v => ({ type: 'Video', imageUrl: v.videoUrl, id: v.id, timestamp: v.timestamp })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111]">Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-1">Overview of your AI-powered ad generation</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">{card.label}</span>
                <Icon size={16} className="text-[#9CA3AF]" />
              </div>
              <p className="text-3xl font-semibold text-[#111111]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Start */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-[#111111] mb-4">Quick Start</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#E5E7EB] hover:border-[#111111] transition-colors group"
              >
                <Icon size={16} className="text-[#6B7280] group-hover:text-[#111111]" />
                <span className="text-sm font-medium text-[#374151] group-hover:text-[#111111]">{link.label}</span>
                <ArrowRight size={14} className="ml-auto text-[#D1D5DB] group-hover:text-[#111111]" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Outputs */}
      {recentItems.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#111111] mb-4">Recent Outputs</h2>
          <div className="grid grid-cols-3 gap-4">
            {recentItems.map((item) => (
              <div key={item.id} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                {item.type === 'Video' ? (
                  <video src={item.imageUrl} className="w-full h-40 object-cover bg-[#F9FAFB]" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.imageUrl} alt={item.type} className="w-full h-40 object-cover bg-[#F9FAFB]" />
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-medium text-[#6B7280] bg-[#F4F4F5] px-2 py-0.5 rounded">{item.type}</span>
                  <a href={item.imageUrl} download className="text-[#6B7280] hover:text-[#111111]">
                    <Download size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentItems.length === 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center">
          <p className="text-sm text-[#9CA3AF]">No outputs yet. Start by creating your first ad!</p>
        </div>
      )}
    </div>
  );
}
