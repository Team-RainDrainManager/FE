
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from './apis/query-client'
import App from './App.tsx'
import ThemeController from './components/ThemeController'
import './index.css'
import './first-run-ui.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeController />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
import './features/missions/missions.css'
