import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Play, Download, Info, CheckCircle,
  Volume2, Clock, FileAudio, Hash, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { voiceoverApi, pollJob } from '../services/api'
import JobProgress from '../components/ui/JobProgress'

interface Voice {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  language: string
  language_code: string
}

interface PreviewInfo {
  word_count: number
  estimated_duration: number
  character_count: number
}

interface Job {
  status: string
  progress: number
  message: string
  error?: string
}

export default function Voiceover() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [audioFilename, setAudioFilename] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const data = await voiceoverApi.getVoices()
        setVoices(data.voices || data || [])
        if (data.voices?.length > 0 || data?.length > 0) {
          setSelectedVoice((data.voices || data)[0].id)
        }
      } catch (err: any) {
        toast.error('Failed to load voices')
      } finally {
        setLoadingVoices(false)
      }
    }
    fetchVoices()
  }, [])

  const handlePreview = async () => {
    if (!text.trim()) return toast.error('Please enter some text first')
    setLoadingPreview(true)
    try {
      const data = await voiceoverApi.preview({ text, voice_id: selectedVoice, speed })
      setPreviewInfo(data)
    } catch (err: any) {
      toast.error(err?.message || 'Preview failed')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleGenerate = async () => {
    if (!text.trim()) return toast.error('Please enter some text')
    if (!selectedVoice) return toast.error('Please select a voice')
    try {
      const res = await voiceoverApi.generate({ text, voice_id: selectedVoice, speed })
      const jobId = res.job_id
      setJob({ status: 'processing', progress: 0, message: 'Starting synthesis...' })
      await pollJob(jobId, (j: Job) => setJob(j))
      const result = await voiceoverApi.getResult(jobId)
      setAudioUrl(result.url)
      setAudioFilename(result.filename)
      toast.success('Voiceover generated!')
    } catch (err: any) {
      toast.error(err?.message || 'Generation failed')
      setJob(null)
    }
  }

  const genderColor = (gender: string) => {
    if (gender === 'female') return 'badge-purple'
    if (gender === 'male') return 'badge-blue'
    return 'badge-green'
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const speedPercent = ((speed - 0.5) / 1.5) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">
          <span className="text-gradient">Voiceover</span>
        </h1>
        <p className="section-subtitle">Generate natural-sounding voiceovers with Piper TTS</p>
        <div className="mt-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-sm">
            Uses <strong>Piper TTS</strong> for high-quality neural voice synthesis.
            Falls back to Windows SAPI if Piper is not installed.
          </p>
        </div>
      </motion.div>

      {/* Voice Selection Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5 text-brand-purple" /> Select Voice
        </h2>
        {loadingVoices ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
            <span className="ml-3 text-white/60">Loading voices...</span>
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-8 text-white/50">No voices available. Check your Piper TTS installation.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {voices.map(voice => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedVoice === voice.id
                    ? 'border-brand-purple bg-brand-purple/20'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white font-medium text-sm">{voice.name}</span>
                  <div className="flex gap-1.5">
                    <span className={`${genderColor(voice.gender)} text-xs px-2 py-0.5 rounded-full`}>{voice.gender}</span>
                    <span className="badge-blue text-xs px-2 py-0.5 rounded-full">{voice.language_code}</span>
                  </div>
                </div>
                <p className="text-white/40 text-xs">{voice.language}</p>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Text Area */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <label className="text-white font-semibold flex items-center gap-2 mb-4">
          <FileAudio className="w-5 h-5 text-brand-purple" /> Text to Speak
        </label>
        <textarea
          className="input-field w-full h-40 resize-none"
          placeholder="Enter the text you want to convert to speech..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>{text.length} characters</span>
          <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </motion.div>

      {/* Speed Slider */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-brand-purple" /> Speed
          </h2>
          <span className="text-brand-purple font-bold text-lg">{speed.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={speed}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${speedPercent}%, rgba(255,255,255,0.1) ${speedPercent}%)`
          }}
        />
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>0.5× (Slow)</span>
          <span>1.0× (Normal)</span>
          <span>2.0× (Fast)</span>
        </div>
      </motion.div>

      {/* Preview Info + Generate */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-wrap gap-4">
        <button
          onClick={handlePreview}
          disabled={loadingPreview || !text.trim()}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          Preview Info
        </button>
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || !selectedVoice || (!!job && job.status === 'processing')}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic className="w-4 h-4" />
          {job && job.status === 'processing' ? 'Generating...' : 'Generate Voiceover'}
        </button>
      </motion.div>

      {/* Preview Info Result */}
      <AnimatePresence>
        {previewInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card p-5">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-purple" /> Estimated Info
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Hash, label: 'Words', value: previewInfo.word_count },
                  { icon: Hash, label: 'Characters', value: previewInfo.character_count },
                  { icon: Clock, label: 'Est. Duration', value: formatDuration(previewInfo.estimated_duration) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                    <Icon className="w-4 h-4 text-brand-purple mx-auto mb-1" />
                    <p className="text-xs text-white/50 mb-0.5">{label}</p>
                    <p className="text-white font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Progress */}
      <AnimatePresence>
        {job && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JobProgress job={job} label="Synthesizing audio..." />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Player */}
      <AnimatePresence>
        {audioUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Voiceover Ready
            </h2>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full mb-4"
              style={{ filter: 'invert(0.8) hue-rotate(220deg)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">{audioFilename}</span>
              <a href={audioUrl} download={audioFilename} className="btn-primary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Download WAV
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
