import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { analyticsApi, ingestApi, processApi } from './lib/api'
import type { ContentFilters, ContentRow, DistributionItem, LanguageItem, LocationSentimentPoint, SourceItem, Summary, TrendPoint, AspectItem, CategoryItem, MitigationSummary } from './lib/types'
import Button from './components/ui/button'
import Card from './components/ui/card'
import Loader from './components/loader'

const sentimentPalette: Record<string, string> = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#3b82f6',
  mixed: '#8b5cf6',
}

function formatConfidence(score?: number | null) {
  if (score === undefined || score === null) return '—'
  const normalized = score > 1 ? score : score * 100
  return `${normalized.toFixed(1)}%`
}

function StatBadge({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-linear-to-br from-slate-50 to-slate-100 px-4 py-3 shadow-sm transition-transform hover:scale-105">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-900">{value ?? '—'}</span>
    </div>
  )
}

function SentimentLegend({ items }: { items: DistributionItem[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
      {items.map((item) => (
        <span key={item.sentiment} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm transition-transform hover:scale-105">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: sentimentPalette[item.sentiment] ?? '#06b6d4' }}
          />
          {item.sentiment} · {item.count}
        </span>
      ))}
    </div>
  )
}

function ContentTable({ data, isLoading }: { data: ContentRow[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    )
  }

  if (!data?.length) {
    return <p className="text-sm text-slate-500">No content yet. Ingest a YouTube URL to see results.</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-linear-to-r from-slate-50 to-slate-100 text-left text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Sentiment</th>
              <th className="px-4 py-3 font-semibold">Aspect</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Language</th>
              <th className="px-4 py-3 font-semibold">Confidence</th>
              <th className="px-4 py-3 font-semibold">Excerpt</th>
              <th className="px-4 py-3 font-semibold">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-all hover:scale-[1.01]">
                <td className="px-4 py-3">
                  <div className="font-medium capitalize text-slate-900">{row.source}</div>
                  {row.source_ref ? (
                    <a
                      href={row.source_ref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      open
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const sentimentKey = row.sentiment ?? 'pending'
                    const color = sentimentPalette[sentimentKey] ?? '#64748b'
                    return (
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm transition-transform hover:scale-105"
                        style={{
                          background: `${color}15`,
                          color,
                        }}
                      >
                        {sentimentKey}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 shadow-sm">
                    {row.aspect ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800 shadow-sm">
                    {row.category ?? 'Unlabeled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.language ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                    {formatConfidence(row.confidence_score)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <p className="line-clamp-3 max-w-xl text-xs leading-relaxed text-slate-600">
                    {row.translated_text ?? row.original_text}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.location ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function App() {
  const queryClient = useQueryClient()

  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [aspectFilter, setAspectFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const [videoUrl, setVideoUrl] = useState('')
  const [location, setLocation] = useState('')
  const [maxComments, setMaxComments] = useState(50)
  const [processLimit, setProcessLimit] = useState(20)
  const [redditUrl, setRedditUrl] = useState('')
  const [mitigationUrl, setMitigationUrl] = useState('')

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ['analytics', 'summary'],
    queryFn: analyticsApi.summary,
  })

  const { data: sentimentDistribution, isLoading: sentimentLoading } = useQuery<DistributionItem[]>({
    queryKey: ['analytics', 'sentiment'],
    queryFn: analyticsApi.sentiments,
  })

  const { data: aspectDistribution } = useQuery<AspectItem[]>({
    queryKey: ['analytics', 'aspects'],
    queryFn: analyticsApi.aspects,
  })

  const { data: sourceDistribution } = useQuery<SourceItem[]>({
    queryKey: ['analytics', 'sources'],
    queryFn: analyticsApi.sources,
  })

  const { data: categoryDistribution } = useQuery<CategoryItem[]>({
    queryKey: ['analytics', 'categories'],
    queryFn: analyticsApi.categories,
  })

  const { data: languageDistribution } = useQuery<LanguageItem[]>({
    queryKey: ['analytics', 'languages'],
    queryFn: analyticsApi.languages,
  })

  const { data: trendData, isLoading: trendsLoading } = useQuery<TrendPoint[]>({
    queryKey: ['analytics', 'trends'],
    queryFn: analyticsApi.trends,
  })

  const { data: positiveLocations } = useQuery<LocationSentimentPoint[]>({
    queryKey: ['analytics', 'positive-locations'],
    queryFn: analyticsApi.positiveByLocation,
  })

  const { data: negativeLocations } = useQuery<LocationSentimentPoint[]>({
    queryKey: ['analytics', 'negative-locations'],
    queryFn: analyticsApi.negativeByLocation,
  })

  const contentFilters: ContentFilters = useMemo(
    () => ({
      sentiment: sentimentFilter === 'all' ? undefined : sentimentFilter,
      aspect: aspectFilter === 'all' ? undefined : aspectFilter,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      language: languageFilter === 'all' ? undefined : languageFilter,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      limit: 50,
      offset: 0,
    }),
    [aspectFilter, sentimentFilter, sourceFilter, categoryFilter, languageFilter, startDate, endDate],
  )

  const {
    data: content = [],
    isLoading: contentLoading,
    isFetching: contentFetching,
  } = useQuery<ContentRow[]>({
    queryKey: ['content', contentFilters],
    queryFn: () => analyticsApi.content(contentFilters),
    placeholderData: (previousData) => previousData,
  })

  const ingestMutation = useMutation({
    mutationFn: ingestApi.youtube,
    onSuccess: (data) => {
      toast.success(`Ingested ${data.comments_ingested} comments from YouTube`)
      queryClient.invalidateQueries({ queryKey: ['content'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Ingestion failed'),
  })

  const redditMutation = useMutation({
    mutationFn: (url: string) => ingestApi.reddit(url),
    onSuccess: () => {
      toast.success(`Ingested comments from Reddit post`)
      setRedditUrl('')
      queryClient.invalidateQueries({ queryKey: ['content'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Reddit ingestion failed'),
  })

  const [mitigationData, setMitigationData] = useState<MitigationSummary | null>(null)
  const [mitigationLoading, setMitigationLoading] = useState(false)

  const handleMitigationFetch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mitigationUrl) {
      toast.error('Add a YouTube or Reddit URL')
      return
    }
    setMitigationLoading(true)
    try {
      const result = await processApi.summary(mitigationUrl)
      setMitigationData(result)
      toast.success('AI mitigation report generated')
    } catch (err) {
      toast.error((err as Error).message || 'Failed to fetch mitigation summary')
      setMitigationData(null)
    } finally {
      setMitigationLoading(false)
    }
  }

  const processMutation = useMutation({
    mutationFn: (limit: number) => processApi.run(limit),
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed_records} records`)
      queryClient.invalidateQueries({ queryKey: ['content'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Processing failed'),
  })

  const handleIngest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl) {
      toast.error('Add a YouTube URL')
      return
    }
    ingestMutation.mutate({
      video_url: videoUrl,
      location_name: location || undefined,
      max_comments: maxComments,
    })
  }

  const handleRedditIngest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!redditUrl) {
      toast.error('Add a Reddit post URL')
      return
    }
    redditMutation.mutate(redditUrl)
  }

  const handleProcess = () => {
    processMutation.mutate(processLimit)
  }

  const sentimentPieData = (sentimentDistribution ?? []).map((item) => ({
    name: item.sentiment,
    value: item.count,
  }))

  const trendChartData = (trendData ?? []).map((item) => ({
    ...item,
    label: new Date(item.date).toLocaleDateString(),
  }))

  const sources = ['all', ...(sourceDistribution ?? []).map((s) => s.source)]
  const aspects = ['all', ...(aspectDistribution ?? []).map((a) => a.aspect)]
  const sentiments = ['all', ...(sentimentDistribution ?? []).map((s) => s.sentiment)]
  const categories = ['all', ...(categoryDistribution ?? []).map((c) => c.category ?? 'Unlabeled')]
  const languages = ['all', ...(languageDistribution ?? []).map((l) => l.language)]

  const aspectBarData = (aspectDistribution ?? []).slice(0, 8).map((item) => ({
    name: item.aspect,
    count: item.count,
  }))

  const languagePieData = (languageDistribution ?? []).slice(0, 6).map((item) => ({
    name: item.language,
    value: item.count,
  }))

  const sourceBarData = (sourceDistribution ?? []).map((item) => ({
    name: item.source,
    count: item.count,
  }))

  const categoryBarData = (categoryDistribution ?? []).map((item) => ({
    name: item.category ?? 'Unlabeled',
    count: item.count,
  }))

  // Calculate average sentiment score
  const sentimentScore = useMemo(() => {
    if (!sentimentDistribution || sentimentDistribution.length === 0) return 50
    const total = sentimentDistribution.reduce((sum, item) => sum + item.count, 0)
    if (total === 0) return 50
    const positive = sentimentDistribution.find((s) => s.sentiment === 'Positive')?.count ?? 0
    return Math.round((positive / total) * 100)
  }, [sentimentDistribution])

  const confidenceStats = useMemo(() => {
    const scored = (content ?? []).filter((c) => typeof c.confidence_score === 'number')
    const avg = scored.length
      ? scored.reduce((sum, row) => sum + (row.confidence_score ?? 0), 0) / scored.length
      : null

    const bySentimentMap: Record<string, { total: number; count: number }> = {}
    scored.forEach((row) => {
      const key = row.sentiment ?? 'Unlabeled'
      bySentimentMap[key] = bySentimentMap[key] || { total: 0, count: 0 }
      bySentimentMap[key].total += row.confidence_score ?? 0
      bySentimentMap[key].count += 1
    })

    const bySentiment = Object.entries(bySentimentMap).map(([sentiment, stats]) => ({
      sentiment,
      avg: stats.total / stats.count,
    }))

    const top = [...scored]
      .sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0))
      .slice(0, 5)

    return { avgConfidence: avg, bySentiment, top }
  }, [content])

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-orange-50/30 to-rose-50/40 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-600/90">Sentiment Intelligence</p>
            <h1 className="heading text-3xl font-bold md:text-4xl">Infrastructure Sentiment Dashboard</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Monitor ingestion, LLM processing, and sentiment trends from your FastAPI backend. Tailwind-powered,
              responsive, and ready to ship.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => queryClient.invalidateQueries()}>
              Refresh all
            </Button>
            <Button onClick={handleProcess} loading={processMutation.isPending}>
              Run processing
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card title="Total Feedback" subtitle="All records ingested">
            {summaryLoading ? (
              <Loader />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{summary?.total_feedback ?? 0}</div>
            )}
          </Card>
          <Card title="Top Aspect" subtitle="Most discussed">
            {summaryLoading ? <Loader /> : <div className="text-xl font-semibold text-slate-900">{summary?.top_aspect ?? '—'}</div>}
          </Card>
          <Card title="Top Source" subtitle="Highest volume">
            {summaryLoading ? <Loader /> : <div className="text-xl font-semibold text-slate-900">{summary?.top_source ?? '—'}</div>}
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Top Aspects" subtitle="Most discussed topics">
            <div className="h-72">
              {summaryLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={aspectBarData} layout="vertical">
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" width={80} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Language Distribution" subtitle="Content by language">
            <div className="h-72">
              {summaryLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={languagePieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80}
                      label={(entry) => entry.name}
                    >
                      {languagePieData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#06b6d4', '#f59e0b', '#a855f7', '#10b981', '#ef4444', '#3b82f6'][index % 6]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Sentiment Health Score" subtitle="Overall positivity metric">
            <div className="h-72 flex flex-col items-center justify-center gap-4">
              {summaryLoading ? (
                <Loader />
              ) : (
                <>
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={sentimentScore >= 70 ? '#10b981' : sentimentScore >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="10"
                        strokeDasharray={`${sentimentScore * 2.51} 251`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-slate-900">{sentimentScore}%</span>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Positive</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-slate-600">Healthy (70%+)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-slate-600">Moderate (40-70%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-slate-600">Critical (&lt;40%)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Source Distribution" subtitle="Content volume by platform">
            <div className="h-72">
              {summaryLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={sourceBarData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Statistics Overview" subtitle="Key metrics at a glance">
            <div className="grid gap-4 md:grid-cols-2">
              <StatBadge label="Total Records" value={summary?.total_feedback ?? 0} />
              <StatBadge label="Sentiment Score" value={`${sentimentScore}%`} />
              <StatBadge label="Unique Sources" value={sourceDistribution?.length ?? 0} />
              <StatBadge label="Languages Detected" value={languageDistribution?.length ?? 0} />
              <StatBadge label="Aspects Identified" value={aspectDistribution?.length ?? 0} />
              <StatBadge label="Processing Rate" value={summary?.total_feedback ? '100%' : '0%'} />
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Category Mix" subtitle="Content grouped by classification">
            <div className="h-72">
              {!categoryDistribution ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : categoryBarData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No category data yet.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={categoryBarData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Confidence Quality" subtitle="Model certainty across outputs">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Average confidence</p>
                <div className="text-3xl font-bold text-slate-900">{formatConfidence(confidenceStats.avgConfidence)}</div>
                <p className="text-xs text-slate-600">Higher means the model is more certain about its classification.</p>
                <div className="space-y-2">
                  {confidenceStats.bySentiment.length ? (
                    confidenceStats.bySentiment.map((item) => {
                      const width = Math.min(item.avg > 1 ? item.avg : item.avg * 100, 100)
                      return (
                        <div key={item.sentiment} className="flex items-center gap-3 text-xs text-slate-700">
                          <span className="w-20 font-semibold">{item.sentiment}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-emerald-500" style={{ width: `${width}%` }} />
                          </div>
                          <span className="w-14 text-right text-slate-600">{formatConfidence(item.avg)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-slate-500">Not enough data yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Top confident items</p>
                <div className="space-y-2">
                  {confidenceStats.top.length ? (
                    confidenceStats.top.map((row) => (
                      <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <span className="font-semibold">{row.sentiment ?? 'Pending'}</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                            {formatConfidence(row.confidence_score)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                          {row.translated_text ?? row.original_text ?? '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.category ?? 'Unlabeled'}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{row.source}</span>
                          {row.aspect && <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.aspect}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No scored items yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Sentiment distribution" subtitle="Processed records by sentiment" action={<SentimentLegend items={sentimentDistribution ?? []} />}>
            <div className="h-72">
              {sentimentLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sentimentPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {sentimentPieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={sentimentPalette[entry.name] ?? ['#06b6d4', '#f59e0b', '#a855f7'][index % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Volume trends" subtitle="Daily volume of ingested content">
            <div className="h-72">
              {trendsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={trendChartData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#1e293b' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Positive feedback by location" subtitle="Cities with highest positive sentiment">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Heatmap Container with proper padding for axis labels */}
                <div className="relative w-96 h-96 pl-16 pb-10">
                  <div className="relative w-full h-full border-2 border-green-300 rounded-lg overflow-hidden">
                    {/* Background Gradient - Green & Neon */}
                    <div className="absolute inset-0 bg-linear-to-tr from-green-900 via-green-600 to-lime-300 opacity-70 rounded-lg"></div>

                    {/* Grid Lines */}
                    {[1, 2, 3, 4].map((i) => (
                      <React.Fragment key={i}>
                        <div
                          className="absolute left-0 right-0 h-px bg-white opacity-30"
                          style={{ bottom: `${i * 20}%` }}
                        ></div>
                        <div
                          className="absolute top-0 bottom-0 w-px bg-white opacity-30"
                          style={{ left: `${i * 20}%` }}
                        ></div>
                      </React.Fragment>
                    ))}

                    {/* Data Points */}
                      {(positiveLocations ?? []).map((location: LocationSentimentPoint, index: number) => {
                        const counts = positiveLocations?.map((l) => l.count ?? 0) ?? [1]
                        const maxCount = Math.max(...counts)
                        const minCount = Math.min(...counts)
                        const range = maxCount - minCount || 1
                        const name = location.location ?? location.aspect ?? 'Unknown'
                        
                        // Normalize count to 0-1 for color (0 = neon/light, 1 = green/dark)
                        const intensity = ((location.count ?? 0) - minCount) / range
                        
                        // Color gradient: neon (low intensity) to dark green (high intensity)
                        const hue = 120 // Green hue
                        const saturation = 80 + intensity * 20 // 80-100%
                        const lightness = 50 - intensity * 20 // 50-30% (darker for higher)
                        const pointColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
                        
                        const totalPoints = positiveLocations?.length ?? 1
                        // Constrain x between 10% and 90% to keep points within bounds
                        const xPercent = 10 + ((index / Math.max(totalPoints - 1, 1)) * 80)
                        // Constrain y between 10% and 85% to keep points within bounds
                        const yPercent = 10 + (((location.count ?? 0) / Math.max(maxCount, 1)) * 75)
                        
                        return (
                          <div
                            key={`${name}-${index}`}
                            className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10 group"
                            style={{
                              left: `${xPercent}%`,
                              bottom: `${yPercent}%`,
                            }}
                          >
                            <div 
                              className="w-7 h-7 rounded-full border-2 border-white shadow-lg hover:scale-150 transition-all duration-200"
                              style={{
                                backgroundColor: pointColor,
                                boxShadow: `0 0 12px ${pointColor}, 0 0 24px ${pointColor}80`
                              }}
                            ></div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              {name}: {location.count}
                            </div>
                          </div>
                        )
                    })}
                  </div>

                  {/* Axis Labels - positioned outside the heatmap but within padding */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-lime-300 font-semibold text-sm">
                    Cities →
                  </div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-lime-300 font-semibold text-sm whitespace-nowrap">
                    Count →
                  </div>
                </div>

                {/* Legend and Stats */}
                <div className="flex-1 min-h-96 bg-linear-to-br from-slate-50 to-slate-100 border-2 border-lime-300 rounded-lg p-4 overflow-y-auto max-h-96 flex flex-col">
                  <h4 className="text-green-700 font-bold text-sm mb-3 sticky top-0 bg-linear-to-r from-slate-50 to-slate-100 pb-2">All Positive Cities ({positiveLocations?.length ?? 0})</h4>
                  <div className="space-y-2 flex-1">
                    {(positiveLocations ?? []).map((location: LocationSentimentPoint, idx: number) => {
                      const counts = positiveLocations?.map((l) => l.count ?? 0) ?? [1]
                      const maxCount = Math.max(...counts)
                      const minCount = Math.min(...counts)
                      const range = maxCount - minCount || 1
                      const name = location.location ?? location.aspect ?? 'Unknown'
                      const intensity = ((location.count ?? 0) - minCount) / range
                      const hue = 120
                      const saturation = 80 + intensity * 20
                      const lightness = 50 - intensity * 20
                      const pointColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
                      
                      return (
                        <div key={`${name}-${idx}`} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200 hover:bg-lime-50 transition-colors">
                          <span className="text-slate-900 font-medium">{idx + 1}. {name}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full border border-white"
                              style={{ backgroundColor: pointColor }}
                            ></div>
                            <span className="text-green-700 font-bold w-8 text-right">{location.count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {!positiveLocations?.length && (
                    <p className="text-slate-400 text-center mt-20">No positive feedback data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Negative feedback by location" subtitle="Cities with highest negative sentiment">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Heatmap Container with proper padding for axis labels */}
                <div className="relative w-96 h-96 pl-16 pb-10">
                  <div className="relative w-full h-full border-2 border-red-400 rounded-lg overflow-hidden">
                    {/* Background Gradient - Red & Yellow */}
                    <div className="absolute inset-0 bg-linear-to-tr from-red-900 via-red-600 to-yellow-400 opacity-70 rounded-lg"></div>

                    {/* Grid Lines */}
                    {[1, 2, 3, 4].map((i) => (
                      <React.Fragment key={i}>
                        <div
                          className="absolute left-0 right-0 h-px bg-white opacity-30"
                          style={{ bottom: `${i * 20}%` }}
                        ></div>
                        <div
                          className="absolute top-0 bottom-0 w-px bg-white opacity-30"
                          style={{ left: `${i * 20}%` }}
                        ></div>
                      </React.Fragment>
                    ))}

                    {/* Data Points */}
                    {(negativeLocations ?? []).map((location: LocationSentimentPoint, index: number) => {
                      const counts = negativeLocations?.map((l) => l.count ?? 0) ?? [1]
                      const maxCount = Math.max(...counts)
                      const minCount = Math.min(...counts)
                      const range = maxCount - minCount || 1
                      const name = location.location ?? location.aspect ?? 'Unknown'
                      
                      // Normalize count to 0-1 for color (0 = yellow/light, 1 = red/dark)
                      const intensity = ((location.count ?? 0) - minCount) / range
                      
                      // Color gradient: yellow (low intensity) to dark red (high intensity)
                      // Yellow is 60 hue, Red is 0 hue
                      const hue = 60 - intensity * 60 // 60 (yellow) to 0 (red)
                      const saturation = 80 + intensity * 20 // 80-100%
                      const lightness = 50 - intensity * 20 // 50-30% (darker for higher)
                      const pointColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
                      
                      const totalPoints = negativeLocations?.length ?? 1
                      // Constrain x between 10% and 90% to keep points within bounds
                      const xPercent = 10 + ((index / Math.max(totalPoints - 1, 1)) * 80)
                      // Constrain y between 10% and 85% to keep points within bounds
                      const yPercent = 10 + (((location.count ?? 0) / Math.max(maxCount, 1)) * 75)
                      
                      return (
                        <div
                          key={`${name}-${index}`}
                          className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10 group"
                          style={{
                            left: `${xPercent}%`,
                            bottom: `${yPercent}%`,
                          }}
                        >
                          <div 
                            className="w-7 h-7 rounded-full border-2 border-white shadow-lg hover:scale-150 transition-all duration-200"
                            style={{
                              backgroundColor: pointColor,
                              boxShadow: `0 0 12px ${pointColor}, 0 0 24px ${pointColor}80`
                            }}
                          ></div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {name}: {location.count}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Axis Labels - positioned outside the heatmap but within padding */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-yellow-400 font-semibold text-sm">
                    Cities →
                  </div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-yellow-400 font-semibold text-sm whitespace-nowrap">
                    Count →
                  </div>
                </div>

                {/* Legend and Stats */}
                <div className="flex-1 min-h-96 bg-linear-to-br from-slate-50 to-slate-100 border-2 border-red-400 rounded-lg p-4 overflow-y-auto max-h-96 flex flex-col">
                  <h4 className="text-red-700 font-bold text-sm mb-3 sticky top-0 bg-linear-to-r from-slate-50 to-slate-100 pb-2">All Negative Cities ({negativeLocations?.length ?? 0})</h4>
                  <div className="space-y-2 flex-1">
                    {(negativeLocations ?? []).map((location: LocationSentimentPoint, idx: number) => {
                      const counts = negativeLocations?.map((l) => l.count ?? 0) ?? [1]
                      const maxCount = Math.max(...counts)
                      const minCount = Math.min(...counts)
                      const range = maxCount - minCount || 1
                      const name = location.location ?? location.aspect ?? 'Unknown'
                      const intensity = ((location.count ?? 0) - minCount) / range
                      const hue = 60 - intensity * 60
                      const saturation = 80 + intensity * 20
                      const lightness = 50 - intensity * 20
                      const pointColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
                      
                      return (
                        <div key={`${name}-${idx}`} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200 hover:bg-red-50 transition-colors">
                          <span className="text-slate-900 font-medium">{idx + 1}. {name}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full border border-white"
                              style={{ backgroundColor: pointColor }}
                            ></div>
                            <span className="text-red-700 font-bold w-8 text-right">{location.count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {!negativeLocations?.length && (
                    <p className="text-slate-400 text-center mt-20">No negative feedback data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Enhanced Filters" subtitle="Advanced content filtering and analysis">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                  Sentiment
                </label>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                >
                  {sentiments.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                  Aspect
                </label>
                <select
                  value={aspectFilter}
                  onChange={(e) => setAspectFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                >
                  {aspects.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  Source
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                >
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                  Language
                </label>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-pink-500"></span>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-500"></span>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold">Active Filters:</span>
                {sentimentFilter !== 'all' && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                    {sentimentFilter}
                  </span>
                )}
                {aspectFilter !== 'all' && (
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">
                    {aspectFilter}
                  </span>
                )}
                {sourceFilter !== 'all' && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                    {sourceFilter}
                  </span>
                )}
                {categoryFilter !== 'all' && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                    {categoryFilter}
                  </span>
                )}
                {languageFilter !== 'all' && (
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">
                    {languageFilter}
                  </span>
                )}
                {startDate && (
                  <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-700">
                    From: {startDate}
                  </span>
                )}
                {endDate && (
                  <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-700">
                    To: {endDate}
                  </span>
                )}
                {sentimentFilter === 'all' && aspectFilter === 'all' && sourceFilter === 'all' && categoryFilter === 'all' && languageFilter === 'all' && !startDate && !endDate && (
                  <span className="text-slate-400">None</span>
                )}
              </div>
                <div className="ml-auto flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSentimentFilter('all')
                      setAspectFilter('all')
                      setSourceFilter('all')
                      setCategoryFilter('all')
                      setLanguageFilter('all')
                      setStartDate('')
                      setEndDate('')
                    }}
                  >
                    Clear all
                  </Button>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['content'] })} loading={contentFetching}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Ingest YouTube comments" subtitle="Pull comments for analysis">
            <form className="grid gap-3" onSubmit={handleIngest}>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600">Video URL</label>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-wide text-slate-600">Location (optional)</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City or region"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-wide text-slate-600">Max comments</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxComments}
                    onChange={(e) => setMaxComments(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={ingestMutation.isPending}>
                  Ingest now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setVideoUrl('')
                    setLocation('')
                    setMaxComments(50)
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Ingest Reddit comments" subtitle="Pull comments from Reddit posts">
            <form className="grid gap-3" onSubmit={handleRedditIngest}>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600">Reddit Post URL</label>
                <input
                  value={redditUrl}
                  onChange={(e) => setRedditUrl(e.target.value)}
                  placeholder="https://www.reddit.com/r/subreddit/comments/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={redditMutation.isPending}>
                  Ingest now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRedditUrl('')}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>
        </section>

        <Card title="🤖 AI Mitigation Advisor" subtitle="Get intelligent recommendations based on feedback analysis">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <form className="grid gap-3" onSubmit={handleMitigationFetch}>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-wide text-slate-600">YouTube or Reddit URL</label>
                  <input
                    value={mitigationUrl}
                    onChange={(e) => setMitigationUrl(e.target.value)}
                    placeholder="https://www.youtube.com/... or reddit.com/..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" loading={mitigationLoading}>
                    Generate AI Report
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMitigationUrl('')
                      setMitigationData(null)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
              <div className="mt-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-4 text-xs text-slate-700 border border-purple-200">
                <p className="font-semibold text-purple-800 mb-2">💡 What this does:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Analyzes all feedback from the URL</li>
                  <li>Identifies recurring issues</li>
                  <li>Provides AI-generated mitigation strategies</li>
                  <li>Highlights critical concerns</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-2">
              {mitigationLoading && (
                <div className="flex h-full min-h-[300px] items-center justify-center">
                  <Loader />
                  <p className="ml-3 text-sm text-slate-600">AI analyzing feedback...</p>
                </div>
              )}

              {!mitigationLoading && !mitigationData && (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="text-sm text-slate-600">Enter a URL and click "Generate AI Report"</p>
                    <p className="text-xs text-slate-500 mt-1">to get intelligent mitigation recommendations</p>
                  </div>
                </div>
              )}

              {!mitigationLoading && mitigationData && mitigationData.summary && mitigationData.summary.length > 0 && (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {mitigationData.summary.map((item, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      {/* Summary */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            📊
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Analysis Summary</h4>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed pl-10">{item.summary}</p>
                      </div>

                      {/* Highlighted Issues */}
                      {item.highlighted_issues && item.highlighted_issues.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                              ⚠️
                            </div>
                            <h4 className="font-bold text-red-700 text-sm uppercase tracking-wide">Critical Issues</h4>
                          </div>
                          <ul className="space-y-2 pl-10">
                            {item.highlighted_issues.map((issue, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="inline-block mt-1 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {item.recommendations && item.recommendations.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                              ✅
                            </div>
                            <h4 className="font-bold text-green-700 text-sm uppercase tracking-wide">Recommended Actions</h4>
                          </div>
                          <ul className="space-y-2 pl-10">
                            {item.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="inline-block mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!mitigationLoading && mitigationData && (!mitigationData.summary || mitigationData.summary.length === 0) && (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                  <div className="text-center p-6">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm text-amber-800 font-semibold">No Analysis Available</p>
                    <p className="text-xs text-amber-700 mt-1">The provided URL may not have enough feedback data to analyze.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card
          title="Content"
          subtitle="Latest processed rows"
          action={<StatBadge label="Showing" value={content ? `${content.length} rows` : '—'} />}
        >
          <ContentTable data={content} isLoading={contentLoading || contentFetching} />
        </Card>

        <Card title="LLM processing" subtitle="Process queued records">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-800">Process next batch</p>
              <p className="text-xs text-slate-500">Runs POST /api/process?limit=...</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={200}
                value={processLimit}
                onChange={(e) => setProcessLimit(parseInt(e.target.value, 10))}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300"
              />
              <Button onClick={handleProcess} loading={processMutation.isPending}>
                Run now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default App