 // Cache bust: v3
 import { StrictMode } from "react";
 import { createRoot } from "react-dom/client";
 import App from "./App.tsx";
import "./index.css";
import "./styles/socia-orb.css";
import { initGlobalErrorCapture } from "./lib/errorLogger";

// Start capturing errors globally
initGlobalErrorCapture();
 
 const rootElement = document.getElementById("root");
 if (!rootElement) throw new Error("Root element not found");
 
 createRoot(rootElement).render(
   <StrictMode>
     <App />
   </StrictMode>
 );
