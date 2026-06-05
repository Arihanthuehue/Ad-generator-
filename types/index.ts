export interface BrandDetails {
  brandName: string;
  industry: string;
  brandColor: string;
  brandLogo: string | null; // base64 or object URL
}

export interface GeneratedAd {
  id: string;
  brandName: string;
  industry: string;
  brandColor: string;
  productName: string;
  tagline: string;
  audience: string;
  ctaText: string;
  platform: string;
  style: string;
  tone: string;
  imageUrl: string;
  score?: number;
  timestamp: number;
}

export interface GeneratedCopy {
  id: string;
  brandName: string;
  productName: string;
  benefit: string;
  tone: string;
  platform: string;
  headline: string;
  primaryText: string;
  cta: string;
  characterCounts: {
    headline: number;
    primaryText: number;
    cta: number;
  };
  thumbsUp?: boolean;
  thumbsDown?: boolean;
  timestamp: number;
}

export interface GeneratedVideo {
  id: string;
  mode: 'image' | 'text';
  videoUrl: string;
  style: string;
  duration: string;
  aspectRatio: string;
  motionIntensity: string;
  promptOrImage: string; // text description or image preview
  timestamp: number;
}

export interface GeneratedPhotoshoot {
  id: string;
  originalImage: string;
  backgroundScene: string;
  lightingStyle: string;
  imageUrl: string;
  timestamp: number;
}

export interface CreativeScoreResult {
  id: string;
  imageUrl: string;
  platform: string;
  goal: string;
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
  timestamp: number;
}

export interface AppStats {
  adsGenerated: number;
  copiesWritten: number;
  videosCreated: number;
  photoshootsDone: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
