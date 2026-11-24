import { motion } from 'framer-motion'

interface JobProgressProps {
  job: {
    status: string
    progress: number
    message: string
    error?: string
  }
  label?: string
}

export default function JobProgress({ job, label = 'Processing' }: JobProgressProps) {
  if (!job) return null

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className={`text-xs font-medium ${statusColors[job.status] || 'text-gray-400'}`}>
          {job.status.toUpperCase()}
        </span>
      </div>
      
      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${job.progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{job.message}</span>
        <span className="text-gray-500">{job.progress}%</span>
      </div>
      
      {job.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          {job.error}
        </div>
      )}
    </motion.div>
  )
}
