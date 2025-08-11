# Pat-Cloud Storage - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Technology Stack](#technology-stack)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [API Documentation](#api-documentation)
8. [Development Guide](#development-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

## Project Overview

Pat-Cloud Storage is a modern, secure cloud storage solution that provides users with a comprehensive file management system. Built with a microservices architecture, it offers enterprise-grade security, scalability, and user experience.

### Key Benefits

- **Secure**: End-to-end encryption and JWT authentication
- **Scalable**: Cloud-native architecture with containerization
- **User-Friendly**: Modern React interface with responsive design
- **Feature-Rich**: File sharing, collaboration, and advanced search
- **Cost-Effective**: Multiple cloud storage provider support

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud Storage │    │   Redis Cache   │    │   File Storage  │
│   (AWS S3/GCS)  │    │   Port: 6379    │    │   (Local/Cloud) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Breakdown

- **Frontend**: React SPA with TypeScript and Tailwind CSS
- **Backend**: Express.js API with middleware and validation
- **Database**: MongoDB for user data and file metadata
- **Cache**: Redis for session management and performance
- **Storage**: Cloud storage providers (AWS S3, Google Cloud Storage)

## Features

### Core Features

- ✅ **User Authentication**: Secure login/register with JWT
- ✅ **File Management**: Upload, download, delete, and organize files
- ✅ **Folder Organization**: Create and manage folder structures
- ✅ **File Sharing**: Share files with other users
- ✅ **Search & Filter**: Advanced file search capabilities
- ✅ **Storage Analytics**: Usage statistics and monitoring
- ✅ **Responsive Design**: Mobile-first responsive interface

### Advanced Features

- 🔄 **Real-time Updates**: Live file synchronization
- 🔐 **Access Control**: Role-based permissions
- 📱 **Mobile App**: Progressive Web App (PWA) support
- 🔍 **Full-text Search**: Content-based file search
- 📊 **Usage Reports**: Detailed storage analytics
- 🌐 **Multi-language**: Internationalization support

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Build Tool**: Vite for fast development
- **UI Components**: Custom component library

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator for input validation
- **File Handling**: Multer for multipart uploads
- **Logging**: Winston for structured logging

### Infrastructure
- **Containerization**: Docker with Docker Compose
- **Database**: MongoDB 7.0
- **Cache**: Redis 7
- **Cloud Storage**: AWS S3 / Google Cloud Storage
- **Deployment**: Kubernetes ready

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Redis 7+ (optional)
- Docker & Docker Compose (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pat-cloud-storage
   ```

2. **Run setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application**
   ```bash
   # With Docker
   docker-compose up -d
   
   # Without Docker
   npm run dev
   ```

### Manual Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

3. **Start Redis (optional)**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

4. **Start services**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | `5000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/pat-cloud-storage` | Yes |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key | - | No* |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key | - | No* |
| `AWS_S3_BUCKET` | AWS S3 bucket name | - | No* |

*Required if using AWS S3 for file storage

### Database Configuration

The application uses MongoDB with the following collections:

- **users**: User accounts and profiles
- **files**: File metadata and storage information
- **folders**: Folder structure and organization
- **shares**: File sharing and permissions
- **sessions**: User sessions and tokens

### Cloud Storage Configuration

#### AWS S3 Setup

1. Create an S3 bucket
2. Configure CORS policy
3. Set environment variables
4. Configure IAM permissions

#### Google Cloud Storage Setup

1. Create a project
2. Enable Cloud Storage API
3. Create service account
4. Download credentials JSON
5. Set environment variables

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### File Management Endpoints

#### POST /api/files/upload
Upload a new file.

**Request:** Multipart form data with file field.

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "id": "file-id",
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 1024000,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "url": "/api/files/download/file-id"
  }
}
```

#### GET /api/files
Get all files for the authenticated user.

**Response:**
```json
{
  "success": true,
  "files": [...],
  "total": 1234
}
```

## Development Guide

### Project Structure

```
pat-cloud-storage/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── package.json        # Backend dependencies
├── shared/                  # Shared types and utilities
├── docs/                    # Documentation
├── docker-compose.yml       # Docker configuration
└── package.json             # Root package.json
```

### Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement backend API
   - Implement frontend components
   - Add tests
   - Create pull request

2. **Code Quality**
   - ESLint for code linting
   - Prettier for code formatting
   - TypeScript for type safety
   - Jest for testing

3. **Testing Strategy**
   - Unit tests for utilities
   - Integration tests for API endpoints
   - E2E tests for critical user flows

### Adding New Features

1. **Backend API**
   - Create route file in `backend/src/routes/`
   - Add validation middleware
   - Implement controller logic
   - Add to main app

2. **Frontend Components**
   - Create component in `frontend/src/components/`
   - Add to appropriate page
   - Update routing if needed
   - Add TypeScript types

## Deployment

### Production Deployment

#### Environment Setup

1. **Set production environment variables**
2. **Configure production database**
3. **Set up cloud storage**
4. **Configure SSL certificates**
5. **Set up monitoring and logging**

#### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes Deployment

1. **Create namespace**
2. **Deploy MongoDB and Redis**
3. **Deploy backend service**
4. **Deploy frontend service**
5. **Configure ingress and load balancer**

### CI/CD Pipeline

The project includes GitHub Actions workflows for:

- **Code Quality**: Linting and testing
- **Security**: Dependency scanning
- **Build**: Docker image building
- **Deploy**: Automated deployment

## Troubleshooting

### Common Issues

#### Backend Won't Start

1. **Check MongoDB connection**
   ```bash
   # Test MongoDB connection
   mongo mongodb://localhost:27017/pat-cloud-storage
   ```

2. **Check environment variables**
   ```bash
   # Verify .env file exists
   ls -la .env
   ```

3. **Check port availability**
   ```bash
   # Check if port 5000 is in use
   lsof -i :5000
   ```

#### Frontend Build Issues

1. **Clear node_modules**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check TypeScript errors**
   ```bash
   npm run lint
   ```

#### Database Connection Issues

1. **Verify MongoDB is running**
2. **Check connection string**
3. **Verify network access**
4. **Check authentication credentials**

### Performance Optimization

1. **Database Indexing**
   - Add indexes on frequently queried fields
   - Use compound indexes for complex queries

2. **Caching Strategy**
   - Implement Redis caching for file metadata
   - Cache user sessions and permissions

3. **File Storage Optimization**
   - Use CDN for static file delivery
   - Implement file compression
   - Use streaming for large file uploads

### Security Considerations

1. **Input Validation**
   - Validate all user inputs
   - Sanitize file uploads
   - Implement rate limiting

2. **Authentication**
   - Use secure JWT tokens
   - Implement refresh token rotation
   - Add multi-factor authentication

3. **File Security**
   - Scan uploaded files for malware
   - Implement file type restrictions
   - Use signed URLs for file access

## Support & Contributing

### Getting Help

- **Documentation**: Check this documentation first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our community channels

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code of Conduct

We follow a standard code of conduct. Please be respectful and inclusive in all interactions.

---

**Pat-Cloud Storage** - Secure, Scalable, User-Friendly Cloud Storage Solution

For more information, visit our [GitHub repository](https://github.com/JemPH/jemph-cloud-storage).