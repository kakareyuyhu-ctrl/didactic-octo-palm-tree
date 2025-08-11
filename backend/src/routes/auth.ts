import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { User } from '../models/User'
import { generateToken, authenticateToken } from '../middleware/auth'
import { authRateLimit } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = Router()

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
]

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
]

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit, validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { name, email, password } = req.body

    // Check if user already exists in database
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      })
    }

    // Create user in database (password will be hashed by pre-save middleware)
    const user = await User.create({
      name,
      email,
      password
    })

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email)

    logger.info(`New user registered: ${email}`)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    })

  } catch (error) {
    logger.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    })
  }
})

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Private
router.post('/login', authRateLimit, validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { email, password } = req.body

    // Check if user exists in database
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Account is deactivated'
      })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email)

    logger.info(`User logged in: ${email}`)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    })

  } catch (error) {
    logger.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User is already authenticated by middleware
    const user = req.user!

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    })

  } catch (error) {
    logger.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user data'
    })
  }
})

export default router