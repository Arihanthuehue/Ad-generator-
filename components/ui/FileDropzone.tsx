'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

interface FileDropzoneProps {
  label: string;
  accept?: Record<string, string[]>;
  onFileSelect: (file: File | null, preview: string | null) => void;
  preview?: string | null;
  compact?: boolean;
}

export default function FileDropzone({
  label,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
  onFileSelect,
  preview,
  compact = false,
}: FileDropzoneProps) {
  const [fileName, setFileName] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        onFileSelect(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  const clearFile = () => {
    setFileName('');
    onFileSelect(null, null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#374151]">{label}</label>
      {preview ? (
        <div className="relative border border-[#E5E7EB] rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full h-32 object-contain bg-[#F9FAFB]" />
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 bg-white rounded-full border border-[#E5E7EB] hover:bg-[#F4F4F5]"
          >
            <X size={14} />
          </button>
          <p className="text-xs text-[#6B7280] px-3 py-2 truncate">{fileName}</p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            compact ? 'p-4' : 'p-8'
          } ${
            isDragActive
              ? 'border-[#111111] bg-[#F4F4F5]'
              : 'border-[#E5E7EB] hover:border-[#9CA3AF] bg-[#FAFAFA]'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={20} className="mx-auto text-[#9CA3AF] mb-2" />
          <p className="text-sm text-[#6B7280]">
            {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">PNG, JPG, WEBP, SVG</p>
        </div>
      )}
    </div>
  );
}
