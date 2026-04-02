import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { JobProvider } from "@/context/JobContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

import { IntroSplash } from "@/components/IntroSplash";
import { AnimatedCursor } from "@/components/AnimatedCursor";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SociaAIOrb } from "@/components/SociaAIOrb";
import { FullPageLoader } from "@/components/FullPageLoader";

// Eager load critical pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";

// Lazy load non-critical pages
const Applied = lazy(() => import("./pages/Applied"));
const Saved = lazy(() => import("./pages/Saved"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminImport = lazy(() => import("./pages/AdminImport"));
const FounderEmployers = lazy(() => import("./pages/FounderEmployers"));
const ErrorLogs = lazy(() => import("./pages/ErrorLogs"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* User pages */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/recommendations" element={
        <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
          <LazyPage><Recommendations /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/applied" element={
        <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
          <LazyPage><Applied /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/saved" element={
        <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
          <LazyPage><Saved /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
          <LazyPage><Profile /></LazyPage>
        </ProtectedRoute>
      } />
      
      {/* Employer pages */}
      <Route path="/employer" element={
        <ProtectedRoute allowedRoles={["employer", "founder"]}>
          <LazyPage><EmployerDashboard /></LazyPage>
        </ProtectedRoute>
      } />
      
      {/* Founder-only pages */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={["founder"]}>
          <LazyPage><Admin /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/admin/import" element={
        <ProtectedRoute allowedRoles={["founder"]}>
          <LazyPage><AdminImport /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/founder/employers" element={
        <ProtectedRoute allowedRoles={["founder"]}>
          <LazyPage><FounderEmployers /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/admin/error-logs" element={
        <ProtectedRoute allowedRoles={["founder"]}>
          <LazyPage><ErrorLogs /></LazyPage>
        </ProtectedRoute>
      } />
      
      <Route path="/payment-success" element={<LazyPage><PaymentSuccess /></LazyPage>} />
      <Route path="/unsubscribe" element={<LazyPage><Unsubscribe /></LazyPage>} />
      <Route path="/privacy-policy" element={<LazyPage><PrivacyPolicy /></LazyPage>} />
      <Route path="/help" element={<LazyPage><Help /></LazyPage>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <JobProvider>
            <IntroSplash>
            <AnimatedCursor />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
              
              <MobileBottomNav />
              <SociaAIOrb />
            </BrowserRouter>
            </IntroSplash>
          </JobProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
