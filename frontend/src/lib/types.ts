export type HistoryItem = {
  id: number;
  image_id: number;
  image_filename?: string | null;
  image_url?: string | null;
  caption: string;
  created_at: string; 
};

export type CaptionOut = {
  caption: string;
  model_version?: string | null;
  latency_ms: number;
  image_id: number;
  caption_id: number;
};
