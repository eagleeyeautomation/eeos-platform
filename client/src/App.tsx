import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ComponentType } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { OwnerRoute, PlatformAdminRoute } from "./components/RouteGuards";
import { ProductSessionProvider } from "./contexts/ProductSessionContext";
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
import SignIn from "./pages/SignIn";
import Onboarding from "./pages/Onboarding";
import Integrations from "./pages/Integrations";
import GoHighLevelIntegration from "./pages/GoHighLevelIntegration";
import ConnectGHL from "./pages/ConnectGHL";
import Dashboard from "./pages/Dashboard";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import AccessDenied from "./pages/AccessDenied";
import PlatformAdmin from "./pages/PlatformAdmin";

function owner(component: ComponentType) {
  const Component = component;
  return function OwnerPage() {
    return (
      <OwnerRoute>
        <Component />
      </OwnerRoute>
    );
  };
}

function ownerOnboarding(component: ComponentType) {
  const Component = component;
  return function OwnerOnboardingPage() {
    return (
      <OwnerRoute allowOnboarding>
        <Component />
      </OwnerRoute>
    );
  };
}

function admin(component: ComponentType) {
  const Component = component;
  return function AdminPage() {
    return (
      <PlatformAdminRoute>
        <Component />
      </PlatformAdminRoute>
    );
  };
}

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
      <Route path="/login" component={SignIn} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/invitations/accept" component={AcceptInvitation} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/integrations/gohighlevel" component={ownerOnboarding(GoHighLevelIntegration)} />
      <Route path="/connect-ghl" component={ownerOnboarding(ConnectGHL)} />
      <Route path="/dashboard" component={owner(Dashboard)} />
      {/* Sprint 11 — GHL Connection Journey */}
      <Route path="/oauth-success" component={OAuthSuccess} />
      <Route path="/oauth-failure" component={OAuthFailure} />
      <Route path="/integration-health" component={owner(IntegrationHealth)} />
      <Route path="/tenant-confirmation" component={ownerOnboarding(TenantConfirmation)} />
      <Route path="/prn-onboarding" component={ownerOnboarding(PRNOnboarding)} />
      {/* Sprint 12 — Executive Experience */}
      <Route path="/executive-home" component={owner(ExecutiveHome)} />
      <Route path="/live-status" component={owner(LiveStatus)} />
      <Route path="/connected-apps" component={owner(ConnectedApps)} />
      <Route path="/system-health" component={owner(SystemHealth)} />
      <Route path="/notifications" component={owner(Notifications)} />
      {/* Sprint 13 — Executive Intelligence Pages */}
      <Route path="/business-health" component={owner(BusinessHealth)} />
      <Route path="/ai-recommendations" component={owner(AIRecommendations)} />
      <Route path="/live-signals" component={owner(LiveSignals)} />
      <Route path="/integration-status" component={owner(IntegrationStatus)} />
      <Route path="/executive-timeline" component={owner(ExecutiveTimeline)} />
      <Route path="/knowledge-graph" component={owner(KnowledgeGraphPreview)} />
      <Route path="/executive-dashboard" component={owner(ExecutiveDashboard)} />
      <Route path="/admin" component={admin(PlatformAdmin)} />
      <Route path="/admin/organizations" component={admin(PlatformAdmin)} />
      <Route path="/admin/organizations/:organizationId" component={admin(PlatformAdmin)} />
      <Route path="/admin/onboarding" component={admin(PlatformAdmin)} />
      <Route path="/admin/integrations" component={admin(PlatformAdmin)} />
      <Route path="/admin/platform-health" component={admin(PlatformAdmin)} />
      <Route path="/admin/audit" component={admin(PlatformAdmin)} />
      <Route path="/admin/support" component={admin(PlatformAdmin)} />
      <Route path="/admin/ai-operations" component={admin(PlatformAdmin)} />
      <Route path="/access-denied" component={AccessDenied} />
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
          <ProductSessionProvider>
            <Toaster richColors theme="dark" />
            <Router />
          </ProductSessionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
