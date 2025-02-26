
export interface PostSource {
  title: string;
  url?: string;
  publication_date?: string;
}

export interface GeneratedPost {
  id?: string;
  content: string;
  topic: string;
  hashtags: string[];
  sources?: PostSource[];
}

export interface AIResponse {
  posts: GeneratedPost[];
  styleAnalysis?: {
    tone?: string;
    structure?: string;
    engagement?: string;
  };
}

