import { Bell, Cpu, Wifi } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { systemApi } from '../../services/api'

export default function Header() {
  const { data: status } = useQuery({
    queryKey: ['system-status'],
    queryFn: systemApi.status,
    refetchInterval: 30000,
    retry: false,
  })

  return (
    <header className="h-16 bg-brand-navy/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          AI-Powered Video Creation Studio
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System Status Indicators */}
        <div className="flex items-center gap-3">
          <StatusDot
            label="FFmpeg"
            active={status?.ffmpeg?.available}
            icon={<Cpu size={12} />}
          />
          <StatusDot
            label="GPU"
            active={status?.gpu?.available}
            icon={<Cpu size={12} />}
          />
          <StatusDot
            label="Ollama"
            active={status?.ollama?.available}
            icon={<Wifi size={12} />}
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Bell size={18} className="text-gray-400" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold">
          V
        </div>
      </div>
    </header>
  )
}

function StatusDot({ label, active, icon }: { label: string; active?: boolean; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className={active ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
    </div>
  )
}
