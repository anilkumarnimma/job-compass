 import { Toaster } from "@/components/ui/toaster";
 import { Toaster as Sonner } from "@/components/ui/sonner";
 import { TooltipProvider } from "@/components/ui/tooltip";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { BrowserRouter, Routes, Route } from "react-router-dom";
 import { JobProvider } from "@/context/JobContext";
 import Index from "./pages/Index";
 import Dashboard from "./pages/Dashboard";
 import Applied from "./pages/Applied";
 import Saved from "./pages/Saved";
 import Auth from "./pages/Auth";
 import NotFound from "./pages/NotFound";
 
 const queryClient = new QueryClient();
 
 const App = () => (
   <QueryClientProvider client={queryClient}>
     <TooltipProvider>
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
             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
             <Route path="*" element={<NotFound />} />
           </Routes>
         </BrowserRouter>
       </JobProvider>
     </TooltipProvider>
   </QueryClientProvider>
 );
 
 export default App;
