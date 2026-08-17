/* Style reminder: route structure keeps the public game flow short, with clear exits from the game and legal pages. */
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/NotFound';
import { Route, Switch } from 'wouter';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { PiProvider } from './contexts/PiContext';
import Home from './pages/Home';
import Game from './pages/Game';
import Legal from './pages/Legal';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/game" component={Game} />
      <Route path="/privacy">
        <Legal kind="privacy" />
      </Route>
      <Route path="/terms">
        <Legal kind="terms" />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <PiProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PiProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
