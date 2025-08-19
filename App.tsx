
import React from 'react';
import LocalApp from './components/LocalApp';
import BackendApp from './components/BackendApp';

// --- App Mode Configuration ---
// This constant determines which version of the application to run.
// 'local':   For frontend development. Uses browser local storage, no backend required.
// 'backend': For production or full-stack testing. Connects to the secure backend API.
const APP_MODE: 'backend' | 'local' = 'local';

/**
 * App component now acts as a router to select the appropriate
 * application mode based on the APP_MODE constant.
 */
export default function App(): React.ReactNode {
  if (APP_MODE === 'local') {
    return <LocalApp />;
  }
  
  return <BackendApp />;
}
