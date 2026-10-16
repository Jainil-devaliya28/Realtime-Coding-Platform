export type Language = 'python' | 'javascript' | 'cpp' | 'java' | 'verilog';

export interface LanguageConfig {
  extension: string;
  dockerImage: string;
  compileCmd?: string;
  runCmd: string;
}

export const LANGUAGE_CONFIG: Record<Language, LanguageConfig> = {
  python: {
    extension: 'py',
    dockerImage: 'code-executor-python',
    runCmd: 'python solution.py',
  },
  javascript: {
    extension: 'js',
    dockerImage: 'code-executor-node',
    runCmd: 'node solution.js',
  },
  cpp: {
    extension: 'cpp',
    dockerImage: 'code-executor-cpp',
    compileCmd: 'g++ -O3 -o solution solution.cpp',
    runCmd: './solution',
  },
  java: {
    extension: 'java',
    dockerImage: 'code-executor-java',
    compileCmd: 'javac Solution.java',
    runCmd: 'java Solution',
  },
  verilog: {
    extension: 'v',
    dockerImage: 'code-executor-verilog',
    compileCmd: 'iverilog -o solution.out solution.v',
    runCmd: 'vvp solution.out',
  },
};

export const USER_COLORS: string[] = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
];

export interface CollaborationUser {
  userId: string;
  username: string;
  avatar?: string;
  color: string;
  isTyping?: boolean;
  cursor?: { lineNumber: number; column: number };
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
}

export interface WorkerJob {
  id: string;
  roomId: string;
  userId: string;
  code: string;
  language: Language;
  stdin?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  status: 'completed' | 'failed' | 'timeout' | 'memory_limit';
}

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string; token: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'code:change': (change: any) => void;
  'code:cursor': (cursor: { lineNumber: number; column: number }) => void;
  'code:typing': (isTyping: boolean) => void;
  'execution:run': (data: { code: string; language: string; stdin?: string }) => void;
  'ai:ask': (data: { conversationId?: string; message: string; code?: string; error?: string }) => void;
}

export interface ServerToClientEvents {
  'room:joined': (data: { room: any; users: CollaborationUser[] }) => void;
  'room:user_joined': (user: CollaborationUser) => void;
  'room:user_left': (data: { userId: string }) => void;
  'room:error': (data: { message: string }) => void;
  'code:change': (data: any) => void;
  'code:cursor': (data: { userId: string; cursor: { lineNumber: number; column: number } }) => void;
  'code:typing': (data: { userId: string; isTyping: boolean }) => void;
  'execution:started': (data: { jobId: string }) => void;
  'execution:output': (data: { chunk: string; stream: 'stdout' | 'stderr' }) => void;
  'execution:completed': (result: any) => void;
  'execution:error': (data: { message: string; jobId?: string }) => void;
  'ai:response': (data: { conversationId: string; chunk: string; done: boolean }) => void;
  'disconnect': () => void;
}
