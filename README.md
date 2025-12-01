# HealthVis - Accessible Health Data Visualization

**Capstone Project: Making Health Data Visualization Accessible to All**

HealthVis is a React-based web application designed to make health data visualization accessible to users with varying visual abilities, particularly blind and visually impaired users. The application provides multiple interaction modes including visual, audio-focused, hybrid, and simplified interfaces.

## Features

- **Multi-Modal Interface**: Visual, audio, hybrid, and simplified interaction modes
- **Comprehensive Accessibility**: Screen reader support, keyboard navigation, and ARIA compliance
- **Data Sonification**: Audio representation of health data trends
- **Progressive Disclosure**: Information presented in digestible layers
- **Persistent Preferences**: User accessibility settings saved across sessions

## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Project Structure

- `src/components/` - React components including accessibility-focused chart components
- `src/contexts/` - React contexts for accessibility and application state
- `src/hooks/` - Custom hooks for keyboard navigation and accessibility features  
- `src/services/` - Services for audio feedback, data processing, and mock data
- `src/styles/` - CSS modules and styling

## Accessibility Features

- **Screen Reader Support**: Full ARIA labeling and live regions
- **Keyboard Navigation**: Complete keyboard-only navigation support
- **Audio Feedback**: Data sonification and voice descriptions
- **High Contrast**: Visual accessibility options
- **Customizable Interface**: User-configurable accessibility preferences

## Mobile App (Expo)

The mobile version of HealthVis is built with Expo and React Native, located in the `healthvis-mobile/` directory.

### Features
- Apple Health data import (ZIP file support)
- CSV and JSON file upload
- Cross-platform (iOS, Android, Web)
- Full accessibility support
- Offline data processing

### Quick Start

```bash
cd healthvis-mobile
npm install
npm start
```

See [QUICK_START_TESTING.md](QUICK_START_TESTING.md) for testing the Apple Health import feature.

### Testing Apple Health Import

We provide test data and scripts to validate the Apple Health import functionality:

**Test Files:**
- `Health-Export.zip` (35 MB) - Real Apple Health export with thousands of records
- `Health-Export-Sample.zip` (3 KB) - Generated sample for quick testing

**Testing Resources:**
- [QUICK_START_TESTING.md](QUICK_START_TESTING.md) - 5-minute quick start guide
- [healthvis-mobile/TESTING_APPLE_HEALTH.md](healthvis-mobile/TESTING_APPLE_HEALTH.md) - Comprehensive testing guide
- [healthvis-mobile/APPLE_HEALTH_IMPORT.md](healthvis-mobile/APPLE_HEALTH_IMPORT.md) - Feature documentation
- [healthvis-mobile/scripts/README.md](healthvis-mobile/scripts/README.md) - Testing scripts documentation

**Quick Test:**
```bash
# Validate the test data
node healthvis-mobile/scripts/validate-health-export.js

# Create a small sample file
node healthvis-mobile/scripts/create-sample-export.js

# Test the parser
node healthvis-mobile/scripts/test-parser-integration.js

# Start the app and test upload
cd healthvis-mobile && npm start
```

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
