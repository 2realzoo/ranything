import client from './client'
import type { Document } from '@/types'

export async function getDocuments(): Promise<Document[]> {
  const response = await client.get<{ documents: Document[] }>('/documents')
  return response.data.documents ?? []
}

export async function getDocument(id: string): Promise<Document> {
  const response = await client.get<Document>(`/documents/${id}`)
  return response.data
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post<Document>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function updateDocument(
  id: string,
  data: Partial<Document>
): Promise<Document> {
  const response = await client.patch<Document>(`/documents/${id}`, data)
  return response.data
}

export async function deleteDocument(id: string): Promise<void> {
  await client.delete(`/documents/${id}`)
}
