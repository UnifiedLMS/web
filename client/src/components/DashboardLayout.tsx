import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Home, Table2, Users, GraduationCap, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import unifiedLogo from "@assets/unified_logo.png";
import { useLogout } from "@/hooks/use-auth";
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout, user } = useLogout();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("unified_token");
    if (!token) setLocation("/login");
  }, [location, setLocation]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    logout();
  };

  const menuItems = [
    {
      title: "Головна",
      icon: Home,
      link: "/home",
    },
    {
      title: "Електронні відомості",
      icon: Table2,
      link: "/spreadsheet",
    },
    {
      title: "Користувачі",
      icon: Users,
      link: "/users",
    },
    {
      title: "Студенти",
      icon: GraduationCap,
      link: "/students",
    },
    {
      title: "Викладачі",
      icon: BookOpen,
      link: "/teachers",
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
                  <span className="font-display font-bold text-lg">Unified</span>
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
                            isActive={location === item.link || (item.link === "/home" && location === "/dashboard")}
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
                      <div className="text-xs">Адміністратор</div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Link href="/settings" className="flex-1">
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
                  transition={{ duration: 0.3 }}
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