import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Film, Settings, Zap, Download, CheckCircle,
  AlertCircle, Clock, Maximize2, BarChart2, FileVideo
} from 'lucide-react'
import toast from 'react-hot-toast'
import { videoApi, pollJob } from '../services/api'
import JobProgress from '../components/ui/JobProgress'
import ClipCard from '../components/ui/ClipCard'

interface VideoInfo {
  resolution: string
  duration: number
  fps: number
  size: number
  filename: string
}

interface Highlight {
  start: number
  end: number
  score: number
  reason: string
}

interface Clip {
  id: string
  url: string
  thumbnail?: string
  duration: number
  start: number
  end: number
  filename: string
}

interface Job {
  status: string
  progress: number
  message: string
  error?: string
}

export default function UploadClip() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [maxClips, setMaxClips] = useState<number>(10)
  const [clipDurations, setClipDurations] = useState<number[]>([30])
  const [vertical, setVertical] = useState<boolean>(false)
  const [analyzeJob, setAnalyzeJob] = useState<Job | null>(null)
  const [clipsJob, setClipsJob] = useState<Job | null>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [uploadedPath, setUploadedPath] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploadedFile(file)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('video', file)
      const res = await videoApi.upload(formData)
      setUploadedPath(res.path || res.file_path || '')
      setVideoInfo({
        filename: file.name,
        resolution: res.resolution || 'Unknown',
        duration: res.duration || 0,
        fps: res.fps || 0,
        size: file.size,
      })
      toast.success('Video uploaded successfully!')
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.webm'] },
    maxFiles: 1,
  })

  const toggleDuration = (dur: number) => {
    setClipDurations(prev =>
      prev.includes(dur) ? prev.filter(d => d !== dur) : [...prev, dur]
    )
  }

  const handleAnalyze = async () => {
    if (!uploadedPath) return toast.error('Please upload a video first')
    try {
      const res = await videoApi.analyze({ video_path: uploadedPath })
      const jobId = res.job_id
      const jobInit: Job = { status: 'processing', progress: 0, message: 'Analyzing...' }
      setAnalyzeJob(jobInit)
      await pollJob(jobId, (job: Job) => setAnalyzeJob(job))
      const result = await videoApi.getAnalysis(jobId)
      setHighlights(result.highlights || [])
      toast.success('Analysis complete!')
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed')
      setAnalyzeJob(null)
    }
  }

  const handleGenerateClips = async () => {
    if (!uploadedPath) return toast.error('Please upload a video first')
    if (clipDurations.length === 0) return toast.error('Select at least one clip duration')
    try {
      const res = await videoApi.generateClips({
        video_path: uploadedPath,
        max_clips: maxClips,
        clip_durations: clipDurations,
        vertical,
      })
      const jobId = res.job_id
      const jobInit: Job = { status: 'processing', progress: 0, message: 'Generating clips...' }
      setClipsJob(jobInit)
      await pollJob(jobId, (job: Job) => setClipsJob(job))
      const result = await videoApi.getClips(jobId)
      setClips(result.clips || [])
      toast.success(`${result.clips?.length || 0} clips generated!`)
    } catch (err: any) {
      toast.error(err?.message || 'Clip generation failed')
      setClipsJob(null)
    }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes: number) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
    return `${(bytes / 1e3).toFixed(0)} KB`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">
          <span className="text-gradient">Upload & Clip</span>
        </h1>
        <p className="section-subtitle">Upload your video, analyze highlights, and generate viral-ready clips</p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-2"
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'border-brand-purple bg-brand-purple/10' : 'border-white/20 hover:border-brand-purple/50 hover:bg-white/5'}`}
        >
          <input {...getInputProps()} />
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-white/70">Uploading...</p>
              </motion.div>
            ) : uploadedFile ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-400" />
                <p className="text-white font-medium">{uploadedFile.name}</p>
                <p className="text-white/50 text-sm">Drop a new file to replace</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-purple/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-brand-purple" />
                </div>
                <div>
                  <p className="text-white font-medium text-lg">
                    {isDragActive ? 'Drop it here!' : 'Drag & drop your video'}
                  </p>
                  <p className="text-white/50 text-sm mt-1">or click to browse — MP4, MOV, MKV, WEBM</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Video Info */}
      <AnimatePresence>
        {videoInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-brand-purple" /> Video Info
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Maximize2, label: 'Resolution', value: videoInfo.resolution },
                { icon: Clock, label: 'Duration', value: formatDuration(videoInfo.duration) },
                { icon: BarChart2, label: 'FPS', value: `${videoInfo.fps} fps` },
                { icon: Film, label: 'Size', value: formatSize(videoInfo.size) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </div>
                  <p className="text-white font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-6">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-purple" /> Clip Settings
        </h2>

        {/* Max Clips */}
        <div>
          <label className="text-white/70 text-sm mb-3 block">Max Clips</label>
          <div className="flex gap-3">
            {[5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => setMaxClips(n)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${maxClips === n ? 'btn-primary' : 'btn-ghost'}`}
              >
                {n} clips
              </button>
            ))}
          </div>
        </div>

        {/* Clip Durations */}
        <div>
          <label className="text-white/70 text-sm mb-3 block">Clip Durations</label>
          <div className="flex flex-wrap gap-3">
            {[15, 30, 45, 60].map(dur => (
              <label key={dur} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => toggleDuration(dur)}
                  className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all border ${clipDurations.includes(dur) ? 'bg-brand-purple border-brand-purple' : 'border-white/30 bg-transparent'}`}
                >
                  {clipDurations.includes(dur) && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className="text-white/80 text-sm">{dur}s</span>
              </label>
            ))}
          </div>
        </div>

        {/* Vertical Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Vertical / Shorts Format</p>
            <p className="text-white/50 text-xs">Crop to 9:16 for TikTok / Instagram Reels / YouTube Shorts</p>
          </div>
          <button
            onClick={() => setVertical(!vertical)}
            className={`w-12 h-6 rounded-full transition-all relative ${vertical ? 'bg-brand-purple' : 'bg-white/20'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${vertical ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4">
        <button onClick={handleAnalyze} disabled={!uploadedPath || !!analyzeJob} className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <BarChart2 className="w-4 h-4" /> Analyze Video
        </button>
        <button onClick={handleGenerateClips} disabled={!uploadedPath || !!clipsJob} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Zap className="w-4 h-4" /> Generate Clips
        </button>
      </motion.div>

      {/* Analyze Job Progress */}
      <AnimatePresence>
        {analyzeJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={analyzeJob} label="Analyzing video..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clips Job Progress */}
      <AnimatePresence>
        {clipsJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={clipsJob} label="Generating clips..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlights */}
      <AnimatePresence>
        {highlights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4">🎯 Detected Highlights ({highlights.length})</h2>
            <div className="space-y-3">
              {highlights.map((h, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{formatDuration(h.start)} → {formatDuration(h.end)}</p>
                    <p className="text-white/60 text-xs mt-1">{h.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-purple rounded-full" style={{ width: `${h.score * 100}%` }} />
                    </div>
                    <span className="text-white/60 text-xs">{Math.round(h.score * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clips Grid */}
      <AnimatePresence>
        {clips.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-purple" /> Generated Clips ({clips.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map(clip => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
