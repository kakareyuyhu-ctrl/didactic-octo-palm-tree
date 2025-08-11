import { Router } from 'express'
import multer from 'multer'
import { File } from '../models/File'
import { User } from '../models/User'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../utils/logger'
import mongoose from 'mongoose'

const router = Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true)
  }
})

// @route   POST /api/files/upload
// @desc    Upload a file
// @access  Private
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    const { originalname, mimetype, size, buffer } = req.file
    const userId = req.user!._id.toString()

    // Check if user has enough storage space
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    if (user.storageUsed + size > user.storageLimit) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient storage space'
      })
    }

    // TODO: Implement actual file storage (AWS S3, Google Cloud Storage, etc.)
    // For now, we'll simulate successful upload
    const filePath = `/uploads/${userId}/${Date.now()}_${originalname}`
    const fileUrl = `/api/files/download/${Date.now().toString()}`

    // Create file record in database
    const file = await File.create({
      name: originalname,
      originalName: originalname,
      mimeType: mimetype,
      size,
      path: filePath,
      url: fileUrl,
      owner: userId,
      isFolder: false
    })

    // Update user's storage usage
    await User.updateStorageUsage(userId, size, 'add')

    logger.info(`File uploaded: ${originalname} (${size} bytes) by user ${userId}`)

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        name: file.name,
        type: file.mimeType,
        size: file.size,
        uploadedAt: file.createdAt,
        url: file.url
      }
    })

  } catch (error) {
    logger.error('File upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during file upload'
    })
  }
})

// @route   GET /api/files
// @desc    Get all files for user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id.toString()
    const { page = 1, limit = 50, folder, search } = req.query

    let query: any = { owner: userId }
    
    // Filter by folder if specified
    if (folder) {
      query.parentFolder = folder === 'root' ? null : folder
    }

    // Search functionality
    if (search && typeof search === 'string') {
      query.$text = { $search: search }
    }

    const skip = (Number(page) - 1) * Number(limit)
    
    // Get files from database
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('owner', 'name email')

    // Get total count
    const total = await File.countDocuments(query)

    // Format response
    const formattedFiles = files.map(file => ({
      id: file._id,
      name: file.name,
      type: file.mimeType,
      size: file.size,
      formattedSize: file.formattedSize,
      fileType: file.fileType,
      extension: file.extension,
      isFolder: file.isFolder,
      parentFolder: file.parentFolder,
      uploadedAt: file.createdAt,
      lastAccessed: file.lastAccessed,
      url: file.url,
      tags: file.tags,
      description: file.description
    }))

    res.json({
      success: true,
      files: formattedFiles,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    })

  } catch (error) {
    logger.error('Get files error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching files'
    })
  }
})

// @route   GET /api/files/:id
// @desc    Get file by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user!._id.toString()

    // Find file in database
    const file = await File.findOne({ _id: id, owner: userId })
      .populate('owner', 'name email')

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    // Update last accessed time
    await File.findByIdAndUpdate(id, { lastAccessed: new Date() })

    res.json({
      success: true,
      file: {
        id: file._id,
        name: file.name,
        originalName: file.originalName,
        type: file.mimeType,
        size: file.size,
        formattedSize: file.formattedSize,
        fileType: file.fileType,
        extension: file.extension,
        isFolder: file.isFolder,
        parentFolder: file.parentFolder,
        uploadedAt: file.createdAt,
        lastAccessed: file.lastAccessed,
        url: file.url,
        tags: file.tags,
        description: file.description,
        downloads: file.downloads,
        isPublic: file.isPublic
      }
    })

  } catch (error) {
    logger.error('Get file error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching file'
    })
  }
})

// @route   DELETE /api/files/:id
// @desc    Delete file by ID
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user!._id.toString()

    // Find file in database
    const file = await File.findOne({ _id: id, owner: userId })
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    // TODO: Implement actual file deletion from storage (AWS S3, etc.)
    // For now, we'll just delete the database record

    // Update user's storage usage
    if (!file.isFolder) {
      await User.updateStorageUsage(userId, file.size, 'subtract')
    }

    // Delete file record
    await File.findByIdAndDelete(id)

    logger.info(`File deleted: ${file.name} (${file.size} bytes) by user ${userId}`)

    res.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    logger.error('Delete file error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while deleting file'
    })
  }
})

// @route   POST /api/files/folder
// @desc    Create a new folder
// @access  Private
router.post('/folder', authenticateToken, async (req, res) => {
  try {
    const { name, parentFolder, description } = req.body
    const userId = req.user!._id.toString()

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      })
    }

    // Check if folder with same name already exists in parent
    const existingFolder = await File.findOne({
      owner: userId,
      parentFolder: parentFolder || null,
      name: name.trim(),
      isFolder: true
    })

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder with this name already exists'
      })
    }

    // Create folder record
    const folder = await File.create({
      name: name.trim(),
      originalName: name.trim(),
      mimeType: 'inode/directory',
      size: 0,
      path: `/folders/${userId}/${Date.now()}_${name.trim()}`,
      url: `/api/files/folder/${Date.now().toString()}`,
      owner: userId,
      isFolder: true,
      parentFolder: parentFolder || null,
      description: description || null
    })

    logger.info(`Folder created: ${name} by user ${userId}`)

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder: {
        id: folder._id,
        name: folder.name,
        isFolder: folder.isFolder,
        parentFolder: folder.parentFolder,
        description: folder.description,
        createdAt: folder.createdAt
      }
    })

  } catch (error) {
    logger.error('Create folder error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while creating folder'
    })
  }
})

// @route   PUT /api/files/:id
// @desc    Update file metadata
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, tags, isPublic } = req.body
    const userId = req.user!._id.toString()

    // Find file in database
    const file = await File.findOne({ _id: id, owner: userId })
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    // Check if new name conflicts with existing file in same folder
    if (name && name !== file.name) {
      const existingFile = await File.findOne({
        owner: userId,
        parentFolder: file.parentFolder,
        name: name.trim(),
        _id: { $ne: id }
      })

      if (existingFile) {
        return res.status(400).json({
          success: false,
          error: 'File with this name already exists in this folder'
        })
      }
    }

    // Update file metadata
    const updateData: any = {}
    if (name) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) updateData.tags = tags
    if (isPublic !== undefined) updateData.isPublic = isPublic

    const updatedFile = await File.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    logger.info(`File updated: ${updatedFile!.name} by user ${userId}`)

    res.json({
      success: true,
      message: 'File updated successfully',
      file: {
        id: updatedFile!._id,
        name: updatedFile!.name,
        description: updatedFile!.description,
        tags: updatedFile!.tags,
        isPublic: updatedFile!.isPublic,
        updatedAt: updatedFile!.updatedAt
      }
    })

  } catch (error) {
    logger.error('Update file error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while updating file'
    })
  }
})

// @route   GET /api/files/stats/storage
// @desc    Get user storage statistics
// @access  Private
router.get('/stats/storage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id.toString()

    // Get user storage info
    const user = await User.findById(userId).select('storageUsed storageLimit')
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Get file count and types
    const fileStats = await File.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(userId), isFolder: false } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          fileTypes: { $addToSet: '$mimeType' }
        }
      }
    ])

    // Get folder count
    const folderCount = await File.countDocuments({
      owner: userId,
      isFolder: true
    })

    const stats = fileStats[0] || { totalFiles: 0, totalSize: 0, fileTypes: [] }

    res.json({
      success: true,
      stats: {
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storageUsagePercentage: user.storageUsagePercentage,
        availableStorage: user.availableStorage,
        totalFiles: stats.totalFiles,
        totalFolders: folderCount,
        fileTypes: stats.fileTypes.length
      }
    })

  } catch (error) {
    logger.error('Get storage stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching storage statistics'
    })
  }
})

export default router