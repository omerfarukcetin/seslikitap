
export enum BookCategory {
  SCIFI = 'Bilim Kurgu',
  FANTASY = 'Fantastik',
  HISTORY = 'Tarih',
  SELF_HELP = 'Kişisel Gelişim',
  CLASSIC = 'Klasik',
  DYSTOPIAN = 'Distopya',
  RELIGION = 'Din'
}

export interface Topic {
  id: string;
  title: string;
  audio: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  narrator: string;
  category: BookCategory;
  description: string;
  coverUrl: string;
  duration: string;
  rating: number;
  reviewsCount: number;
  releaseYear: number;
  language: string;
  topics?: Topic[];
  createdAt?: string;
  updatedAt?: string;
  buyUrl?: string;
}

export interface PlayerState {
  currentBook: Book | null;
  currentTopicIndex: number;
  isPlaying: boolean;
  progress: number; // 0 to 100 in current topic
  currentTime: string;
  totalDuration: string;
  playbackSpeed: number;
}

export interface AppState {
  theme: 'light' | 'dark' | 'cream' | 'green' | 'blue';
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: {
    name: string;
    avatar: string;
    isPremium: boolean;
  } | null;
}
