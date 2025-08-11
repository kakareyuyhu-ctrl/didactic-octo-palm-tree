# Shared Package

This directory contains shared types, utilities, and constants that are used by both the frontend and backend of the Pat-Cloud Storage application.

## Structure

```
shared/
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── index.ts        # Main export file
├── package.json    # Package configuration
└── tsconfig.json   # TypeScript configuration
```

## Types

The `types` directory contains TypeScript interfaces and types for:

- **User Management**: User profiles, authentication, roles
- **File Management**: File metadata, uploads, folders
- **API Responses**: Standardized API response formats
- **Validation**: Input validation schemas
- **Constants**: File type definitions, storage limits

## Utilities

The `utils` directory contains common functions for:

- **File Operations**: Size formatting, extension extraction, type detection
- **Date Handling**: Formatting and relative time calculations
- **Validation**: Email, password, and URL validation
- **Storage Calculations**: Usage percentages and available space
- **Array/Object Manipulation**: Common data structure operations
- **Performance**: Debounce and throttle utilities

## Usage

### Backend

```typescript
import { User, FileInfo, formatFileSize } from '@pat-cloud/shared';

// Use types in your models and routes
const user: User = { /* ... */ };
const fileSize = formatFileSize(1024 * 1024); // "1 MB"
```

### Frontend

```typescript
import { UserProfile, getFileIcon, validateEmail } from '@pat-cloud/shared';

// Use types in your components
const profile: UserProfile = { /* ... */ };
const { icon, color } = getFileIcon('image/jpeg');
const isValid = validateEmail('user@example.com');
```

## Development

### Building

```bash
# Build the shared package
npm run build

# Watch for changes during development
npm run dev

# Clean build artifacts
npm run clean
```

### Adding New Types

1. Create new interfaces in `types/index.ts`
2. Export them from the main `index.ts` file
3. Update this README if needed

### Adding New Utilities

1. Create new functions in `utils/index.ts`
2. Export them from the main `index.ts` file
3. Add JSDoc comments for documentation
4. Update this README if needed

## Dependencies

This package has minimal dependencies to avoid conflicts:

- **TypeScript**: For type checking and compilation
- **No runtime dependencies**: All utilities are pure functions

## Build Output

The build process creates:

- `dist/index.js` - Compiled JavaScript
- `dist/index.d.ts` - TypeScript declarations
- `dist/index.js.map` - Source maps for debugging

## Integration

This package is integrated into the monorepo workspace and is automatically built when running:

- `npm run dev` - Development mode
- `npm run build` - Production build
- `npm run build:shared` - Shared package only

## Notes

- All types and utilities are designed to be tree-shakeable
- Functions are pure and have no side effects
- Types are strict and provide good IntelliSense support
- Utilities are optimized for performance and reusability