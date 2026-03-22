export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: Source[];
}

export interface Source {
  documentId: string;
  documentName: string;
  chunk: string;
  score: number;
}

export interface ChatResponse {
  message: ChatMessage;
  mode: string;
}

export interface Document {
  id: string;
  name: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  size: number;
  tags: string[];
  virtualQuestions: string[];
  parsedContent?: ParsedContent[];
  uploadedAt: string;
  errorMessage?: string;
}

export interface ParsedContent {
  type: 'text' | 'image' | 'table' | 'equation';
  content: string;
  index: number;
}

export type ChatMode = 'naive' | 'local' | 'hybrid';
