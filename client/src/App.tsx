import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import WhyEEOS from "./pages/WhyEEOS";
import Features from "./pages/Features";
import Industries from "./pages/Industries";
import Pricing from "./pages/Pricing";
import Security from "./pages/Security";
import Demo from "./pages/Demo";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Onboarding from "./pages/Onboarding";
import Integrations from "./pages/Integrations";
import ConnectGHL from "./pages/ConnectGHL";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/why-eeos" component={WhyEEOS} />
      <Route path="/features" component={Features} />
      <Route path="/industries" component={Industries} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/security" component={Security} />
      <Route path="/demo" component={Demo} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/connect-ghl" component={ConnectGHL} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
