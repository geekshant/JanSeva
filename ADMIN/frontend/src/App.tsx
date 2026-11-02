import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { BuzzerProvider } from '@/contexts/BuzzerContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { MapProvider } from '@/providers/MapProvider';
import { queryClient } from '@/lib/queryClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRoutes } from '@/routes';

function AppToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RealtimeProvider>
              <BuzzerProvider>
                <MapProvider>
                  <BrowserRouter>
                    <TooltipProvider delayDuration={200}>
                      <AppRoutes />
                      <AppToaster />
                    </TooltipProvider>
                  </BrowserRouter>
                </MapProvider>
              </BuzzerProvider>
            </RealtimeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
