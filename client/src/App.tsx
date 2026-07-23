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
import OwnerReviewPage, { type OwnerReviewPageProps } from "./pages/OwnerReviewPage";
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

function ownerReview(config: OwnerReviewPageProps) {
  return function StabilizedOwnerPage() {
    return (
      <OwnerRoute>
        <OwnerReviewPage {...config} />
      </OwnerRoute>
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
      <Route
        path="/executive-home"
        component={ownerReview({
          eyebrow: "Owner Command Center",
          title: "Executive Home",
          description: "Your daily owner workspace is stable and ready for verified business activity.",
          emptyTitle: "No executive activity available yet",
          emptyMessage: "This section will populate after your connected business begins generating verified GoHighLevel activity.",
        })}
      />
      <Route
        path="/live-status"
        component={ownerReview({
          eyebrow: "Live Status",
          title: "Live Business Signals",
          description: "Real-time business signals will appear here only after they are available from connected systems.",
          emptyTitle: "No live signals available yet",
          emptyMessage: "This section will populate after your connected business begins generating verified operational signals.",
        })}
      />
      <Route
        path="/connected-apps"
        component={ownerReview({
          eyebrow: "Connected Apps",
          title: "Connected Business Systems",
          description: "EEOS reads persisted connection metadata without exposing private tokens.",
          emptyTitle: "No connected business systems found",
          emptyMessage: "Connect GoHighLevel to begin populating your owner workspace with verified connection data.",
        })}
      />
      <Route
        path="/system-health"
        component={ownerReview({
          eyebrow: "System Health",
          title: "System Health",
          description: "Production health details will show verified service information only.",
          emptyTitle: "No system health events available yet",
          emptyMessage: "This section will populate after verified platform health events are available.",
        })}
      />
      <Route
        path="/notifications"
        component={ownerReview({
          eyebrow: "Notifications",
          title: "Notifications",
          description: "Owner notifications are reserved for real business and platform events.",
          emptyTitle: "No notifications yet",
          emptyMessage: "This section will populate after your business or platform account generates verified notifications.",
        })}
      />
      <Route
        path="/business-health"
        component={ownerReview({
          eyebrow: "Business Health",
          title: "Business Health",
          description: "Business health will be calculated from verified live activity, not demonstration numbers.",
          emptyTitle: "Business health is not available yet",
          emptyMessage: "This section will populate after enough verified business activity is available to calculate a reliable health view.",
        })}
      />
      <Route
        path="/ai-recommendations"
        component={ownerReview({
          eyebrow: "AI Recommendations",
          title: "AI Recommendations",
          description: "Recommendations will appear only after EEOS has verified business activity to analyze.",
          emptyTitle: "No recommendations generated yet",
          emptyMessage: "This section will populate after verified trends, risks, and opportunities are available.",
        })}
      />
      <Route
        path="/live-signals"
        component={ownerReview({
          eyebrow: "Live Signals",
          title: "Live Signals",
          description: "Live signals will be based on actual connected system events.",
          emptyTitle: "No live signals available yet",
          emptyMessage: "This section will populate after your connected business begins sending verified signal data.",
        })}
      />
      <Route
        path="/integration-status"
        component={ownerReview({
          eyebrow: "Integration Status",
          title: "Integration Status",
          description: "Integration status is read from persisted backend connection records.",
          emptyTitle: "No integration records found",
          emptyMessage: "This section will populate after GoHighLevel connection metadata is returned by the backend.",
        })}
      />
      <Route
        path="/executive-timeline"
        component={ownerReview({
          eyebrow: "Timeline",
          title: "Executive Timeline",
          description: "The executive timeline will contain verified business events only.",
          emptyTitle: "No timeline events available yet",
          emptyMessage: "This section will populate after verified business activity is available.",
        })}
      />
      <Route
        path="/knowledge-graph"
        component={ownerReview({
          eyebrow: "Knowledge Graph",
          title: "Knowledge Graph",
          description: "The knowledge graph will reflect verified business entities and relationships.",
          emptyTitle: "No knowledge graph available yet",
          emptyMessage: "This section will populate after connected business data is available to build verified relationships.",
        })}
      />
      <Route
        path="/executive-dashboard"
        component={ownerReview({
          eyebrow: "Executive Dashboard",
          title: "Executive Dashboard",
          description: "This workspace is ready for verified dashboard modules as live data becomes available.",
          emptyTitle: "No executive metrics available yet",
          emptyMessage: "This section will populate after verified dashboard data is available from connected systems.",
        })}
      />
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
