# Pat-Cloud Storage

A modern, secure cloud storage solution built with React, Node.js, and cloud technologies.

## Features

- 🔐 Secure file upload and storage
- 📁 File management and organization
- 👥 User authentication and authorization
- 🔍 Advanced search capabilities
- 📱 Responsive design for all devices
- ☁️ Cloud-native architecture
- 🚀 Fast and reliable performance

## Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Storage**: AWS S3 / Google Cloud Storage
- **Authentication**: JWT, OAuth
- **Deployment**: Docker, Kubernetes

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Cloud storage account (AWS S3, GCS, etc.)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd pat-cloud-storage
```

2. Install dependencies
```bash
npm run install:all
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build shared package
```bash
npm run build:shared
```

5. Start the development server
```bash
npm run dev
```

## Project Structure

```
pat-cloud-storage/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── shared/            # Shared types and utilities
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Common utility functions
├── docs/              # Documentation
└── docker/            # Docker configuration
```

### Monorepo Architecture

This project uses a monorepo structure with npm workspaces:

- **`frontend/`**: React application with TypeScript and Tailwind CSS
- **`backend/`**: Node.js API server with Express and MongoDB
- **`shared/`**: Common types and utilities used by both frontend and backend
- **`docs/`**: Project documentation and API references

### Shared Package

The `shared/` directory contains common TypeScript types and utility functions that are used by both the frontend and backend:

- **Types**: User interfaces, file metadata, API responses, validation schemas
- **Utilities**: File operations, date formatting, validation functions, storage calculations
- **Constants**: File type definitions, storage limits, configuration values

This ensures type safety and consistency across the entire application stack.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the GitHub repository.
