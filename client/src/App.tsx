import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useCheckToken } from "@/hooks/use-auth";
import { extractRole } from "@shared/schema";
import { getTokenFromCookie, clearAuthCookies } from "@/lib/cookieUtils";
import { useEndpointNotifications } from "@/lib/endpoint-tracker";
import { DeveloperProvider } from "@/contexts/developer-context";
import unifiedLogo from "@assets/unified_logo.png";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import Spreadsheet from "@/pages/Spreadsheet";
import Users from "@/pages/Users";
import Students from "@/pages/Students";
import Teachers from "@/pages/Teachers";
import Schedule from "@/pages/Schedule";
import NotFound from "@/pages/not-found";

// Student Pages
import StudentHome from "@/pages/student/StudentHome";
import StudentLessons from "@/pages/student/StudentLessons";
import StudentSchedule from "@/pages/student/StudentSchedule";
import StudentSettings from "@/pages/student/StudentSettings";

// Teacher Pages
import TeacherHome from "@/pages/teacher/TeacherHome";
import TeacherSchedule from "@/pages/teacher/TeacherSchedule";
import TeacherGrades from "@/pages/teacher/TeacherGrades";
import TeacherSettings from "@/pages/teacher/TeacherSettings";

// Entry Animation Component
function EntryScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] text-white"
    >
      {/* Subtle background glow - uses primary/accent color */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-primary/15 rounded-full blur-[100px]" />
      </div>
      
      <div className="flex flex-col items-center relative">
        <motion.div className="relative">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.25 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"
          />
          <motion.img
            src={unifiedLogo}
            alt="Logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-24 h-auto relative"
          />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeInOut" }}
          className="text-4xl font-display font-bold tracking-tight mt-6"
        >
          Unified
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: "easeInOut" }}
          className="mt-8"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                className="w-2 h-2 bg-primary rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Login />
          </motion.div>
        </Route>
        <Route path="/login">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Login />
          </motion.div>
        </Route>
        <Route path="/dashboard">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Dashboard />
          </motion.div>
        </Route>
        <Route path="/home">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Dashboard />
          </motion.div>
        </Route>
        <Route path="/spreadsheet">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Spreadsheet />
          </motion.div>
        </Route>
        <Route path="/users">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Users />
          </motion.div>
        </Route>
        <Route path="/students">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Students />
          </motion.div>
        </Route>
        <Route path="/teachers">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Teachers />
          </motion.div>
        </Route>
        <Route path="/schedule">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Schedule />
          </motion.div>
        </Route>
        <Route path="/settings">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <Settings />
          </motion.div>
        </Route>
        
        {/* Student Routes */}
        <Route path="/student">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <StudentHome />
          </motion.div>
        </Route>
        <Route path="/student/lessons">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <StudentLessons />
          </motion.div>
        </Route>
        <Route path="/student/schedule">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <StudentSchedule />
          </motion.div>
        </Route>
        <Route path="/student/settings">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <StudentSettings />
          </motion.div>
        </Route>
        
        {/* Teacher Routes */}
        <Route path="/teacher">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <TeacherHome />
          </motion.div>
        </Route>
        <Route path="/teacher/schedule">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <TeacherSchedule />
          </motion.div>
        </Route>
        <Route path="/teacher/grades">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <TeacherGrades />
          </motion.div>
        </Route>
        <Route path="/teacher/settings">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
            <TeacherSettings />
          </motion.div>
        </Route>
        
        <Route>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
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
  
  // Set up endpoint notifications listener
  useEndpointNotifications();

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
    const token = getTokenFromCookie();
    
    const checkAuth = async (): Promise<{ valid: boolean; role?: string }> => {
      if (token) {
        try {
          const data = await checkTokenMutation.mutateAsync(token);
          const role = extractRole(data);
          return { valid: true, role };
        } catch (e) {
          clearAuthCookies();
          return { valid: false };
        }
      }
      return { valid: false };
    };

    // 3. Coordinate Animation + Auth Check
      const minAnimationTime = 500; // 0.5 seconds
    const startTime = Date.now();

    const runSequence = async () => {
      const authResult = await checkAuth();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minAnimationTime - elapsed);

      setTimeout(() => {
        setShowEntry(false);
        if (authResult.valid) {
          const role = authResult.role;
          if (role === "students" || role === "student") {
            setLocation("/student");
          } else if (role === "teachers" || role === "teacher") {
            setLocation("/teacher");
          } else if (role === "admins" || role === "admin") {
            setLocation("/dashboard");
          } else {
            setLocation("/login");
          }
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
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <Router />
        </motion.div>
      )}
    </>
  );
}

function App() {
  return (
    <DeveloperProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </DeveloperProvider>
  );
}

export default App;
