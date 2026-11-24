import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Youtube, Link, Download, Scissors, CheckCircle, AlertCircle, Loader2, Play, Clock, Sparkles } from 'lucide-react'
import { youtubeApi, videoApi, pollJob } from '../services/api'
import toast from 'react-hot-toast'
import JobProgress from '../components/ui/JobProgress'
import ClipCard from '../components/ui/ClipCard'

export default function YoutubeShorts() {
  const [url, setUrl] = useState('')
  const [maxClips, setMaxClips] = useState(10)
  const [clipDurations, setClipDurations] = useState([15, 30, 45, 60])
  const [vertical, setVertical] = useState(true)
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [clipsJob, setClipsJob] = useState<any>(null)
  const [clips, setClips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingInfo, setFetchingInfo] = useState(false)

  const handleFetchInfo = async () => {
    if (!url.trim()) return
    setFetchingInfo(true)
    setVideoInfo(null)
    try {
      const info = await youtubeApi.getInfo(url)
      setVideoInfo(info)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setFetchingInfo(false)
    }
  }

  const handleProcess = async () => {
    if (!url.trim()) return toast.error('Enter a YouTube URL')
    setLoading(true)
    setResult(null)
    setClips([])
    
    try {
      const { job_id } = await youtubeApi.process({ url, max_clips: maxClips, clip_durations: clipDurations, vertical })
      toast.success('Processing started!')
      
      const jobResult = await pollJob(job_id, setJob)
      setResult(jobResult.result)
      toast.success(`Found ${jobResult.result.highlight_count} highlights!`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateClips = async () => {
    if (!result) return
    
    try {
      toast('Generating clips...', { icon: '🎬' })
      const { job_id } = await videoApi.generateClips({
        file_path: result.file_path,
        project_id: result.project_id,
        highlights: result.highlights,
        vertical,
      })
      
      const jobResult = await pollJob(job_id, setClipsJob)
      setClips(jobResult.result.clips)
      toast.success(`Generated ${jobResult.result.count} clips!`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleDuration = (dur: number) => {
    setClipDurations(prev =>
      prev.includes(dur) ? prev.filter(d => d !== dur) : [...prev, dur]
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="section-title flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Youtube size={22} className="text-red-400" />
          </span>
          YouTube to Shorts
        </h1>
        <p className="section-subtitle">Paste a YouTube URL to automatically extract highlight clips.</p>
      </div>

      {/* URL Input */}
      <div className="glass-card p-6 space-y-4">
        <label className="text-sm font-semibold text-gray-300">YouTube URL</label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-10"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
            />
          </div>
          <button onClick={handleFetchInfo} disabled={fetchingInfo} className="btn-secondary px-5">
            {fetchingInfo ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Preview
          </button>
        </div>

        {/* Video Info Preview */}
        <AnimatePresence>
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 rounded-xl p-4 flex gap-4 items-start"
            >
              {videoInfo.thumbnail_url && (
                <img src={videoInfo.thumbnail_url} alt="" className="w-32 h-20 object-cover rounded-lg flex-shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-white">{videoInfo.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Duration: {Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}
                  {videoInfo.uploader && ` • ${videoInfo.uploader}`}
                </p>
                <div className="badge-green mt-2">Ready to process</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings */}
      <div className="glass-card p-6 space-y-6">
        <h2 className="font-semibold text-white">Clip Settings</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Number of Clips</label>
            <div className="flex gap-2">
              {[5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxClips(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    maxClips === n
                      ? 'bg-brand-purple text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Output Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVertical(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  vertical ? 'bg-brand-purple text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                9:16 Vertical
              </button>
              <button
                onClick={() => setVertical(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  !vertical ? 'bg-brand-purple text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                16:9 Landscape
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Clip Durations</label>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map(dur => (
              <button
                key={dur}
                onClick={() => toggleDuration(dur)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  clipDurations.includes(dur)
                    ? 'bg-brand-purple/30 border border-brand-purple/60 text-brand-purple-bright'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={loading || !url.trim()}
        className="btn-primary w-full py-4 text-lg"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        {loading ? 'Processing...' : 'Analyze & Extract Highlights'}
      </button>

      {/* Job Progress */}
      {job && <JobProgress job={job} />}
      {clipsJob && <JobProgress job={clipsJob} label="Generating Clips" />}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  <CheckCircle size={20} className="inline mr-2 text-green-400" />
                  Analysis Complete
                </h2>
                <button onClick={handleGenerateClips} className="btn-primary">
                  <Scissors size={16} /> Generate {result.highlight_count} Clips
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <InfoBox label="Video Title" value={result.video_title} />
                <InfoBox label="Highlights Found" value={result.highlight_count} />
                <InfoBox label="Transcript Words" value={result.transcript?.word_count || 0} />
              </div>
            </div>

            {/* Highlights List */}
            <div>
              <h3 className="font-semibold text-white mb-3">Detected Highlights</h3>
              <div className="space-y-3">
                {result.highlights.map((h: any, i: number) => (
                  <HighlightRow key={i} highlight={h} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Clips */}
      {clips.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="font-semibold text-white mb-4">Generated Clips ({clips.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map(clip => <ClipCard key={clip.id} clip={clip} />)}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-white mt-1 truncate">{value}</div>
    </div>
  )
}

function HighlightRow({ highlight, index }: { highlight: any; index: number }) {
  const typeColors: Record<string, string> = {
    hook: 'badge-purple',
    educational: 'badge-blue',
    emotional: 'badge-green',
    funny: 'badge-orange',
    general: 'badge-orange',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-4 flex gap-4 items-start"
    >
      <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center text-sm font-bold text-brand-purple-bright flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm truncate">{highlight.title}</span>
          <span className={typeColors[highlight.highlight_type] || 'badge-orange'}>
            {highlight.highlight_type}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <Clock size={11} /> {highlight.start_time.toFixed(1)}s — {highlight.end_time.toFixed(1)}s
          <span>({highlight.duration.toFixed(1)}s)</span>
          <span className="text-brand-purple">Score: {(highlight.score * 100).toFixed(0)}%</span>
        </div>
        {highlight.transcript_text && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{highlight.transcript_text}</p>
        )}
      </div>
    </motion.div>
  )
}
