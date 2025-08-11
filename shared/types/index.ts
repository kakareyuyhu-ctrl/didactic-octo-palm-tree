// User-related types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  storageUsed: number;
  storageLimit: number;
  storageUsagePercentage: number;
  availableStorage: number;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  lastLogin: Date;
  storageUsed: number;
  storageLimit: number;
  storageUsagePercentage: number;
  availableStorage: number;
}

export interface UserStats {
  totalFiles: number;
  totalFolders: number;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
  availableStorage: number;
  fileTypes: { [key: string]: number };
  recentActivity: ActivityItem[];
}

export interface StorageInfo {
  user: {
    id: string;
    name: string;
    email: string;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
    available: number;
  };
  breakdown: StorageBreakdown[];
  largestFiles: FileInfo[];
}

export interface StorageBreakdown {
  _id: string;
  totalSize: number;
  count: number;
}

// File-related types
export interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnail?: string;
  isPublic: boolean;
  isFolder: boolean;
  parentFolder?: string;
  owner: string;
  tags: string[];
  description?: string;
  downloads: number;
  createdAt: Date;
  lastAccessed: Date;
  extension: string;
  fileType: string;
  formattedSize: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
    url: string;
  };
}

export interface FileListResponse {
  success: boolean;
  files: FileInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FolderCreateRequest {
  name: string;
  parentFolder?: string;
  description?: string;
  isPublic?: boolean;
}

export interface FileUpdateRequest {
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

// Activity types
export interface ActivityItem {
  type: 'upload' | 'download' | 'share' | 'delete' | 'access' | 'folder_create';
  fileName: string;
  timestamp: Date;
  fileId?: string;
  userId?: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    storageUsed: number;
    storageLimit: number;
  };
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FileSearchParams extends PaginationParams {
  search?: string;
  parentFolder?: string;
  fileType?: string;
  isPublic?: boolean;
  tags?: string[];
}

// Error types
export interface ApiError {
  success: false;
  error: string;
  errors?: any[];
  statusCode?: number;
}

// Utility types
export type FileType = 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';

export interface FileTypeInfo {
  type: FileType;
  extensions: string[];
  mimeTypes: string[];
  icon: string;
  color: string;
}

// Constants
export const FILE_TYPES: Record<string, FileTypeInfo> = {
  image: {
    type: 'image',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
    icon: '🖼️',
    color: 'text-blue-500'
  },
  document: {
    type: 'document',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf', 'application/vnd.oasis.opendocument.text'],
    icon: '📄',
    color: 'text-green-500'
  },
  video: {
    type: 'video',
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'],
    icon: '🎥',
    color: 'text-purple-500'
  },
  audio: {
    type: 'audio',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg'],
    icon: '🎵',
    color: 'text-yellow-500'
  },
  archive: {
    type: 'archive',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'],
    icon: '📦',
    color: 'text-orange-500'
  },
  other: {
    type: 'other',
    extensions: [],
    mimeTypes: [],
    icon: '📁',
    color: 'text-gray-500'
  }
};

export const STORAGE_LIMITS = {
  FREE: 5 * 1024 * 1024 * 1024, // 5 GB
  BASIC: 50 * 1024 * 1024 * 1024, // 50 GB
  PREMIUM: 500 * 1024 * 1024 * 1024, // 500 GB
  ENTERPRISE: 5 * 1024 * 1024 * 1024 * 1024 // 5 TB
};

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_FOLDER_NAME_LENGTH = 255;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_TAGS_COUNT = 10;
export const MAX_TAG_LENGTH = 50;