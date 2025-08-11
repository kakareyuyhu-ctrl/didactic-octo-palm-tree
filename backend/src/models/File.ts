import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
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
  lastAccessed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>({
  name: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    default: 'application/octet-stream'
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  thumbnail: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFolder: {
    type: Boolean,
    default: false
  },
  parentFolder: {
    type: Schema.Types.ObjectId,
    ref: 'File',
    default: null
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'File owner is required']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  downloads: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  lastAccessed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  if (this.isFolder) return null;
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() : null;
});

// Virtual for file type category
fileSchema.virtual('fileType').get(function() {
  if (this.isFolder) return 'folder';
  
  const mime = this.mimeType.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/')) return 'text';
  if (mime.includes('pdf')) return 'document';
  if (mime.includes('word') || mime.includes('document')) return 'document';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'spreadsheet';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
  
  return 'other';
});

// Virtual for formatted file size
fileSchema.virtual('formattedSize').get(function() {
  if (this.isFolder) return '-';
  
  const bytes = this.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Indexes for efficient querying
fileSchema.index({ owner: 1, parentFolder: 1 });
fileSchema.index({ owner: 1, isFolder: 1 });
fileSchema.index({ owner: 1, createdAt: -1 });
fileSchema.index({ name: 'text', description: 'text', tags: 'text' });
fileSchema.index({ isPublic: 1 });
fileSchema.index({ mimeType: 1 });

// Pre-save middleware to update lastAccessed
fileSchema.pre('save', function(next) {
  if (this.isModified('lastAccessed')) {
    this.lastAccessed = new Date();
  }
  next();
});

// Static method to find files by owner
fileSchema.statics.findByOwner = function(ownerId: string, options: any = {}) {
  const query = { owner: ownerId };
  
  if (options.parentFolder !== undefined) {
    query.parentFolder = options.parentFolder;
  }
  
  if (options.isFolder !== undefined) {
    query.isFolder = options.isFolder;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to search files
fileSchema.statics.searchFiles = function(ownerId: string, searchTerm: string, options: any = {}) {
  const query = {
    owner: ownerId,
    $text: { $search: searchTerm }
  };
  
  return this.find(query)
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get storage usage by owner
fileSchema.statics.getStorageUsage = function(ownerId: string) {
  return this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(ownerId), isFolder: false } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } }
  ]);
};

export const File = mongoose.model<IFile>('File', fileSchema);