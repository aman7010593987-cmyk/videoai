import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import YoutubeShorts from './pages/YoutubeShorts'
import UploadClip from './pages/UploadClip'
import TextToVideo from './pages/TextToVideo'
import VideoEditor from './pages/VideoEditor'
import Subtitles from './pages/Subtitles'
import Voiceover from './pages/Voiceover'
import Projects from './pages/Projects'
import ExportHistory from './pages/ExportHistory'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="youtube-shorts" element={<YoutubeShorts />} />
        <Route path="upload-clip" element={<UploadClip />} />
        <Route path="text-to-video" element={<TextToVideo />} />
        <Route path="editor" element={<VideoEditor />} />
        <Route path="subtitles" element={<Subtitles />} />
        <Route path="voiceover" element={<Voiceover />} />
        <Route path="projects" element={<Projects />} />
        <Route path="exports" element={<ExportHistory />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
