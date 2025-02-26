
export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedDate: string;
  snippet: string | null;
}

export interface GeneratePostRequest {
  userId: string;
  topic: string;
  tone: string;
  pov: string;
  writingSample?: string;
  industry?: string;
  numPosts?: number;
  includeNews?: boolean;
}

export interface PostSource {
  title: string;
  url: string;
}

export interface GeneratedPost {
  content: string;
  topic: string;
  hook: string;
  newsReference: string;
  hashtags: string[];
  sources: PostSource[];
}

export interface StyleAnalysis {
  writingStyle: string;
  toneDescription: string;
  keyCharacteristics: string[];
  recommendedTopics: string[];
}

export interface AIResponse {
  posts: GeneratedPost[];
  styleAnalysis: StyleAnalysis;
}
