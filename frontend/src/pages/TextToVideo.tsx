import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Film, Clock, Square, Mic, Download,
  ChevronDown, AlertCircle, CheckCircle, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { textToVideoApi, pollJob } from '../services/api'
import JobProgress from '../components/ui/JobProgress'

interface Job {
  status: string
  progress: number
  message: string
  error?: string
}

interface Scene {
  index: number
  text: string
  visual_description: string
  duration: number
}

interface VideoResult {
  url: string
  filename: string
  duration: number
  scenes: Scene[]
}

const STYLES = [
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬' },
  { id: 'documentary', label: 'Documentary', emoji: '📽️' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
  { id: 'news', label: 'News', emoji: '📰' },
  { id: 'storytelling', label: 'Storytelling', emoji: '📖' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨' },
  { id: 'historical', label: 'Historical', emoji: '🏛️' },
]

const DURATIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
]

const RATIOS = [
  { label: '16:9', value: '16:9', desc: 'Landscape' },
  { label: '9:16', value: '9:16', desc: 'Portrait' },
  { label: '1:1', value: '1:1', desc: 'Square' },
]

const VOICES = [
  { id: 'en_US-ryan-medium', label: 'Ryan (EN, Male)' },
  { id: 'en_US-amy-medium', label: 'Amy (EN, Female)' },
  { id: 'en_GB-alan-medium', label: 'Alan (EN-GB, Male)' },
  { id: 'en_US-kusal-medium', label: 'Kusal (EN, Male)' },
  { id: 'es_ES-sharvard-medium', label: 'Sharvard (ES, Male)' },
  { id: 'fr_FR-upmc-medium', label: 'UPMC (FR, Male)' },
]

export default function TextToVideo() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('motivational')
  const [duration, setDuration] = useState(60)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [voice, setVoice] = useState('en_US-ryan-medium')
  const [job, setJob] = useState<Job | null>(null)
  const [result, setResult] = useState<VideoResult | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error('Please enter a prompt')
    const dur = isCustom ? parseInt(customDuration) : duration
    if (isCustom && (!dur || dur < 10 || dur > 300)) return toast.error('Custom duration must be 10–300 seconds')

    try {
      const res = await textToVideoApi.generate({
        prompt: prompt.trim(),
        style,
        duration: dur,
        aspect_ratio: aspectRatio,
        voice_id: voice,
      })
      const jobId = res.job_id
      setJob({ status: 'processing', progress: 0, message: 'Starting generation...' })
      await pollJob(jobId, (j: Job) => setJob(j))
      const videoRes = await textToVideoApi.getResult(jobId)
      setResult(videoRes)
      toast.success('Video generated successfully!')
    } catch (err: any) {
      toast.error(err?.message || 'Generation failed')
      setJob(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">
          <span className="text-gradient">Text to Video</span>
        </h1>
        <p className="section-subtitle">Transform your ideas into narrated video presentations</p>
        <div className="mt-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-sm">
            Creates AI-scripted video with voiceover + visual slides (not AI image generation)
          </p>
        </div>
      </motion.div>

      {/* Prompt */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <label className="text-white font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-purple" /> Your Prompt
        </label>
        <textarea
          className="input-field w-full h-36 resize-none"
          placeholder="Create a 60-second motivational video about success..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <div className="flex justify-between text-xs text-white/40">
          <span>{prompt.length} characters</span>
          <span>Be descriptive for better results</span>
        </div>
      </motion.div>

      {/* Style Selector */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <label className="text-white font-semibold flex items-center gap-2 mb-4">
          <Film className="w-5 h-5 text-brand-purple" /> Video Style
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${
                style === s.id
                  ? 'border-brand-purple bg-brand-purple/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Duration + Aspect + Voice */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-3 gap-4">
        {/* Duration */}
        <div className="glass-card p-5">
          <label className="text-white font-semibold flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-brand-purple" /> Duration
          </label>
          <div className="space-y-2">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { setDuration(d.value); setIsCustom(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  !isCustom && duration === d.value ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {d.label}
              </button>
            ))}
            <button
              onClick={() => setIsCustom(true)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                isCustom ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              Custom
            </button>
            {isCustom && (
              <input
                type="number"
                className="input-field w-full text-sm"
                placeholder="Seconds (10–300)"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="glass-card p-5">
          <label className="text-white font-semibold flex items-center gap-2 mb-4">
            <Square className="w-4 h-4 text-brand-purple" /> Aspect Ratio
          </label>
          <div className="space-y-2">
            {RATIOS.map(r => (
              <button
                key={r.value}
                onClick={() => setAspectRatio(r.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                  aspectRatio === r.value ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-xs opacity-70">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className="glass-card p-5">
          <label className="text-white font-semibold flex items-center gap-2 mb-4">
            <Mic className="w-4 h-4 text-brand-purple" /> Voice
          </label>
          <div className="relative">
            <select
              value={voice}
              onChange={e => setVoice(e.target.value)}
              className="input-field w-full appearance-none pr-10"
            >
              {VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Generate Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <button
          onClick={handleGenerate}
          disabled={!!job && job.status === 'processing'}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          {job && job.status === 'processing' ? 'Generating...' : 'Generate Video'}
        </button>
      </motion.div>

      {/* Job Progress */}
      <AnimatePresence>
        {job && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={job} label="Generating video..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Video Ready
              </h2>
              <div className="bg-white/5 rounded-xl aspect-video flex items-center justify-center mb-4">
                <video src={result.url} controls className="w-full h-full rounded-xl" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-sm">{result.filename} · {result.duration}s</div>
                <a href={result.url} download className="btn-primary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>

            {result.scenes && result.scenes.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-purple" /> Script Scenes ({result.scenes.length})
                </h2>
                <div className="space-y-3">
                  {result.scenes.map(scene => (
                    <div key={scene.index} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge-purple text-xs">Scene {scene.index + 1}</span>
                        <span className="text-white/40 text-xs">{scene.duration}s</span>
                      </div>
                      <p className="text-white text-sm mb-1">{scene.text}</p>
                      <p className="text-white/40 text-xs italic">{scene.visual_description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
