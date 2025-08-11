import mongoose from 'mongoose'
import { logger } from '../utils/logger'

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pat-cloud-storage'
    
    await mongoose.connect(mongoURI)
    
    logger.info('✅ MongoDB connected successfully')
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed through app termination')
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}