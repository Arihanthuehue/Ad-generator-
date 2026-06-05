'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layers,
  Camera,
  Type,
  Video,
  BarChart2,
  Download,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: Home, href: '/dashboard' },
  { label: 'Ad Creatives', icon: Layers, href: '/ad-creatives' },
  { label: 'Product Photoshoot', icon: Camera, href: '/product-photoshoot' },
  { label: 'Ad Copy', icon: Type, href: '/ad-copy' },
  { label: 'Video Ads', icon: Video, href: '/video-ads' },
  { label: 'Creative Score', icon: BarChart2, href: '/creative-score' },
  { label: 'Downloads', icon: Download, href: '/downloads' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col z-50">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h1 className="text-lg font-semibold text-[#111111] tracking-tight">
          Pragya Ad
        </h1>
        <p className="text-xs text-[#6B7280] mt-0.5">AI Creative Generator</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#F4F4F5] text-[#111111] border-l-2 border-[#111111]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111111]'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#E5E7EB]">
        <p className="text-xs text-[#9CA3AF]">v1.0 — Local Demo</p>
      </div>
    </aside>
  );
}
