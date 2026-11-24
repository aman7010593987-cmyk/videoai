import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Youtube, Upload, Wand2, Film,
  Subtitles, Mic2, FolderOpen, Download, Settings,
  Zap
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/youtube-shorts', icon: Youtube, label: 'YouTube to Shorts' },
  { to: '/upload-clip', icon: Upload, label: 'Upload & Clip' },
  { to: '/text-to-video', icon: Wand2, label: 'AI Video Generator' },
  { to: '/editor', icon: Film, label: 'AI Video Editor' },
  { to: '/subtitles', icon: Subtitles, label: 'AI Subtitles' },
  { to: '/voiceover', icon: Mic2, label: 'AI Voiceover' },
  { to: '/projects', icon: FolderOpen, label: 'My Projects' },
  { to: '/exports', icon: Download, label: 'Export History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-64 bg-brand-navy border-r border-white/5 flex flex-col h-full"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-brand-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-gradient font-black text-xl tracking-tight">VIRA AI</div>
            <div className="text-gray-500 text-xs">Video Studio</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-item-active block' : 'nav-item block'
            }
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              <span>{label}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-card p-3 text-center">
          <div className="text-xs text-gray-500">VIRA AI v1.0</div>
          <div className="text-xs text-brand-purple mt-1">Local • Free • Unlimited</div>
        </div>
      </div>
    </motion.div>
  )
}
