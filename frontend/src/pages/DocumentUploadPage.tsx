import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  X,
  Save,
  Pencil,
  Type,
  Image,
  Table2,
  FunctionSquare,
  ChevronRight,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatFileSize } from '@/lib/utils'
import { uploadDocument, updateDocument } from '@/api/documents'
import { toast } from '@/hooks/use-toast'
import type { Document, ParsedContent } from '@/types'

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
  },
}

const CONTENT_TYPE_ICONS = {
  text: Type,
  image: Image,
  table: Table2,
  equation: FunctionSquare,
}

const CONTENT_TYPE_COLORS = {
  text: 'text-blue-600 bg-blue-50 border-blue-200',
  image: 'text-purple-600 bg-purple-50 border-purple-200',
  table: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  equation: 'text-pink-600 bg-pink-50 border-pink-200',
}

function DropZone({
  onFileAccepted,
  uploading,
}: {
  onFileAccepted: (file: File) => void
  uploading: boolean
}) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          ['.docx'],
        'text/plain': ['.txt'],
        'text/markdown': ['.md'],
      },
      maxFiles: 1,
      maxSize: 50 * 1024 * 1024,
      onDropAccepted: ([file]) => onFileAccepted(file),
      onDropRejected: () =>
        toast({
          variant: 'destructive',
          title: 'File rejected',
          description: 'Only PDF, DOCX, TXT, and MD files under 50 MB are supported.',
        }),
      disabled: uploading,
    })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer',
        isDragActive && !isDragReject
          ? 'border-blue-400 bg-blue-50'
          : isDragReject
          ? 'border-red-400 bg-red-50'
          : 'border-slate-300 hover:border-blue-300 hover:bg-blue-50/40 bg-white',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200',
          isDragActive && !isDragReject
            ? 'border-blue-300 bg-blue-100 scale-110'
            : isDragReject
            ? 'border-red-300 bg-red-100'
            : 'border-slate-200 bg-slate-50'
        )}
      >
        <UploadCloud className={cn('h-7 w-7 transition-colors duration-200',
          isDragActive && !isDragReject ? 'text-blue-600' : isDragReject ? 'text-red-500' : 'text-slate-400'
        )} />
      </div>

      <div className="mt-4">
        <p className={cn('text-sm font-medium',
          isDragActive && !isDragReject ? 'text-blue-700' : isDragReject ? 'text-red-600' : 'text-slate-700'
        )}>
          {isDragActive && !isDragReject ? 'Drop to upload' : isDragReject ? 'File type not supported' : 'Drag & drop your document'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          or <span className="text-blue-600 underline underline-offset-2 cursor-pointer">browse files</span>
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {['PDF', 'DOCX', 'TXT', 'MD'].map((ext) => (
          <span key={ext} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
            .{ext.toLowerCase()}
          </span>
        ))}
        <span className="text-[10px] text-slate-400">· max 50 MB</span>
      </div>
    </div>
  )
}

function ParsedContentTab({
  content,
  onSave,
  saving,
}: {
  content: ParsedContent[]
  onSave: (updated: ParsedContent[]) => void
  saving: boolean
}) {
  const [items, setItems] = useState<ParsedContent[]>(content)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  const updateItem = (idx: number, text: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, content: text } : it))
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {items.length} content block{items.length !== 1 ? 's' : ''} · click to edit
        </p>
        <Button
          size="sm"
          onClick={() => onSave(items)}
          disabled={saving}
          className="h-7 text-xs"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>
      </div>

      <ScrollArea className="h-[340px] pr-2">
        <div className="space-y-2">
          {items.map((item, idx) => {
            const Icon = CONTENT_TYPE_ICONS[item.type]
            const colorClass = CONTENT_TYPE_COLORS[item.type]
            const isEditing = editingIdx === idx

            return (
              <div
                key={idx}
                className="group rounded-lg border border-slate-200 bg-white p-3 transition-all duration-150 hover:border-slate-300"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide',
                        colorClass
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {item.type}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Textarea
                        value={item.content}
                        onChange={(e) => updateItem(idx, e.target.value)}
                        onBlur={() => setEditingIdx(null)}
                        autoFocus
                        className="min-h-[60px] text-xs font-mono bg-slate-50 border-blue-200"
                      />
                    ) : (
                      <p
                        className="text-xs text-slate-500 leading-relaxed cursor-pointer line-clamp-4 font-mono"
                        onClick={() => setEditingIdx(idx)}
                      >
                        {item.content}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingIdx(isEditing ? null : idx)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-500 hover:text-blue-600"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function TagsTab({
  tags,
  onSave,
  saving,
}: {
  tags: string[]
  onSave: (tags: string[]) => void
  saving: boolean
}) {
  const [currentTags, setCurrentTags] = useState<string[]>(tags)
  const [newTag, setNewTag] = useState('')

  const addTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !currentTags.includes(trimmed)) {
      setCurrentTags((prev) => [...prev, trimmed])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setCurrentTags((prev) => prev.filter((t) => t !== tag))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {currentTags.length} tag{currentTags.length !== 1 ? 's' : ''} · click tag to remove
        </p>
        <Button
          size="sm"
          onClick={() => onSave(currentTags)}
          disabled={saving}
          className="h-7 text-xs"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px] rounded-lg border border-slate-200 bg-white p-3">
        {currentTags.length === 0 && (
          <span className="text-xs text-slate-500 italic">No tags yet</span>
        )}
        {currentTags.map((tag) => (
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder="Add a tag… (press Enter)"
          className="text-sm h-8"
        />
        <Button
          variant="default"
          size="sm"
          onClick={addTag}
          disabled={!newTag.trim()}
          className="h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function VirtualQuestionsTab({
  questions,
  onSave,
  saving,
}: {
  questions: string[]
  onSave: (qs: string[]) => void
  saving: boolean
}) {
  const [items, setItems] = useState<string[]>(questions)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  const updateItem = (idx: number, val: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? val : it)))
  }

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  const addItem = () => {
    setItems((prev) => [...prev, ''])
    setEditingIdx(items.length)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {items.length} question{items.length !== 1 ? 's' : ''} · click to edit
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={addItem}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(items.filter(Boolean))}
            disabled={saving}
            className="h-7 text-xs"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[340px] pr-2">
        <div className="space-y-2">
          {items.map((q, idx) => (
            <div
              key={idx}
              className="group flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-slate-300"
            >
              <span className="flex-shrink-0 font-mono text-xs text-blue-400 w-5 text-right mt-0.5">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                {editingIdx === idx ? (
                  <Input
                    value={q}
                    onChange={(e) => updateItem(idx, e.target.value)}
                    onBlur={() => setEditingIdx(null)}
                    autoFocus
                    className="h-7 text-xs"
                  />
                ) : (
                  <p
                    className="text-sm text-slate-800 leading-relaxed cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => setEditingIdx(idx)}
                  >
                    {q || (
                      <span className="italic text-slate-500 text-xs">
                        Click to enter question
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-500 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-500">No questions yet</p>
              <button
                onClick={addItem}
                className="mt-2 text-xs text-blue-600 underline underline-offset-2"
              >
                Add the first one
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function DocumentUploadPage() {
  const queryClient = useQueryClient()
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [savingField, setSavingField] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onMutate: () => {
      setUploadProgress(0)
      const interval = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 85) {
            clearInterval(interval)
            return 85
          }
          return p + Math.random() * 12
        })
      }, 400)
    },
    onSuccess: (doc) => {
      setUploadProgress(100)
      setUploadedDoc(doc)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: 'Document uploaded', description: doc.filename })
    },
    onError: (error) => {
      setUploadProgress(0)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ data }: { field: string; data: Partial<Document> }) =>
      updateDocument(uploadedDoc!.id, data),
    onMutate: ({ field }) => setSavingField(field),
    onSuccess: (updated, { field }) => {
      setUploadedDoc(updated)
      setSavingField(null)
      toast({ title: `${field} saved`, variant: 'default' })
    },
    onError: (_err, { field }) => {
      setSavingField(null)
      toast({
        variant: 'destructive',
        title: `Failed to save ${field}`,
      })
    },
  })

  const handleFileAccepted = useCallback(
    (file: File) => {
      uploadMutation.mutate(file)
    },
    [uploadMutation]
  )

  const statusConfig = uploadedDoc
    ? STATUS_CONFIG[uploadedDoc.status]
    : STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  const showPreview =
    uploadedDoc &&
    (uploadedDoc.status === 'completed' || uploadedDoc.status === 'error')
  const hasContent =
    uploadedDoc?.parsedContent && uploadedDoc.parsedContent.length > 0

  return (
    <div className="flex h-full bg-[#f8fafc]">
      {/* Left panel */}
      <div className="flex w-[40%] flex-col border-r border-slate-200 bg-white p-6 gap-5 overflow-y-auto scrollbar-thin">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Upload Document</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload a file to parse, tag, and index it into your knowledge base.
          </p>
        </div>

        <DropZone
          onFileAccepted={handleFileAccepted}
          uploading={uploadMutation.isPending}
        />

        {/* Upload status card */}
        {uploadedDoc && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <FileText className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{uploadedDoc.filename}</p>
                  <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium flex-shrink-0', statusConfig.badgeClass)}>
                    <StatusIcon className={cn('h-3 w-3', uploadedDoc.status === 'processing' && 'animate-spin')} />
                    {statusConfig.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{formatFileSize(uploadedDoc.size)}</p>
                {uploadedDoc.status === 'error' && uploadedDoc.errorMessage && (
                  <p className="mt-1 text-xs text-red-500">{uploadedDoc.errorMessage}</p>
                )}
              </div>
            </div>

            {(uploadMutation.isPending || uploadedDoc.status === 'processing') && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500">{uploadMutation.isPending ? 'Uploading' : 'Processing'}...</span>
                  <span className="font-mono text-[11px] text-blue-600">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>
        )}

        {/* Confirm save button */}
        {showPreview && uploadedDoc.status === 'completed' && (
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-sm mt-auto"
            onClick={() => {
              toast({ title: 'Saved to Knowledge Base', description: `${uploadedDoc.filename} is now indexed and ready for search.` })
            }}
          >
            <Database className="h-4 w-4" />
            Confirm & Save to Knowledge Base
          </button>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        {!showPreview ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-card">
              <ChevronRight className="h-7 w-7 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Awaiting document</p>
              <p className="mt-1 text-xs text-slate-400 max-w-[240px]">
                Upload a file to see the parsed content, AI tags, and virtual questions here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-6 gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">Document Preview</h2>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {uploadedDoc?.name}
              </span>
            </div>

            <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start flex-shrink-0">
                <TabsTrigger value="content">Parsed Content</TabsTrigger>
                <TabsTrigger value="tags">AI Tags</TabsTrigger>
                <TabsTrigger value="questions">Virtual Questions</TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-hidden mt-3">
                <TabsContent value="content" className="h-full mt-0">
                  {hasContent ? (
                    <ParsedContentTab
                      content={uploadedDoc!.parsedContent!}
                      saving={savingField === 'content'}
                      onSave={(updated) =>
                        updateMutation.mutate({
                          field: 'Parsed content',
                          data: { parsedContent: updated },
                        })
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-40 text-sm text-slate-500">
                      No parsed content available
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tags" className="h-full mt-0">
                  <TagsTab
                    tags={uploadedDoc?.tags ?? []}
                    saving={savingField === 'tags'}
                    onSave={(tags) =>
                      updateMutation.mutate({ field: 'Tags', data: { tags } })
                    }
                  />
                </TabsContent>

                <TabsContent value="questions" className="h-full mt-0">
                  <VirtualQuestionsTab
                    questions={uploadedDoc?.virtualQuestions ?? []}
                    saving={savingField === 'questions'}
                    onSave={(qs) =>
                      updateMutation.mutate({
                        field: 'Questions',
                        data: { virtualQuestions: qs },
                      })
                    }
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
