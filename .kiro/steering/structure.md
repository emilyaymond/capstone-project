# Project Structure

## Root Directory Layout
```
my-app/
├── public/          # Static assets and HTML template
├── src/             # Source code
├── node_modules/    # Dependencies (auto-generated)
├── package.json     # Project configuration and dependencies
├── package-lock.json # Dependency lock file
└── README.md        # Project documentation
```

## Public Directory (`public/`)
- `index.html` - Main HTML template
- `favicon.ico` - Browser favicon
- `logo192.png`, `logo512.png` - PWA icons
- `manifest.json` - PWA manifest
- `robots.txt` - Search engine directives

## Source Directory (`src/`)
- `index.js` - Application entry point and React root rendering
- `App.js` - Main application component
- `App.css` - Application-specific styles
- `index.css` - Global styles
- `App.test.js` - Main component tests
- `logo.svg` - React logo asset
- `reportWebVitals.js` - Performance monitoring
- `setupTests.js` - Test configuration

## File Organization Conventions
- **Components**: Currently in `src/` root, consider `src/components/` for growth
- **Styles**: Component-specific CSS files alongside components
- **Tests**: `.test.js` files alongside the components they test
- **Assets**: Static assets in `public/` for direct access, `src/` for imported assets
- **Entry Point**: `src/index.js` is the application entry point

## Import Conventions
- Use relative imports for local files (`./App.css`)
- ES6 import/export syntax throughout
- Default exports for main components