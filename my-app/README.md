# HealthVis - Accessible Health Data Visualization

**Capstone Project: Making Health Data Visualization Accessible to All Users**

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

## Development Status

This project is currently in active development. See `HealthVis_Codebase_Analysis.md` for detailed information about current implementation status and development roadmap.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
