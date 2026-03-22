import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { JobProvider } from "@/context/JobContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { IntroSplash } from "@/components/IntroSplash";
import { AnimatedCursor } from "@/components/AnimatedCursor";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SociaAIOrb } from "@/components/SociaAIOrb";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Applied from "./pages/Applied";
import Saved from "./pages/Saved";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminImport from "./pages/AdminImport";
import FounderEmployers from "./pages/FounderEmployers";
import EmployerDashboard from "./pages/EmployerDashboard";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import Recommendations from "./pages/Recommendations";
import PaymentSuccess from "./pages/PaymentSuccess";
import Unsubscribe from "./pages/Unsubscribe";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <AnimatedRoutes>
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
            <Recommendations />
          </ProtectedRoute>
        } />
        <Route path="/applied" element={
          <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
            <Applied />
          </ProtectedRoute>
        } />
        <Route path="/saved" element={
          <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
            <Saved />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={["user", "employer", "founder"]}>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Employer pages */}
        <Route path="/employer" element={
          <ProtectedRoute allowedRoles={["employer", "founder"]}>
            <EmployerDashboard />
          </ProtectedRoute>
        } />
        
        {/* Founder-only pages */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["founder"]}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/admin/import" element={
          <ProtectedRoute allowedRoles={["founder"]}>
            <AdminImport />
          </ProtectedRoute>
        } />
        <Route path="/founder/employers" element={
          <ProtectedRoute allowedRoles={["founder"]}>
            <FounderEmployers />
          </ProtectedRoute>
        } />
        
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/help" element={<Help />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatedRoutes>
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
