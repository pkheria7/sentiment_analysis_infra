export interface Summary {
  total_feedback: number
  sentiment_distribution: Record<string, number>
  top_aspect: string | null
  top_source: string | null
}

export interface DistributionItem {
  sentiment: string
  count: number
}

export interface AspectItem {
  aspect: string
  count: number
}

export interface SourceItem {
  source: string
  count: number
}

export interface LanguageItem {
  language: string
  count: number
}

export interface TrendPoint {
  date: string
  count: number
}

export interface LocationSentimentPoint {
  location: string
  count: number
}

export interface ContentRow {
  id: number
  source: string
  source_ref?: string | null
  original_text: string
  translated_text?: string | null
  sentiment?: string | null
  aspect?: string | null
  language?: string | null
  timestamp?: string | null
  location?: string | null
}

export interface ContentFilters {
  sentiment?: string
  aspect?: string
  source?: string
  limit?: number
  offset?: number
}

export interface IngestPayload {
  video_url: string
  location_name?: string
  max_comments?: number
}

export interface ProcessResponse {
  status: string
  processed_records: number
}
