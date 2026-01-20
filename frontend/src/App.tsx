import type React from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
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
import type { AspectItem, ContentFilters, ContentRow, DistributionItem, SourceItem, Summary, TrendPoint } from './lib/types'
import Button from './components/ui/button'
import Card from './components/ui/card'
import Loader from './components/loader'

const sentimentPalette: Record<string, string> = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#3b82f6',
  mixed: '#8b5cf6',
}

function StatBadge({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-3 shadow-sm transition-transform hover:scale-105">
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
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-left text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Sentiment</th>
              <th className="px-4 py-3 font-semibold">Aspect</th>
              <th className="px-4 py-3 font-semibold">Language</th>
              <th className="px-4 py-3 font-semibold">Excerpt</th>
              <th className="px-4 py-3 font-semibold">Timestamp</th>
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
                <td className="px-4 py-3 text-slate-700">{row.language ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">
                  <p className="line-clamp-3 max-w-xl text-xs leading-relaxed text-slate-600">
                    {row.translated_text ?? row.original_text}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.timestamp ?? '—'}</td>
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

  const [videoUrl, setVideoUrl] = useState('')
  const [location, setLocation] = useState('')
  const [maxComments, setMaxComments] = useState(50)
  const [processLimit, setProcessLimit] = useState(20)

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

  const { data: trendData, isLoading: trendsLoading } = useQuery<TrendPoint[]>({
    queryKey: ['analytics', 'trends'],
    queryFn: analyticsApi.trends,
  })

  const contentFilters: ContentFilters = useMemo(
    () => ({
      sentiment: sentimentFilter === 'all' ? undefined : sentimentFilter,
      aspect: aspectFilter === 'all' ? undefined : aspectFilter,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      limit: 50,
      offset: 0,
    }),
    [aspectFilter, sentimentFilter, sourceFilter],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-rose-50/40 text-slate-900">
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
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Filters" subtitle="Focus the content table">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-600">Sentiment</label>
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
                <label className="text-xs uppercase tracking-wide text-slate-600">Aspect</label>
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
                <label className="text-xs uppercase tracking-wide text-slate-600">Source</label>
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
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSentimentFilter('all')
                  setAspectFilter('all')
                  setSourceFilter('all')
                }}
              >
                Clear filters
              </Button>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['content'] })} loading={contentFetching}>
                Apply
              </Button>
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
        </section>

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