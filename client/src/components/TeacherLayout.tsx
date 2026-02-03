import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Home, Calendar, Table2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import unifiedLogo from "@assets/unified_logo.png";
import { useLogout } from "@/hooks/use-auth";
import { getTokenFromCookie, getRoleFromCookie } from "@/lib/cookieUtils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { logout, user } = useLogout();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const token = getTokenFromCookie();
    if (!token) {
      console.warn("[TeacherLayout] No token found, redirecting to login");
      setLocation("/login");
      return;
    }
    console.log("[TeacherLayout] Token found:", token.substring(0, 20) + "...");
    
    // Verify role (accept both singular and plural forms)
    const role = getRoleFromCookie();
    console.log("[TeacherLayout] Role:", role);
    if (role !== "teachers" && role !== "teacher") {
      console.warn("[TeacherLayout] Invalid role, redirecting to login:", role);
      setLocation("/login");
    }
  }, [location, setLocation]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    logout();
  };

  const menuItems = [
    {
      title: "Головна",
      icon: Home,
      link: "/teacher",
    },
    {
      title: "Розклад",
      icon: Calendar,
      link: "/teacher/schedule",
    },
    {
      title: "Оцінювання",
      icon: Table2,
      link: "/teacher/grades",
    },
  ];

  return (
    <SidebarProvider>
      <AnimatePresence mode="wait">
        {!isLoggingOut && (
          <div className="flex min-h-screen w-full bg-background">
            <Sidebar>
              <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-2">
                  <img src={unifiedLogo} alt="Logo" className="h-8 w-auto" />
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-lg">Unified</span>
                    <span className="text-xs text-muted-foreground">Викладач</span>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Навігація</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.map((item) => (
                        <SidebarMenuItem key={item.link}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === item.link}
                          >
                            <Link href={item.link}>
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <div className="px-2 py-2">
                  {user && (
                    <div className="text-xs text-muted-foreground mb-2 px-2">
                      <div className="font-semibold">{user.username}</div>
                      <div className="text-xs">Викладач</div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Link href="/teacher/settings" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Settings className="w-4 h-4 mr-2" />
                        Налаштування
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset className="flex flex-col">
              <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center gap-2 px-4">
                  <SidebarTrigger />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-full"
                >
                  {children}
                </motion.div>
              </main>
            </SidebarInset>
          </div>
        )}
      </AnimatePresence>
    </SidebarProvider>
  );
}
