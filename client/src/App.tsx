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
import GoHighLevelIntegration from "./pages/GoHighLevelIntegration";
import ConnectGHL from "./pages/ConnectGHL";
// Sprint 11 pages
import OAuthSuccess from "./pages/OAuthSuccess";
import OAuthFailure from "./pages/OAuthFailure";
import IntegrationHealth from "./pages/IntegrationHealth";
import TenantConfirmation from "./pages/TenantConfirmation";
import PRNOnboarding from "./pages/PRNOnboarding";
// Sprint 12 — Executive Experience
import ExecutiveHome from "./pages/ExecutiveHome";
import LiveStatus from "./pages/LiveStatus";
import ConnectedApps from "./pages/ConnectedApps";
import SystemHealth from "./pages/SystemHealth";
import Notifications from "./pages/Notifications";
// Sprint 13 — Executive Intelligence Pages
import BusinessHealth from "./pages/BusinessHealth";
import AIRecommendations from "./pages/AIRecommendations";
import LiveSignals from "./pages/LiveSignals";
import IntegrationStatus from "./pages/IntegrationStatus";
import ExecutiveTimeline from "./pages/ExecutiveTimeline";
import KnowledgeGraphPreview from "./pages/KnowledgeGraphPreview";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import AdminBootstrap from "./pages/AdminBootstrap";
function Router() {
  // make sure to consider if you need authentication for certain routes
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
      <Route path="/integrations/gohighlevel" component={GoHighLevelIntegration} />
      <Route path="/connect-ghl" component={ConnectGHL} />
      {/* Sprint 11 — GHL Connection Journey */}
      <Route path="/oauth-success" component={OAuthSuccess} />
      <Route path="/oauth-failure" component={OAuthFailure} />
      <Route path="/integration-health" component={IntegrationHealth} />
      <Route path="/tenant-confirmation" component={TenantConfirmation} />
      <Route path="/prn-onboarding" component={PRNOnboarding} />
      {/* Sprint 12 — Executive Experience */}
      <Route path="/executive-home" component={ExecutiveHome} />
      <Route path="/live-status" component={LiveStatus} />
      <Route path="/connected-apps" component={ConnectedApps} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/notifications" component={Notifications} />
      {/* Sprint 13 — Executive Intelligence Pages */}
      <Route path="/business-health" component={BusinessHealth} />
      <Route path="/ai-recommendations" component={AIRecommendations} />
      <Route path="/live-signals" component={LiveSignals} />
      <Route path="/integration-status" component={IntegrationStatus} />
      <Route path="/executive-timeline" component={ExecutiveTimeline} />
      <Route path="/knowledge-graph" component={KnowledgeGraphPreview} />
      <Route path="/executive-dashboard" component={ExecutiveDashboard} />
      <Route path="/admin-bootstrap" component={AdminBootstrap} />
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
