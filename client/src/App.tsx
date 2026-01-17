import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useCheckToken } from "@/hooks/use-auth";
import unifiedLogo from "@assets/unified_logo_1768624517472.png";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

// Entry Animation Component
function EntryScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000814] text-white"
    >
      <div className="flex flex-col items-center">
        <motion.img
          src={unifiedLogo}
          alt="Logo"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-24 h-auto mb-6"
        />
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-4xl font-display font-bold tracking-tight"
        >
          Unified
        </motion.h1>
      </div>
    </motion.div>
  );
}

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Login />
          </motion.div>
        </Route>
        <Route path="/login">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Login />
          </motion.div>
        </Route>
        <Route path="/dashboard">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Dashboard />
          </motion.div>
        </Route>
        <Route path="/settings">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Settings />
          </motion.div>
        </Route>
        <Route>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <NotFound />
          </motion.div>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function AppContent() {
  const [showEntry, setShowEntry] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [, setLocation] = useLocation();
  const checkTokenMutation = useCheckToken();

  useEffect(() => {
    // 1. Initial theme and color setup from local storage
    const savedTheme = localStorage.getItem("theme");
    const savedColor = localStorage.getItem("highlightColor");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }

    if (savedColor) {
      // Helper to apply stored color
      const hex = savedColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      // Basic RGB to HSL for Tailwind H S L format
      let rN = r / 255, gN = g / 255, bN = b / 255;
      const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
      let h = 0, s, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rN) h = (gN - bN) / d + (gN < bN ? 6 : 0);
        else if (max === gN) h = (bN - rN) / d + 2;
        else if (max === bN) h = (rN - gN) / d + 4;
        h /= 6;
      } else {
        s = 0;
      }
      const H = Math.round(h * 360), S = Math.round(s * 100), L = Math.round(l * 100);
      
      document.documentElement.style.setProperty('--primary', `${H} ${S}% ${L}%`);
      document.documentElement.style.setProperty('--ring', `${H} ${S}% ${L}%`);
      document.documentElement.style.setProperty('--accent', `${H} ${S}% ${L}%`);
    }

    // 2. Start token check immediately
    const token = localStorage.getItem("unified_token");
    
    const checkAuth = async () => {
      if (token) {
        try {
          await checkTokenMutation.mutateAsync(token);
          // Token valid - will redirect to dashboard
          return true;
        } catch (e) {
          // Token invalid
          localStorage.removeItem("unified_token");
          return false;
        }
      }
      return false;
    };

    // 3. Coordinate Animation + Auth Check
    const minAnimationTime = 2000; // 2 seconds
    const startTime = Date.now();

    const runSequence = async () => {
      const isValid = await checkAuth();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minAnimationTime - elapsed);

      setTimeout(() => {
        setShowEntry(false);
        if (isValid) {
          setLocation("/dashboard");
        } else {
          setLocation("/login");
        }
      }, remaining);
    };

    runSequence();
  }, []); // Run once on mount

  return (
    <>
      <AnimatePresence>
        {showEntry && <EntryScreen onComplete={() => setShowEntry(false)} />}
      </AnimatePresence>
      
      {!showEntry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Router />
        </motion.div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
