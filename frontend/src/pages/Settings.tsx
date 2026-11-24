import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon, Cpu, HardDrive, Database,
  Trash2, RefreshCw, CheckCircle, AlertCircle, XCircle,
  FolderOpen, Mic, Zap, Monitor, ChevronDown, Loader2, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { systemApi } from '../services/api'

interface SystemStatus {
  ffmpeg_path: string
  ffmpeg_ok: boolean
  piper_ok: boolean
  piper_path?: string
  ollama_ok: boolean
  ollama_models: string[]
  whisper_model: string
  gpu_name?: string
  gpu_vram_mb?: number
  cpu_percent: number
  memory_total_mb: number
  memory_used_mb: number
  disk_total_gb: number
  disk_free_gb: number
  uploads_folder: string
  outputs_folder: string
  default_crf: number
  default_preset: string
  default_audio_bitrate: string
}

const WHISPER_MODELS = [
  { id: 'tiny', label: 'Tiny', vram: '~1 GB VRAM', speed: 'Fastest' },
  { id: 'base', label: 'Base', vram: '~1 GB VRAM', speed: 'Fast' },
  { id: 'small', label: 'Small', vram: '~2 GB VRAM', speed: 'Balanced' },
  { id: 'medium', label: 'Medium', vram: '~5 GB VRAM', speed: 'Accurate' },
]

const FFmpeg_PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'veryslow']
const AUDIO_BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k']

function StatusBadge({ ok, label }: { ok: boolean | undefined; label: string }) {
  if (ok === undefined) return <span className="badge-blue">{label}: Checking...</span>
  return ok
    ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> {label}: OK</span>
    : <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="w-4 h-4" /> {label}: Not found</span>
}

export default function Settings() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [whisperModel, setWhisperModel] = useState('base')
  const [defaultCrf, setDefaultCrf] = useState(23)
  const [defaultPreset, setDefaultPreset] = useState('medium')
  const [defaultAudioBitrate, setDefaultAudioBitrate] = useState('128k')
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const data = await systemApi.status()
      setStatus(data)
      if (data.whisper_model) setWhisperModel(data.whisper_model)
      if (data.default_crf) setDefaultCrf(data.default_crf)
      if (data.default_preset) setDefaultPreset(data.default_preset)
      if (data.default_audio_bitrate) setDefaultAudioBitrate(data.default_audio_bitrate)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load system status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleCleanup = async () => {
    setCleaning(true)
    try {
      const res = await systemApi.cleanup()
      toast.success(res.message || 'Temp files cleaned!')
      fetchStatus()
    } catch (err: any) {
      toast.error(err?.message || 'Cleanup failed')
    } finally {
      setCleaning(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await systemApi.saveSettings?.({
        whisper_model: whisperModel,
        default_crf: defaultCrf,
        default_preset: defaultPreset,
        default_audio_bitrate: defaultAudioBitrate,
      })
      toast.success('Settings saved!')
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSavingSettings(false)
    }
  }

  const memPercent = status ? Math.round((status.memory_used_mb / status.memory_total_mb) * 100) : 0
  const diskUsedGb = status ? status.disk_total_gb - status.disk_free_gb : 0
  const diskPercent = status ? Math.round((diskUsedGb / status.disk_total_gb) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="section-title"><span className="text-gradient">Settings</span></h1>
          <p className="section-subtitle">System configuration and status</p>
        </div>
        <button onClick={fetchStatus} disabled={loading} className="btn-secondary flex items-center gap-2 mt-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </motion.div>

      {/* System Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
          <Monitor className="w-5 h-5 text-brand-purple" /> System Status
        </h2>

        {loading ? (
          <div className="flex items-center gap-3 py-6">
            <Loader2 className="w-5 h-5 text-brand-purple animate-spin" />
            <span className="text-white/60">Checking system...</span>
          </div>
        ) : status ? (
          <div className="space-y-5">
            {/* Tool Status */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">FFmpeg</p>
                <StatusBadge ok={status.ffmpeg_ok} label="FFmpeg" />
                {status.ffmpeg_path && <p className="text-white/40 text-xs mt-1.5 truncate font-mono">{status.ffmpeg_path}</p>}
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Piper TTS</p>
                <StatusBadge ok={status.piper_ok} label="Piper TTS" />
                {!status.piper_ok && <p className="text-white/40 text-xs mt-1.5">Falls back to Windows SAPI</p>}
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Ollama</p>
                <StatusBadge ok={status.ollama_ok} label="Ollama" />
                {status.ollama_ok && <p className="text-white/40 text-xs mt-1.5">{status.ollama_models?.length || 0} models installed</p>}
              </div>
            </div>

            {/* GPU */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wider flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> GPU</p>
              {status.gpu_name ? (
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium text-sm">{status.gpu_name}</p>
                  <span className="badge-purple text-xs">{status.gpu_vram_mb ? `${Math.round(status.gpu_vram_mb / 1024)} GB VRAM` : 'Unknown VRAM'}</span>
                </div>
              ) : (
                <p className="text-white/50 text-sm">No GPU detected — using CPU</p>
              )}
            </div>

            {/* Memory */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Memory</p>
                <span className="text-white/60 text-xs">{Math.round(status.memory_used_mb / 1024)} / {Math.round(status.memory_total_mb / 1024)} GB ({memPercent}%)</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${memPercent}%`, background: memPercent > 85 ? '#ef4444' : memPercent > 65 ? '#f97316' : '#7c3aed' }}
                />
              </div>
            </div>

            {/* Disk */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Disk</p>
                <span className="text-white/60 text-xs">{diskUsedGb.toFixed(1)} / {status.disk_total_gb.toFixed(1)} GB ({diskPercent}%)</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${diskPercent}%`, background: diskPercent > 85 ? '#ef4444' : diskPercent > 65 ? '#f97316' : '#3b82f6' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-white/50">Could not load system status</div>
        )}
      </motion.div>

      {/* Whisper Model */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-2">
          <Mic className="w-5 h-5 text-brand-purple" /> Whisper Model
        </h2>
        <p className="text-white/50 text-sm mb-5">Affects transcription accuracy and speed</p>
        <div className="grid md:grid-cols-4 gap-3">
          {WHISPER_MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => setWhisperModel(m.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                whisperModel === m.id ? 'border-brand-purple bg-brand-purple/20' : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <p className="text-white font-semibold mb-1">{m.label}</p>
              <p className="text-white/50 text-xs mb-0.5">{m.vram}</p>
              <p className="text-brand-purple text-xs">{m.speed}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Export Defaults */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
          <SettingsIcon className="w-5 h-5 text-brand-purple" /> Export Defaults
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* CRF */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Default CRF (quality)</label>
            <div className="space-y-2">
              <input
                type="range"
                min={18}
                max={35}
                value={defaultCrf}
                onChange={e => setDefaultCrf(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>18 (Best)</span>
                <span className="text-brand-purple font-semibold">{defaultCrf}</span>
                <span>35 (Smallest)</span>
              </div>
            </div>
          </div>

          {/* Preset */}
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">FFmpeg Preset</label>
            <div className="relative">
              <select value={defaultPreset} onChange={e => setDefaultPreset(e.target.value)} className="input-field w-full appearance-none pr-10">
                {FFmpeg_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          </div>

          {/* Audio Bitrate */}
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Audio Bitrate</label>
            <div className="relative">
              <select value={defaultAudioBitrate} onChange={e => setDefaultAudioBitrate(e.target.value)} className="input-field w-full appearance-none pr-10">
                {AUDIO_BITRATES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Storage */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-brand-purple" /> Storage
          </h2>
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="btn-ghost flex items-center gap-2 text-sm text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Cleanup Temp Files
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Uploads Folder', path: status?.uploads_folder || 'Not configured' },
            { label: 'Outputs Folder', path: status?.outputs_folder || 'Not configured' },
          ].map(({ label, path }) => (
            <div key={label} className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs mb-1">{label}</p>
              <p className="text-white text-sm font-mono break-all">{path}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Ollama */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-brand-purple" /> Ollama (Local LLM)
        </h2>
        <div className="mt-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-5">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-sm">Recommended model: <strong>llama3.2:3b</strong> — fast, runs on 4 GB VRAM, great for script generation</p>
        </div>
        {status?.ollama_ok ? (
          <div>
            <p className="text-white/60 text-sm mb-3">Installed models ({status.ollama_models?.length || 0})</p>
            {status.ollama_models?.length > 0 ? (
              <div className="space-y-2">
                {status.ollama_models.map(model => (
                  <div key={model} className="bg-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-white font-mono text-sm">{model}</span>
                    {model.includes('llama3.2:3b') && <span className="badge-purple text-xs ml-auto">Recommended</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4 text-white/50 text-sm">
                No models installed. Run: <code className="text-brand-purple">ollama pull llama3.2:3b</code>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Ollama not running</span>
            </div>
            <p className="text-white/50 text-sm">Install Ollama from <span className="text-brand-purple">ollama.ai</span> and start it, then pull a model.</p>
          </div>
        )}
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </motion.div>
    </div>
  )
}
