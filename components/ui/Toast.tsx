'use client';

import { useAppStore } from '@/store/useAppStore';

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg max-w-sm animate-slide-in ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-white text-[#111111] border border-[#E5E7EB]'
          }`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
