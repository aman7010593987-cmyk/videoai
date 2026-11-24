import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, RefreshCw, Film, Calendar, HardDrive,
  Clock, Maximize2, Settings, Archive, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { exportApi } from '../services/api'

interface ExportRecord {
  id: string
  name: string
  preset: string
  quality: string
  resolution: string
  duration: number
  file_size: number
  created_at: string
  url: string
  filename: string
}

const PRESET_BADGES: Record<string, string> = {
  youtube: 'badge-orange',
  tiktok: 'badge-purple',
  twitter: 'badge-blue',
  instagram: 'badge-green',
  custom: 'badge-blue',
}

const QUALITY_BADGES: Record<string, string> = {
  low: 'badge-green',
  medium: 'badge-blue',
  high: 'badge-purple',
  ultra: 'badge-orange',
}

export default function ExportHistory() {
  const [exports, setExports] = useState<ExportRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await exportApi.history()
      setExports(data.exports || data || [])
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load export history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '—'
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
    return `${(bytes / 1e3).toFixed(0)} KB`
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalSize = exports.reduce((sum, e) => sum + (e.file_size || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="section-title"><span className="text-gradient">Export History</span></h1>
          <p className="section-subtitle">All your exported videos in one place</p>
        </div>
        <button onClick={fetchHistory} disabled={loading} className="btn-secondary flex items-center gap-2 mt-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* Summary */}
      {exports.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: Film, label: 'Total Exports', value: exports.length },
            { icon: HardDrive, label: 'Total Size', value: formatSize(totalSize) },
            { icon: Calendar, label: 'Latest', value: exports[0] ? formatDate(exports[0].created_at).split(',')[0] : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <Icon className="w-5 h-5 text-brand-purple mx-auto mb-1.5" />
              <p className="text-xs text-white/50 mb-0.5">{label}</p>
              <p className="text-white font-semibold">{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
            <span className="ml-3 text-white/60">Loading exports...</span>
          </div>
        ) : exports.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-brand-purple/50" />
            </div>
            <p className="text-white/60 text-lg mb-2">No exports yet</p>
            <p className="text-white/40 text-sm">Export a video to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-white/5 text-white/40 text-xs font-medium uppercase tracking-wider">
              <div className="col-span-2">Name</div>
              <div>Preset</div>
              <div>Quality</div>
              <div>Resolution</div>
              <div>Duration</div>
              <div>Size</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/5">
              <AnimatePresence>
                {exports.map((exp, i) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group"
                  >
                    {/* Name */}
                    <div className="col-span-2 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-purple/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Film className="w-4 h-4 text-brand-purple" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{exp.name || exp.filename}</p>
                          <p className="text-white/40 text-xs">{formatDate(exp.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Preset */}
                    <div>
                      <span className={`${PRESET_BADGES[exp.preset] || 'badge-blue'} text-xs px-2 py-0.5 rounded-full capitalize`}>
                        {exp.preset}
                      </span>
                    </div>

                    {/* Quality */}
                    <div>
                      <span className={`${QUALITY_BADGES[exp.quality] || 'badge-blue'} text-xs px-2 py-0.5 rounded-full capitalize`}>
                        {exp.quality}
                      </span>
                    </div>

                    {/* Resolution */}
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <Maximize2 className="w-3 h-3 text-white/40" />
                      {exp.resolution || '—'}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <Clock className="w-3 h-3 text-white/40" />
                      {formatDuration(exp.duration)}
                    </div>

                    {/* Size + Download */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">{formatSize(exp.file_size)}</span>
                      <a
                        href={exp.url}
                        download={exp.filename}
                        className="btn-ghost p-2 text-brand-purple hover:bg-brand-purple/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
