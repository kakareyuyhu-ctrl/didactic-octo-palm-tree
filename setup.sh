#!/bin/bash

echo "🚀 Setting up Pat-Cloud Storage Project"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker is not available. You can still run the project locally."
    DOCKER_AVAILABLE=false
fi

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p logs
mkdir -p backend/logs
mkdir -p frontend/dist

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install shared package dependencies
echo "📦 Installing shared package dependencies..."
cd shared
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment file
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Build shared package
echo "🔨 Building shared package..."
cd shared
npm run build
cd ..

# Create logs directory
mkdir -p logs

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start MongoDB (if running locally)"
echo "3. Build shared package: npm run build:shared"
echo "4. Run the project:"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "   With Docker:"
    echo "   docker-compose up -d"
    echo ""
    echo "   Without Docker:"
fi

echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "   Or use the root script: npm run dev"
echo ""
echo "📦 Shared package will be built automatically"
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔗 Backend API will be available at: http://localhost:5000"
echo ""
echo "Happy coding! 🚀"