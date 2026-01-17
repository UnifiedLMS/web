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
    <Switch>
      <Route path="/" component={Login} /> {/* Default to Login, EntryScreen handles redirection */}
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [showEntry, setShowEntry] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [, setLocation] = useLocation();
  const checkTokenMutation = useCheckToken();

  useEffect(() => {
    // 1. Initial theme setup from local storage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
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
