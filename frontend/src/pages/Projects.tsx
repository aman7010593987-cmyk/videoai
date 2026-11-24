import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Plus, Search, Trash2, Film, Youtube,
  Sparkles, Upload, ChevronRight, Calendar, Video, X, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  type: 'youtube_shorts' | 'upload_clip' | 'ai_video'
  video_count: number
  created_at: string
  thumbnail?: string
}

const PROJECT_TYPES = [
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: Youtube, color: 'badge-orange' },
  { id: 'upload_clip', label: 'Upload Clip', icon: Upload, color: 'badge-blue' },
  { id: 'ai_video', label: 'AI Video', icon: Sparkles, color: 'badge-purple' },
]

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'youtube_shorts', label: 'YouTube Shorts' },
  { id: 'upload_clip', label: 'Upload Clip' },
  { id: 'ai_video', label: 'AI Video' },
]

const SAMPLE_PROJECTS: Project[] = [
  { id: '1', name: 'Morning Motivation Series', type: 'ai_video', video_count: 5, created_at: '2024-11-15' },
  { id: '2', name: 'Product Launch Clips', type: 'upload_clip', video_count: 12, created_at: '2024-11-10' },
  { id: '3', name: 'Tutorial Shorts', type: 'youtube_shorts', video_count: 8, created_at: '2024-11-05' },
]

const PROJECT_TYPE_ROUTES: Record<string, string> = {
  youtube_shorts: '/youtube',
  upload_clip: '/upload',
  ai_video: '/text-to-video',
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<Project['type']>('upload_clip')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.type === filter
    return matchSearch && matchFilter
  })

  const handleCreate = () => {
    if (!newName.trim()) return toast.error('Enter a project name')
    const project: Project = {
      id: Date.now().toString(),
      name: newName.trim(),
      type: newType,
      video_count: 0,
      created_at: new Date().toISOString().split('T')[0],
    }
    setProjects(prev => [project, ...prev])
    setShowCreate(false)
    setNewName('')
    setNewType('upload_clip')
    toast.success('Project created!')
  }

  const handleDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
    toast.success('Project deleted')
  }

  const getTypeInfo = (type: Project['type']) => PROJECT_TYPES.find(t => t.id === type)!

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="section-title"><span className="text-gradient">Projects</span></h1>
          <p className="section-subtitle">Organize and manage your video projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 mt-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            className="input-field w-full pl-10"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === tab.id ? 'bg-brand-purple text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-brand-purple/50" />
          </div>
          <p className="text-white/60 text-lg mb-2">No projects found</p>
          <p className="text-white/40 text-sm mb-6">
            {search ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Create Project
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, i) => {
            const typeInfo = getTypeInfo(project.type)
            const TypeIcon = typeInfo.icon
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card glass-card-hover p-5 group relative"
              >
                {/* Thumbnail */}
                <div className="w-full aspect-video bg-white/5 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Film className="w-10 h-10 text-white/20" />
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm leading-tight pr-2">{project.name}</h3>
                  <span className={`${typeInfo.color} text-xs px-2 py-0.5 rounded-full whitespace-nowrap`}>
                    {typeInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-white/50 text-xs">
                  <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {project.video_count} videos</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(project.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                  <a
                    href={PROJECT_TYPE_ROUTES[project.type]}
                    className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
                  >
                    <TypeIcon className="w-3.5 h-3.5" /> Open
                    <ChevronRight className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setConfirmDelete(project.id)}
                    className="btn-ghost p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">New Project</h2>
                <button onClick={() => setShowCreate(false)} className="btn-ghost p-1.5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-white/70 text-sm mb-1.5 block">Project Name</label>
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g. My YouTube Series"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Project Type</label>
                  <div className="space-y-2">
                    {PROJECT_TYPES.map(t => {
                      const Icon = t.icon
                      return (
                        <button
                          key={t.id}
                          onClick={() => setNewType(t.id as Project['type'])}
                          className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${
                            newType === t.id ? 'border-brand-purple bg-brand-purple/20' : 'border-white/10 bg-white/5 hover:border-white/30'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-white/70" />
                          <span className="text-white text-sm font-medium">{t.label}</span>
                          {newType === t.id && <CheckCircle className="w-4 h-4 text-brand-purple ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                  <button onClick={handleCreate} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm text-center"
            >
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h2 className="text-white font-semibold text-lg mb-2">Delete Project?</h2>
              <p className="text-white/60 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
