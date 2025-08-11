import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { User } from '../models/User'
import { File } from '../models/File'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = Router()

// Validation middleware
const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email')
]

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id.toString()
    
    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storageUsagePercentage: user.storageUsagePercentage,
        availableStorage: user.availableStorage
      }
    })

  } catch (error) {
    logger.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching profile'
    })
  }
})

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { name, email } = req.body
    const userId = req.user!._id.toString()

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email is already taken'
        })
      }
    }

    // Update user profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password')

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    logger.info(`Profile updated for user: ${updatedUser.email}`)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin,
        storageUsed: updatedUser.storageUsed,
        storageLimit: updatedUser.storageLimit,
        storageUsagePercentage: updatedUser.storageUsagePercentage,
        availableStorage: updatedUser.availableStorage
      }
    })

  } catch (error) {
    logger.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while updating profile'
    })
  }
})

// @route   GET /api/users/stats
// @desc    Get user storage statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id.toString()
    
    // Get user data
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Get file statistics
    const totalFiles = await File.countDocuments({ owner: userId, isFolder: false })
    const totalFolders = await File.countDocuments({ owner: userId, isFolder: true })
    
    // Get file type distribution
    const fileTypes = await File.aggregate([
      { $match: { owner: userId, isFolder: false } },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Convert to expected format
    const fileTypeStats: { [key: string]: number } = {}
    fileTypes.forEach(({ _id, count }) => {
      fileTypeStats[_id] = count
    })

    // Get recent activity (last 10 file operations)
    const recentFiles = await File.find({ owner: userId })
      .sort({ lastAccessed: -1 })
      .limit(10)
      .select('name mimeType lastAccessed')

    const recentActivity = recentFiles.map(file => ({
      type: 'access',
      fileName: file.name,
      timestamp: file.lastAccessed
    }))

    const stats = {
      totalFiles,
      totalFolders,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      storagePercentage: user.storageUsagePercentage,
      availableStorage: user.availableStorage,
      fileTypes: fileTypeStats,
      recentActivity
    }

    res.json({
      success: true,
      stats
    })

  } catch (error) {
    logger.error('Get stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching statistics'
    })
  }
})

// @route   GET /api/users/storage
// @desc    Get detailed storage information
// @access  Private
router.get('/storage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id.toString()
    
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Get storage breakdown by file type
    const storageByType = await File.aggregate([
      { $match: { owner: userId, isFolder: false } },
      { $group: { _id: '$mimeType', totalSize: { $sum: '$size' }, count: { $sum: 1 } } },
      { $sort: { totalSize: -1 } }
    ])

    // Get largest files
    const largestFiles = await File.find({ owner: userId, isFolder: false })
      .sort({ size: -1 })
      .limit(10)
      .select('name size mimeType createdAt')

    const storageInfo = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      storage: {
        used: user.storageUsed,
        limit: user.storageLimit,
        percentage: user.storageUsagePercentage,
        available: user.availableStorage
      },
      breakdown: storageByType,
      largestFiles
    }

    res.json({
      success: true,
      storageInfo
    })

  } catch (error) {
    logger.error('Get storage info error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching storage information'
    })
  }
})

export default router