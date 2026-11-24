import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Type, Globe, Download, CheckCircle,
  FileText, Hash, AlignLeft, Zap, ChevronDown, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { subtitlesApi, pollJob } from '../services/api'
import JobProgress from '../components/ui/JobProgress'

interface Job {
  status: string
  progress: number
  message: string
  error?: string
}

interface SubtitleResult {
  transcript: string
  segment_count: number
  word_count: number
  srt_url: string
  vtt_url: string
  burned_video_url?: string
  srt_filename: string
  vtt_filename: string
  burned_filename?: string
}

const STYLES = [
  {
    id: 'default',
    label: 'Default',
    desc: 'Clean white subtitles with black outline, center bottom',
    emoji: '📝',
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'Bold yellow text, semi-transparent background bar',
    emoji: '✨',
  },
  {
    id: 'shorts',
    label: 'Shorts',
    desc: 'Large bold word-by-word highlight, optimized for mobile',
    emoji: '📱',
  },
]

const LANGUAGES = [
  { label: 'Auto Detect', value: 'auto' },
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Arabic', value: 'ar' },
]

export default function Subtitles() {
  const [videoPath, setVideoPath] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [style, setStyle] = useState('default')
  const [language, setLanguage] = useState('auto')
  const [burnIn, setBurnIn] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [result, setResult] = useState<SubtitleResult | null>(null)

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

  const handleGenerate = async () => {
    if (!videoPath) return toast.error('Please upload or enter a video path')
    try {
      const res = await subtitlesApi.generate({
        video_path: videoPath,
        style,
        language: language === 'auto' ? undefined : language,
        burn_in: burnIn,
      })
      const jobId = res.job_id
      setJob({ status: 'processing', progress: 0, message: 'Starting transcription...' })
      await pollJob(jobId, (j: Job) => setJob(j))
      const data = await subtitlesApi.getResult(jobId)
      setResult(data)
      toast.success('Subtitles generated!')
    } catch (err: any) {
      toast.error(err?.message || 'Subtitle generation failed')
      setJob(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">
          <span className="text-gradient">Subtitles</span>
        </h1>
        <p className="section-subtitle">Auto-generate accurate subtitles powered by OpenAI Whisper</p>
      </motion.div>

      {/* Upload */}
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
        <div className="p-4">
          <input
            type="text"
            className="input-field w-full"
            placeholder="Or paste video path: /path/to/video.mp4"
            value={videoPath}
            onChange={e => setVideoPath(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Style Selector */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-brand-purple" /> Subtitle Style
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                style === s.id
                  ? 'border-brand-purple bg-brand-purple/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <div className="text-2xl mb-2">{s.emoji}</div>
              <p className="text-white font-medium text-sm mb-1">{s.label}</p>
              <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Language + Burn-in */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-brand-purple" /> Language
          </h2>
          <div className="relative">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field w-full appearance-none pr-10">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
          </div>
          {language === 'auto' && (
            <div className="mt-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-300 text-xs">Whisper will auto-detect the spoken language</p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold">Burn Subtitles In</h2>
              <p className="text-white/50 text-xs mt-1">Embed text permanently into video</p>
            </div>
            <button
              onClick={() => setBurnIn(!burnIn)}
              className={`w-11 h-6 rounded-full relative transition-all ${burnIn ? 'bg-brand-purple' : 'bg-white/20'}`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.5 transition-all ${burnIn ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className={`text-sm rounded-xl p-3 ${burnIn ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300' : 'bg-white/5 text-white/50'}`}>
            {burnIn
              ? '⚠️ Subtitles will be permanently rendered into the video file'
              : 'Only SRT/VTT files will be generated (subtitles not embedded)'}
          </div>
        </div>
      </motion.div>

      {/* Generate Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <button
          onClick={handleGenerate}
          disabled={!videoPath || (!!job && job.status === 'processing')}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-5 h-5" />
          {job && job.status === 'processing' ? 'Generating...' : 'Generate Subtitles'}
        </button>
      </motion.div>

      <AnimatePresence>
        {job && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={job} label="Transcribing audio..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Hash, label: 'Segments', value: result.segment_count },
                { icon: AlignLeft, label: 'Words', value: result.word_count?.toLocaleString() },
                { icon: CheckCircle, label: 'Status', value: 'Complete' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-card p-4 text-center">
                  <Icon className="w-5 h-5 text-brand-purple mx-auto mb-1" />
                  <p className="text-xs text-white/50 mb-0.5">{label}</p>
                  <p className="text-white font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {/* Transcript */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-brand-purple" /> Transcript
              </h2>
              <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
              </div>
            </div>

            {/* Downloads */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-brand-purple" /> Download Files
              </h2>
              <div className="flex flex-wrap gap-3">
                <a href={result.srt_url} download={result.srt_filename} className="btn-secondary text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> SRT File
                </a>
                <a href={result.vtt_url} download={result.vtt_filename} className="btn-secondary text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> VTT File
                </a>
                {result.burned_video_url && (
                  <a href={result.burned_video_url} download={result.burned_filename} className="btn-primary text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" /> Video with Subtitles
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
