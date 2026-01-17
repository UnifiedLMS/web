import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import unifiedLogo from "@assets/unified_logo_1768624517472.png";
import { useLogout } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { logout, user } = useLogout();
  const [location, setLocation] = useLocation();

  // Redirect if logic fails somewhere (extra safety)
  useEffect(() => {
    const token = localStorage.getItem("unified_token");
    if (!token) setLocation("/login");
  }, [location, setLocation]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={unifiedLogo} alt="Logo" className="h-8 w-auto" />
            <span className="font-display font-bold text-xl hidden md:inline-block">Unified</span>
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Адмін-панель</span>
              {user && (
                <span className="text-sm font-medium text-foreground">
                  {user.username}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground transition-all duration-300 hover:rotate-90">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Налаштування</span>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Вихід</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-lg mx-auto"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary animate-pulse">
            <Monitor className="w-12 h-12" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Скоро буде
          </h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Ми працюємо над створенням найкращого досвіду для вас. Електронні відомості та інші функції з'являться зовсім скоро.
          </p>

          <div className="pt-8">
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground font-mono">
                  version 0.1.0-alpha
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
