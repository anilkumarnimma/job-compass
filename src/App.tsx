import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { JobProvider } from "@/context/JobContext";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Applied from "./pages/Applied";
import Saved from "./pages/Saved";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminImport from "./pages/AdminImport";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <JobProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/applied" element={<Applied />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/import" element={<AdminImport />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/help" element={<Help />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingHelpButton />
          </BrowserRouter>
        </JobProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
