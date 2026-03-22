import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import ChatPage from '@/pages/ChatPage'
import DocumentListPage from '@/pages/DocumentListPage'
import DocumentUploadPage from '@/pages/DocumentUploadPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/documents" element={<DocumentListPage />} />
        <Route path="/documents/upload" element={<DocumentUploadPage />} />
      </Route>
    </Routes>
  )
}
