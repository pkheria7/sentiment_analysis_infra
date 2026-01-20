import axios from 'axios'
import type {
  AspectItem,
  CategoryItem,
  ContentFilters,
  ContentRow,
  DistributionItem,
  IngestPayload,
  LanguageItem,
  LocationSentimentPoint,
  ProcessResponse,
  SourceItem,
  Summary,
  TrendPoint,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

export const analyticsApi = {
  summary: async (): Promise<Summary> => {
    const { data } = await api.get('/api/analytics/summary')
    return data
  },
  sentiments: async (): Promise<DistributionItem[]> => {
    const { data } = await api.get('/api/analytics/sentiment')
    return data
  },
  aspects: async (): Promise<AspectItem[]> => {
    const { data } = await api.get('/api/analytics/aspects')
    return data
  },
  categories: async (): Promise<CategoryItem[]> => {
    const { data } = await api.get('/api/analytics/categories')
    return data
  },
  sources: async (): Promise<SourceItem[]> => {
    const { data } = await api.get('/api/analytics/sources')
    return data
  },
  languages: async (): Promise<LanguageItem[]> => {
    const { data } = await api.get('/api/analytics/languages')
    return data
  },
  trends: async (): Promise<TrendPoint[]> => {
    const { data } = await api.get('/api/analytics/trends')
    return data
  },
  content: async (filters: ContentFilters): Promise<ContentRow[]> => {
    const { data } = await api.get('/api/analytics/content', {
      params: filters,
    })
    return data
  },
  positiveByLocation: async (): Promise<LocationSentimentPoint[]> => {
    const { data } = await api.get('/api/analytics/positive-locations')
    return data
  },
  negativeByLocation: async (): Promise<LocationSentimentPoint[]> => {
    const { data } = await api.get('/api/analytics/negative-locations')
    return data
  },
}

export const ingestApi = {
  youtube: async (payload: IngestPayload) => {
    const { data } = await api.post('/api/ingest/youtube', payload)
    return data
  },
  reddit: async (postUrl: string) => {
    const { data } = await api.post('/api/ingest/reddit', null, {
      params: { post_url: postUrl },
    })
    return data
  },
}

export const processApi = {
  run: async (limit = 20): Promise<ProcessResponse> => {
    const { data } = await api.post('/api/process', null, { params: { limit } })
    return data
  },
}
