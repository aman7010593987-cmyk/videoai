import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Scissors, Crop, Zap, Subtitles, Type,
  Download, CheckCircle, AlertCircle, ChevronDown, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { subtitlesApi, exportApi, pollJob } from '../services/api'
import JobProgress from '../components/ui/JobProgress'

interface Job {
  status: string
  progress: number
  message: string
  error?: string
}

const CROP_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: '16:9 (Landscape)', value: '16:9' },
  { label: '9:16 (Portrait)', value: '9:16' },
  { label: '1:1 (Square)', value: '1:1' },
]

const SPEED_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×', value: 1.5 },
  { label: '2×', value: 2 },
]

const EXPORT_PRESETS = [
  { label: 'YouTube', value: 'youtube' },
  { label: 'TikTok / Reels', value: 'tiktok' },
  { label: 'Twitter / X', value: 'twitter' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Custom', value: 'custom' },
]

const QUALITY_OPTIONS = [
  { label: 'Low (fast)', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Ultra (slow)', value: 'ultra' },
]

const TEXT_POSITIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'bottom' },
]

export default function VideoEditor() {
  const [videoPath, setVideoPath] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState('')
  const [trimEnd, setTrimEnd] = useState('')
  const [crop, setCrop] = useState('none')
  const [speed, setSpeed] = useState(1)
  const [addSubtitles, setAddSubtitles] = useState(false)
  const [textOverlay, setTextOverlay] = useState('')
  const [textPosition, setTextPosition] = useState('bottom')
  const [exportPreset, setExportPreset] = useState('youtube')
  const [quality, setQuality] = useState('medium')
  const [exportJob, setExportJob] = useState<Job | null>(null)
  const [subtitlesJob, setSubtitlesJob] = useState<Job | null>(null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVideoFile(file)
    setVideoPath(file.name)
    toast.success('Video loaded!')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.webm'] },
    maxFiles: 1,
  })

  const handleGenerateSubtitles = async () => {
    if (!videoPath) return toast.error('Please load a video first')
    try {
      const res = await subtitlesApi.generate({ video_path: videoPath, burn_in: false, style: 'default' })
      const jobId = res.job_id
      setSubtitlesJob({ status: 'processing', progress: 0, message: 'Generating subtitles...' })
      await pollJob(jobId, (j: Job) => setSubtitlesJob(j))
      toast.success('Subtitles generated!')
    } catch (err: any) {
      toast.error(err?.message || 'Subtitle generation failed')
      setSubtitlesJob(null)
    }
  }

  const handleExport = async () => {
    if (!videoPath) return toast.error('Please load a video first')
    try {
      const payload: any = {
        video_path: videoPath,
        preset: exportPreset,
        quality,
        speed,
        crop: crop === 'none' ? undefined : crop,
        trim_start: trimStart ? parseFloat(trimStart) : undefined,
        trim_end: trimEnd ? parseFloat(trimEnd) : undefined,
        text_overlay: textOverlay || undefined,
        text_position: textOverlay ? textPosition : undefined,
        add_subtitles: addSubtitles,
      }
      const res = await exportApi.export(payload)
      const jobId = res.job_id
      setExportJob({ status: 'processing', progress: 0, message: 'Exporting...' })
      await pollJob(jobId, (j: Job) => setExportJob(j))
      const result = await exportApi.getResult(jobId)
      setDownloadUrl(result.url)
      setDownloadName(result.filename)
      toast.success('Export complete!')
    } catch (err: any) {
      toast.error(err?.message || 'Export failed')
      setExportJob(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">
          <span className="text-gradient">Video Editor</span>
        </h1>
        <p className="section-subtitle">Trim, crop, speed-adjust, subtitle, and export with FFmpeg processing</p>
        <div className="mt-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-sm">Full timeline editor — export via FFmpeg processing</p>
        </div>
      </motion.div>

      {/* Upload Area */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-2">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-brand-purple bg-brand-purple/10' : 'border-white/20 hover:border-brand-purple/50 hover:bg-white/5'
          }`}
        >
          <input {...getInputProps()} />
          <AnimatePresence mode="wait">
            {videoFile ? (
              <motion.div key="loaded" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-400" />
                <p className="text-white font-medium">{videoFile.name}</p>
                <p className="text-white/40 text-sm">Drop a new file to replace</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-brand-purple" />
                <p className="text-white font-medium">{isDragActive ? 'Drop it!' : 'Drag & drop video or click to browse'}</p>
                <p className="text-white/40 text-sm">MP4, MOV, MKV, WEBM</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Trim */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Scissors className="w-5 h-5 text-brand-purple" /> Trim
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Start Time (seconds)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 10"
                value={trimStart}
                onChange={e => setTrimStart(e.target.value)}
                min={0}
                step={0.1}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">End Time (seconds)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 90"
                value={trimEnd}
                onChange={e => setTrimEnd(e.target.value)}
                min={0}
                step={0.1}
              />
            </div>
          </div>
        </motion.div>

        {/* Crop & Speed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Crop className="w-5 h-5 text-brand-purple" /> Transform
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Crop</label>
              <div className="relative">
                <select value={crop} onChange={e => setCrop(e.target.value)} className="input-field w-full appearance-none pr-10">
                  {CROP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Speed</label>
              <div className="flex flex-wrap gap-2">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSpeed(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${speed === s.value ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subtitles */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Subtitles className="w-5 h-5 text-brand-purple" /> Subtitles
            </h2>
            <button
              onClick={() => setAddSubtitles(!addSubtitles)}
              className={`w-11 h-6 rounded-full relative transition-all ${addSubtitles ? 'bg-brand-purple' : 'bg-white/20'}`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.5 transition-all ${addSubtitles ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>
          {addSubtitles && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <p className="text-white/60 text-sm mb-3">Auto-generate and burn subtitles via Whisper</p>
              <button
                onClick={handleGenerateSubtitles}
                disabled={!videoPath || !!subtitlesJob}
                className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" /> Generate Now
              </button>
              {subtitlesJob && <div className="mt-3"><JobProgress job={subtitlesJob} label="Generating subtitles..." /></div>}
            </motion.div>
          )}
        </motion.div>

        {/* Text Overlay */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-brand-purple" /> Text Overlay
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Enter text overlay..."
              value={textOverlay}
              onChange={e => setTextOverlay(e.target.value)}
            />
            <div>
              <label className="text-white/60 text-sm mb-2 block">Position</label>
              <div className="flex gap-2">
                {TEXT_POSITIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setTextPosition(p.value)}
                    className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${textPosition === p.value ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Export */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
          <Download className="w-5 h-5 text-brand-purple" /> Export Settings
        </h2>
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Preset</label>
            <div className="relative">
              <select value={exportPreset} onChange={e => setExportPreset(e.target.value)} className="input-field w-full appearance-none pr-10">
                {EXPORT_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Quality</label>
            <div className="relative">
              <select value={quality} onChange={e => setQuality(e.target.value)} className="input-field w-full appearance-none pr-10">
                {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!videoPath || !!exportJob}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {exportJob ? 'Exporting...' : 'Export Video'}
        </button>
      </motion.div>

      <AnimatePresence>
        {exportJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={exportJob} label="Exporting video..." />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {downloadUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Export Complete
            </h2>
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <span className="text-white/70 text-sm">{downloadName}</span>
              <a href={downloadUrl} download className="btn-primary text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
