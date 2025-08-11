import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: string;
  storageUsed: number;
  storageLimit: number;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  storageUsed: {
    type: Number,
    default: 0,
    min: [0, 'Storage used cannot be negative']
  },
  storageLimit: {
    type: Number,
    default: 10737418240, // 10GB in bytes
    min: [0, 'Storage limit cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for storage usage percentage
userSchema.virtual('storageUsagePercentage').get(function() {
  return this.storageLimit > 0 ? (this.storageUsed / this.storageLimit) * 100 : 0;
});

// Virtual for available storage
userSchema.virtual('availableStorage').get(function() {
  return Math.max(0, this.storageLimit - this.storageUsed);
});

// Index for email queries
userSchema.index({ email: 1 });

// Index for storage queries
userSchema.index({ storageUsed: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to update lastLogin
userSchema.pre('save', function(next) {
  if (this.isModified('lastLogin')) {
    this.lastLogin = new Date();
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to update storage usage
userSchema.statics.updateStorageUsage = function(userId: string, fileSize: number, operation: 'add' | 'subtract') {
  const update = operation === 'add' 
    ? { $inc: { storageUsed: fileSize } }
    : { $inc: { storageUsed: -fileSize } };
  
  return this.findByIdAndUpdate(
    userId,
    update,
    { new: true, runValidators: true }
  );
};

export const User = mongoose.model<IUser>('User', userSchema);