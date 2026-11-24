import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { projectsApi, systemApi } from '../services/api'
import {
  FolderOpen, Film, Scissors, Cpu, HardDrive,
  ArrowRight, Plus, Youtube, Wand2, Upload,
  TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: projectsApi.stats,
    refetchInterval: 10000,
  })

  const { data: sysStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: systemApi.status,
    retry: false,
  })

  const statCards = [
    { label: 'Total Projects', value: stats?.total_projects ?? 0, icon: FolderOpen, color: 'purple' },
    { label: 'Videos Generated', value: stats?.videos_generated ?? 0, icon: Film, color: 'blue' },
    { label: 'Shorts Created', value: stats?.shorts_created ?? 0, icon: Scissors, color: 'green' },
    { label: 'Processing Jobs', value: stats?.processing_jobs ?? 0, icon: Cpu, color: 'orange' },
  ]

  const quickActions = [
    { label: 'YouTube to Shorts', icon: Youtube, to: '/youtube-shorts', desc: 'Convert YouTube videos to viral shorts', color: 'from-red-600 to-orange-500' },
    { label: 'Upload & Clip', icon: Upload, to: '/upload-clip', desc: 'Upload a video and extract highlights', color: 'from-brand-purple to-brand-blue' },
    { label: 'AI Video Generator', icon: Wand2, to: '/text-to-video', desc: 'Create videos from text prompts', color: 'from-blue-600 to-cyan-500' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-black text-gradient">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to VIRA AI — your local AI video studio.</p>
      </motion.div>

      {/* System Status Bar */}
      {sysStatus && (
        <motion.div variants={item} className="glass-card p-4 flex flex-wrap gap-6 items-center">
          <SystemBadge label="FFmpeg" ok={sysStatus.ffmpeg?.available} />
          <SystemBadge label="GPU" ok={sysStatus.gpu?.available} extra={sysStatus.gpu?.name} />
          <SystemBadge label="Ollama AI" ok={sysStatus.ollama?.available} />
          <SystemBadge label="Piper TTS" ok={sysStatus.piper_tts?.available} />
          <div className="ml-auto text-sm text-gray-500">
            RAM: {sysStatus.memory?.available_mb?.toFixed(0)} MB free •
            Disk: {sysStatus.disk?.free_gb?.toFixed(1)} GB free
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} color={color} />
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-brand-purple" />
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(({ label, icon: Icon, to, desc, color }) => (
            <Link key={to} to={to}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="glass-card-hover p-6 cursor-pointer group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-white group-hover:text-gradient transition-all">{label}</h3>
                <p className="text-gray-400 text-sm mt-1">{desc}</p>
                <div className="flex items-center gap-1 text-brand-purple text-sm mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  Get started <ArrowRight size={14} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Projects */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-brand-purple" />
            Recent Projects
          </h2>
          <Link to="/projects" className="text-sm text-brand-purple hover:text-brand-purple-bright transition-colors flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        
        {stats?.recent_projects?.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_projects.map((project: any) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-10 text-center">
            <FolderOpen size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No projects yet. Start by creating one above!</p>
            <Link to="/upload-clip" className="btn-primary inline-flex mt-4">
              <Plus size={16} /> Create First Project
            </Link>
          </div>
        )}
      </motion.div>

      {/* Storage */}
      {stats && (
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-brand-purple" />
              <span className="font-semibold text-white">Storage Usage</span>
            </div>
            <span className="text-sm text-gray-400">{stats.storage_mb?.toFixed(1)} MB used</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(stats.storage_mb / 10240 * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Local storage in VIRA AI workspace</p>
        </motion.div>
      )}
    </motion.div>
  )
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    purple: 'from-brand-purple/20 to-brand-purple/5 border-brand-purple/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
  }
  const iconColor: Record<string, string> = {
    purple: 'text-brand-purple-bright', blue: 'text-blue-400',
    green: 'text-green-400', orange: 'text-orange-400',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`glass-card p-5 bg-gradient-to-br ${colorMap[color]}`}
    >
      <Icon size={22} className={`${iconColor[color]} mb-3`} />
      <div className="text-3xl font-black text-white">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </motion.div>
  )
}

function SystemBadge({ label, ok, extra }: { label: string; ok?: boolean; extra?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle size={14} className="text-green-400" />
      ) : (
        <AlertCircle size={14} className="text-gray-600" />
      )}
      <span className={ok ? 'text-gray-300' : 'text-gray-600'}>
        {label}{extra && ok ? `: ${extra}` : ''}
      </span>
    </div>
  )
}

function ProjectRow({ project }: { project: any }) {
  const typeColors: Record<string, string> = {
    youtube_shorts: 'badge-purple',
    upload_clip: 'badge-blue',
    text_to_video: 'badge-green',
    general: 'badge-orange',
  }
  const typeLabels: Record<string, string> = {
    youtube_shorts: 'YouTube', upload_clip: 'Upload',
    text_to_video: 'AI Video', general: 'General',
  }

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="glass-card-hover p-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
        <Film size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate">{project.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {project.video_count} videos • {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>
      <span className={typeColors[project.project_type] || 'badge-orange'}>
        {typeLabels[project.project_type] || 'Project'}
      </span>
      <ArrowRight size={16} className="text-gray-600" />
    </motion.div>
  )
}
