import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AboutPage, ContactPage, FAQPage, HomePage, ServicesPage, TestimonialsPage } from '@/pages/rd-pages';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
  return (
    <RoutedErrorBoundary>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
        >
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/testimonials" component={TestimonialsPage} />
            <Route path="/faq" component={FAQPage} />
            <Route path="/contact" component={ContactPage} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;