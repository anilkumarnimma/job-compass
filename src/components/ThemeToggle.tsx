import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDark(true);
    else if (saved === "light") setDark(false);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="relative h-9 w-9 rounded-full overflow-hidden"
            aria-label="Toggle theme"
          >
            <Sun 
              className={`h-4 w-4 absolute transition-all duration-300 ${
                dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`} 
            />
            <Moon 
              className={`h-4 w-4 absolute transition-all duration-300 ${
                dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`} 
            />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {dark ? "Light Mode" : "Dark Mode"}
      </TooltipContent>
    </Tooltip>
  );
}
