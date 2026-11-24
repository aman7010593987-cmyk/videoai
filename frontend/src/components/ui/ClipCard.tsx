import { motion } from 'framer-motion'
import { Download, Play, Clock, Scissors } from 'lucide-react'

interface ClipCardProps {
  clip: {
    id: string
    title: string
    file_path: string
    thumbnail_path?: string
    start_time: number
    end_time: number
    duration: number
    highlight_type: string
    highlight_score: number
    explanation: string
    is_vertical: boolean
    has_subtitles: boolean
  }
}

export default function ClipCard({ clip }: ClipCardProps) {
  const thumbnailUrl = clip.thumbnail_path
    ? `/storage/thumbnails/${clip.thumbnail_path.split('thumbnails')[1]?.replace(/\\/g, '/').replace(/^\//, '')}`
    : null

  const handleDownload = () => {
    const filename = clip.file_path.split(/[\\/]/).pop() || 'clip.mp4'
    const link = document.createElement('a')
    link.href = `/storage/outputs/${clip.file_path.split('outputs')[1]?.replace(/\\/g, '/').replace(/^\//, '')}`
    link.download = filename
    link.click()
  }

  const typeLabels: Record<string, string> = {
    hook: '🎯 Hook', educational: '📚 Educational',
    emotional: '❤️ Emotional', funny: '😄 Funny', general: '✨ Highlight'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="glass-card-hover overflow-hidden group"
    >
      {/* Thumbnail */}
      <div className={`relative bg-brand-surface flex items-center justify-center ${clip.is_vertical ? 'aspect-[9/16]' : 'aspect-video'} overflow-hidden`}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
        ) : (
          <Scissors size={32} className="text-gray-600" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={36} className="text-white" />
        </div>
        <div className="absolute top-2 left-2 badge-purple text-xs">
          {typeLabels[clip.highlight_type] || '✨ Clip'}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1">
          <Clock size={10} /> {clip.duration.toFixed(1)}s
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-white text-sm line-clamp-2">{clip.title}</h3>
        <div className="text-xs text-gray-500">
          {clip.start_time.toFixed(1)}s — {clip.end_time.toFixed(1)}s
          {' • '}{clip.is_vertical ? '9:16 Vertical' : '16:9 Landscape'}
        </div>
        {clip.explanation && (
          <p className="text-xs text-gray-500 line-clamp-2">{clip.explanation}</p>
        )}
        
        <button onClick={handleDownload} className="btn-primary w-full mt-2 py-2 text-sm">
          <Download size={14} /> Download MP4
        </button>
      </div>
    </motion.div>
  )
}
