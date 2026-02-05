 import { ReactNode } from "react";
 import { Header } from "./Header";
 import { Footer } from "./Footer";
 
 interface LayoutProps {
   children: ReactNode;
   showHeader?: boolean;
   showFooter?: boolean;
 }
 
 export function Layout({ children, showHeader = true, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[hsl(210,40%,98%)] to-[hsl(226,100%,97%)]">
      {showHeader && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}