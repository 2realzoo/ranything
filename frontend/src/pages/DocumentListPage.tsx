import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Files,
  Upload,
  Search,
  Trash2,
  Pencil,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowUpDown,
  Plus,
  X,
  Save,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatFileSize, formatRelativeDate } from '@/lib/utils'
import { getDocuments, updateDocument, deleteDocument } from '@/api/documents'
import { toast } from '@/hooks/use-toast'
import type { Document } from '@/types'

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending',
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    dotColor: 'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    dotColor: 'bg-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    dotColor: 'bg-red-400',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
  },
}

type SortKey = 'name' | 'uploadedAt' | 'size' | 'status'

function DocumentCard({
  doc,
  onEdit,
  onDelete,
}: {
  doc: Document
  onEdit: (doc: Document) => void
  onDelete: (doc: Document) => void
}) {
  const config = STATUS_CONFIG[doc.status]
  const StatusIcon = config.icon
  const visibleTags = doc.tags.slice(0, 3)
  const extraTags = doc.tags.length - 3

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-blue-300 hover:shadow-card-hover animate-fade-in">
      {/* Status dot */}
      <div className={cn('absolute top-3 right-3 h-2 w-2 rounded-full', config.dotColor, doc.status === 'processing' && 'animate-pulse')} />

      {/* File icon + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <FileText className="h-4 w-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-800 truncate leading-tight" title={doc.name}>
            {doc.name}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{doc.filename}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium', config.badgeClass)}>
          <StatusIcon className={cn('h-3 w-3', doc.status === 'processing' && 'animate-spin')} />
          {config.label}
        </span>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {visibleTags.map((tag) => (
            <span key={tag} className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="inline-block rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
              +{extraTags}
            </span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono">{formatFileSize(doc.size)}</span>
        <span>{formatRelativeDate(doc.uploadedAt)}</span>
      </div>

      {/* Action buttons */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 rounded-b-xl bg-gradient-to-t from-white to-transparent px-3 pb-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => onEdit(doc)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-card transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(doc)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-300 shadow-card transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function EditDocumentDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: Document | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [tags, setTags] = useState<string[]>(doc?.tags ?? [])
  const [newTag, setNewTag] = useState('')
  const [questions, setQuestions] = useState<string[]>(doc?.virtualQuestions ?? [])
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null)

  // Sync state when doc changes
  React.useEffect(() => {
    if (doc) {
      setTags(doc.tags)
      setQuestions(doc.virtualQuestions)
    }
  }, [doc])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Document>) => updateDocument(doc!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: 'Document updated' })
      onOpenChange(false)
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update document' })
    },
  })

  const addTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleSave = () => {
    saveMutation.mutate({
      tags,
      virtualQuestions: questions.filter(Boolean),
    })
  }

  if (!doc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Edit Document</DialogTitle>
          <DialogDescription className="text-xs text-slate-400 truncate">
            {doc.filename}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tags" className="mt-1">
          <TabsList>
            <TabsTrigger value="tags">AI Tags</TabsTrigger>
            <TabsTrigger value="questions">Virtual Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2 min-h-[56px] rounded-lg border border-slate-200 bg-slate-50 p-3">
              {tags.length === 0 && (
                <span className="text-xs text-slate-400 italic">No tags</span>
              )}
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="group inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  {tag}
                  <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag…"
                className="h-8 text-sm"
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="mt-3">
            <ScrollArea className="h-[220px] pr-2">
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={idx} className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                    <span className="font-mono text-xs text-blue-400 w-4 text-right flex-shrink-0 mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      {editingQIdx === idx ? (
                        <Input
                          value={q}
                          onChange={(e) => setQuestions((prev) => prev.map((it, i) => i === idx ? e.target.value : it))}
                          onBlur={() => setEditingQIdx(null)}
                          autoFocus
                          className="h-7 text-xs"
                        />
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setEditingQIdx(idx)}>
                          {q || <span className="italic text-slate-400 text-xs">Click to edit</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6 italic">No virtual questions</p>
                )}
              </div>
            </ScrollArea>
            <button
              onClick={() => setQuestions((prev) => [...prev, ''])}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-1.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Question
            </button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2">
          <button onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: Document | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(doc!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: 'Document deleted' })
      onOpenChange(false)
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to delete document' })
    },
  })

  if (!doc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Document</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The document and all its indexed data will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-1">
          <p className="text-sm text-slate-800 font-medium truncate">{doc.name}</p>
          <p className="text-xs text-slate-500 truncate">{doc.filename}</p>
        </div>

        <DialogFooter className="mt-2">
          <button onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white mb-4 shadow-card">
        <BookOpen className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="mt-1 text-sm text-slate-400 max-w-[260px]">
        {hasSearch
          ? 'Try a different search term or clear your filter.'
          : 'Upload your first document to get started building your knowledge base.'}
      </p>
      {!hasSearch && (
        <Link to="/documents/upload">
          <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Upload className="h-3.5 w-3.5" />
            Upload Document
          </button>
        </Link>
      )}
    </div>
  )
}

export default function DocumentListPage() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data ?? []
      const hasProcessing = docs.some((d: Document) => d.status === 'processing' || d.status === 'pending')
      return hasProcessing ? 3000 : false
    },
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    )

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'uploadedAt')
        cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      else if (sortKey === 'size') cmp = a.size - b.size
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [documents, search, sortKey, sortAsc])

  const completedCount = documents.filter((d) => d.status === 'completed').length

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Files className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-base font-semibold text-slate-800">Document Library</h1>
            <p className="text-[11px] text-slate-400">{completedCount} indexed · {documents.length} total</p>
          </div>
          {documents.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 font-mono">
              {documents.length}
            </span>
          )}
        </div>

        <Link to="/documents/upload">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, tags…"
            className="pl-8 h-8 text-sm bg-slate-50 border-slate-200"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(['name', 'uploadedAt', 'size', 'status'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all duration-150 border',
                sortKey === key
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              {key === 'uploadedAt' ? 'Date' : key.charAt(0).toUpperCase() + key.slice(1)}
              {sortKey === key && <span className="font-mono text-[9px]">{sortAsc ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl border border-slate-200 bg-white animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasSearch={search.length > 0} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onEdit={setEditingDoc} onDelete={setDeletingDoc} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      <EditDocumentDialog
        doc={editingDoc}
        open={editingDoc !== null}
        onOpenChange={(v) => { if (!v) setEditingDoc(null) }}
      />
      <DeleteDialog
        doc={deletingDoc}
        open={deletingDoc !== null}
        onOpenChange={(v) => { if (!v) setDeletingDoc(null) }}
      />
    </div>
  )
}
