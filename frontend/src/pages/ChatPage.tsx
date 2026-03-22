import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  User,
  Send,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn, formatRelativeDate } from '@/lib/utils'
import { sendMessage, getChatHistory, clearHistory } from '@/api/chat'
import { toast } from '@/hooks/use-toast'
import type { ChatMessage, ChatMode, Source } from '@/types'

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-slide-in-left">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200">
        <Bot className="h-4 w-4 text-blue-600" />
      </div>
      <div className="rounded-lg rounded-bl-none border border-slate-200 bg-white px-4 py-3 shadow-card">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce-dot" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce-dot" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce-dot" />
        </div>
      </div>
    </div>
  )
}

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors duration-150"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <FileText className="h-3 w-3" />
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-blue-600 truncate max-w-[180px]">
                  {source.documentName}
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-mono">
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                {source.chunk}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-in-right">
        <div className="flex items-end gap-2.5 max-w-[70%]">
          <div className="flex flex-col items-end gap-1">
            <div className="rounded-2xl rounded-br-md px-4 py-3 text-sm text-white leading-relaxed bg-blue-600 shadow-sm">
              {message.content}
            </div>
            <span className="text-[10px] text-slate-400 px-1">
              {formatRelativeDate(message.createdAt)}
            </span>
          </div>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200">
            <User className="h-3.5 w-3.5 text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-3 animate-slide-in-left max-w-[80%]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200">
        <Bot className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 leading-relaxed shadow-card">
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.sources && message.sources.length > 0 && (
            <>
              <Separator className="my-2 bg-slate-100" />
              <SourcesPanel sources={message.sources} />
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-400 px-1">
          {formatRelativeDate(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 border border-blue-200">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>
        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-800">
          Knowledge Assistant
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-[280px]">
          Ask anything about your uploaded documents. I'll search and synthesize the relevant knowledge.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[360px] mt-2">
        {[
          'What are the key findings?',
          'Summarize this document',
          'Compare topics across files',
          'Extract specific data points',
        ].map((hint) => (
          <div
            key={hint}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-card cursor-default hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {hint}
          </div>
        ))}
      </div>
    </div>
  )
}

const MODE_LABELS: Record<ChatMode, string> = {
  naive: 'Naive',
  local: 'Local',
  hybrid: 'Hybrid',
}

const MODE_DESCRIPTIONS: Record<ChatMode, string> = {
  naive: 'Simple vector similarity search',
  local: 'Local knowledge graph traversal',
  hybrid: 'Combined retrieval for best results',
}

export default function ChatPage() {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ChatMode>('hybrid')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: historyMessages = [], isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history'],
    queryFn: getChatHistory,
    staleTime: Infinity,
  })

  const messages = historyMessages.length > 0 ? historyMessages : localMessages

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, scrollToBottom])

  const sendMutation = useMutation({
    mutationFn: ({ msg, m }: { msg: string; m: ChatMode }) =>
      sendMessage(msg, m),
    onMutate: ({ msg }) => {
      setIsStreaming(true)
      const userMsg: ChatMessage = {
        id: `tmp-user-${Date.now()}`,
        role: 'user',
        content: msg,
        createdAt: new Date().toISOString(),
      }
      setLocalMessages((prev) => [...prev, userMsg])
    },
    onSuccess: (data) => {
      setIsStreaming(false)
      if (historyMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['chat-history'] })
      } else {
        const assistantMsg = data.message
        setLocalMessages((prev) => [...prev, assistantMsg])
      }
    },
    onError: (error) => {
      setIsStreaming(false)
      setLocalMessages((prev) =>
        prev.filter((m) => !m.id.startsWith('tmp-user-'))
      )
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  const clearMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.setQueryData(['chat-history'], [])
      setLocalMessages([])
      toast({ title: 'Chat history cleared', variant: 'default' })
    },
    onError: () => {
      setLocalMessages([])
      toast({ title: 'Chat cleared', variant: 'default' })
    },
  })

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    sendMutation.mutate({ msg: trimmed, m: mode })
  }, [input, isStreaming, mode, sendMutation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const charCount = input.length
  const maxChars = 4000

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">Knowledge Assistant</h1>
          <p className="text-[11px] text-slate-400">{MODE_DESCRIPTIONS[mode]}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(Object.keys(MODE_LABELS) as ChatMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-all duration-150',
                  mode === m
                    ? 'bg-white text-blue-600 border border-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || messages.length === 0}
            title="Clear chat history"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              Loading history...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="mx-auto max-w-3xl">
          <div
            className={cn(
              'relative rounded-xl border transition-all duration-150',
              input.length > 0
                ? 'border-blue-400 shadow-blue-glow'
                : 'border-slate-200 bg-white'
            )}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, maxChars))}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents… (⌘+Enter to send)"
              className="min-h-[80px] max-h-[240px] resize-none rounded-xl border-0 bg-transparent pr-14 text-sm focus:ring-0 focus:outline-none py-4 px-4 text-slate-800 placeholder:text-slate-400"
              disabled={isStreaming}
            />

            <div className="absolute bottom-3 right-3">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <AlertCircle className="h-3 w-3" />
              <span>Responses based on uploaded documents only</span>
            </div>
            <span className={cn('font-mono text-[10px]', charCount > maxChars * 0.9 ? 'text-red-500' : 'text-slate-400')}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
