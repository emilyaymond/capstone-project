# Technology Stack

## Framework & Libraries
- **React 19.1.1** - Main UI framework
- **React DOM 19.1.1** - DOM rendering
- **Create React App 5.0.1** - Build toolchain and development environment

## Testing
- **Jest** - Test runner (via react-scripts)
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers
- **@testing-library/user-event** - User interaction simulation

## Build System
- **react-scripts** - Handles all build configuration (Webpack, Babel, ESLint)
- **ESLint** - Code linting with react-app configuration
- **Browserslist** - Browser compatibility targeting

## Common Commands

All commands should be run from the `my-app` directory:

```bash
# Development
npm start          # Start development server (localhost:3000)
npm test           # Run tests in watch mode
npm run build      # Create production build
npm run eject      # Eject from Create React App (irreversible)
```

## Development Server
- Local development runs on `http://localhost:3000`
- Hot reloading enabled for development
- Lint errors displayed in console

## Browser Support
- Production: >0.2% usage, not dead browsers, not Opera Mini
- Development: Latest Chrome, Firefox, Safari