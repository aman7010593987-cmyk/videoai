import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 300000, // 5 minutes for long processing jobs
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// --- Projects ---
export const projectsApi = {
  list: (params?: { search?: string; type?: string }) =>
    api.get('/projects/', { params }).then(r => r.data),
  create: (data: { name: string; description?: string; project_type?: string }) =>
    api.post('/projects/', data).then(r => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then(r => r.data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then(r => r.data),
  stats: () => api.get('/projects/stats/summary').then(r => r.data),
}

// --- Video ---
export const videoApi = {
  upload: (file: File, projectId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (projectId) form.append('project_id', projectId)
    return api.post('/video/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  analyze: (data: { file_path: string; project_id: string; max_clips?: number; clip_durations?: number[] }) =>
    api.post('/video/analyze', data).then(r => r.data),
  generateClips: (data: any) => api.post('/video/generate-clips', data).then(r => r.data),
  getClips: (projectId: string) => api.get(`/video/clips/${projectId}`).then(r => r.data),
  createTestVideo: () => api.post('/video/test-video').then(r => r.data),
  getInfo: (filePath: string) => api.get('/video/info', { params: { file_path: filePath } }).then(r => r.data),
}

// --- YouTube ---
export const youtubeApi = {
  getInfo: (url: string) => api.post('/youtube/info', { url }).then(r => r.data),
  process: (data: { url: string; max_clips?: number; clip_durations?: number[]; vertical?: boolean }) =>
    api.post('/youtube/process', data).then(r => r.data),
  validate: (url: string) => api.get('/youtube/validate', { params: { url } }).then(r => r.data),
}

// --- Jobs ---
export const jobsApi = {
  list: () => api.get('/system/jobs').then(r => r.data),
  get: (jobId: string) => api.get(`/system/jobs/${jobId}`).then(r => r.data),
  cancel: (jobId: string) => api.delete(`/system/jobs/${jobId}`).then(r => r.data),
}

// --- Voiceover ---
export const voiceoverApi = {
  getVoices: () => api.get('/voiceover/voices').then(r => r.data),
  generate: (data: { text: string; voice_id?: string; speed?: number }) =>
    api.post('/voiceover/generate', data).then(r => r.data),
  preview: (text: string) => api.get('/voiceover/preview', { params: { text } }).then(r => r.data),
}

// --- Subtitles ---
export const subtitlesApi = {
  generate: (data: { file_path: string; style?: string; burn_in?: boolean }) =>
    api.post('/subtitles/generate', data).then(r => r.data),
  getStyles: () => api.get('/subtitles/styles').then(r => r.data),
}

// --- Text to Video ---
export const textToVideoApi = {
  generate: (data: { prompt: string; duration?: number; style?: string; aspect_ratio?: string }) =>
    api.post('/text-to-video/generate', data).then(r => r.data),
  getStyles: () => api.get('/text-to-video/styles').then(r => r.data),
}

// --- Export ---
export const exportApi = {
  getPresets: () => api.get('/export/presets').then(r => r.data),
  export: (data: { file_path: string; preset?: string; quality?: string; name?: string }) =>
    api.post('/export/video', data).then(r => r.data),
  history: () => api.get('/export/history').then(r => r.data),
}

// --- System ---
export const systemApi = {
  status: () => api.get('/system/status').then(r => r.data),
  cleanup: () => api.post('/system/cleanup').then(r => r.data),
}

// --- Polling helper ---
export async function pollJob(
  jobId: string,
  onProgress: (job: any) => void,
  intervalMs = 1500,
  timeoutMs = 600000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const interval = setInterval(async () => {
      try {
        const job = await jobsApi.get(jobId)
        onProgress(job)
        
        if (job.status === 'completed') {
          clearInterval(interval)
          resolve(job)
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(interval)
          reject(new Error(job.error || `Job ${job.status}`))
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval)
          reject(new Error('Job timed out'))
        }
      } catch (e) {
        clearInterval(interval)
        reject(e)
      }
    }, intervalMs)
  })
}

export default api
