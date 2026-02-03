import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun, Mail, Lock, ChevronDown, Loader2, Eye, EyeOff } from "lucide-react";
import unifiedLogo from "@assets/unified_logo.png";
import { motion } from "framer-motion";
import { useLogout } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { useDeveloperMode } from "@/contexts/developer-context";

const emailSchema = z.object({
  email: z.string().email("Введіть коректний email"),
  password: z.string().min(1, "Введіть пароль для підтвердження"),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Введіть поточний пароль"),
  new_password: z.string().min(6, "Новий пароль має містити мінімум 6 символів"),
  confirm_password: z.string().min(1, "Підтвердіть новий пароль"),
}).refine(data => data.new_password === data.confirm_password, {
  message: "Паролі не співпадають",
  path: ["confirm_password"],
});

// HSL Helper for color conversion
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#00aaee");
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const { isDeveloperMode, showEndpointLabels, showEndpointPopups, toggleDeveloperMode, toggleEndpointLabels, toggleEndpointPopups } = useDeveloperMode();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: z.infer<typeof emailSchema>) => {
      return apiFetch("/api/v1/user/email", {
        method: "PATCH",
        body: JSON.stringify({
          email: {
            address: data.email,
            password: data.password,
          },
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Email успішно змінено" });
      emailForm.reset();
      setEmailOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося змінити email" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      return apiFetch("/api/v1/user/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Пароль успішно змінено" });
      passwordForm.reset();
      setPasswordOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося змінити пароль" });
    },
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const savedColor = localStorage.getItem("highlightColor") || "#00aaee";

    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    setHighlightColor(savedColor);
    applyColor(savedColor);
  }, []);

  const applyColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const hsl = rgbToHsl(r, g, b);
    
    document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  };

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    logout();
  };

  const changeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setHighlightColor(color);
    localStorage.setItem("highlightColor", color);
    applyColor(color);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="space-y-8"
        >
          <h1 className="text-3xl font-display font-bold">Налаштування</h1>

          <div className="space-y-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle>Зовнішній вигляд</CardTitle>
                <CardDescription>
                  Налаштуйте інтерфейс відповідно до ваших вподобань
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme-toggle" className="text-base">
                      Темна тема
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Перемикання між світлою та темною темою
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch 
                      id="theme-toggle" 
                      checked={isDark} 
                      onCheckedChange={toggleTheme} 
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base">Колір акценту</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={highlightColor}
                      onChange={changeColor}
                      className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-sm font-mono text-muted-foreground uppercase">{highlightColor}</span>
                  </div>
                  <p className="text-sm text-muted-foreground pt-1">
                    Виберіть будь-який колір для кнопок та активних елементів інтерфейсу.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Change Email */}
            <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">Змінити Email</CardTitle>
                          <CardDescription>Оновіть вашу адресу електронної пошти</CardDescription>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-200 ease-in-out ${emailOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Form {...emailForm}>
                      <form onSubmit={emailForm.handleSubmit((data) => emailMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={emailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Новий Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="example@email.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={emailForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Пароль для підтвердження</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Введіть пароль" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={emailMutation.isPending}>
                          {emailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Зберегти
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Change Password */}
            <Collapsible open={passwordOpen} onOpenChange={setPasswordOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">Змінити пароль</CardTitle>
                          <CardDescription>Оновіть ваш пароль для входу</CardDescription>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-200 ease-in-out ${passwordOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="current_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Поточний пароль</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    placeholder="Введіть поточний пароль" 
                                    {...field} 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="new_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Новий пароль</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showNewPassword ? "text" : "password"} 
                                    placeholder="Введіть новий пароль" 
                                    {...field} 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirm_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Підтвердження пароля</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Повторіть новий пароль" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={passwordMutation.isPending}>
                          {passwordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Зберегти
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>Про додаток</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl flex items-center justify-center shrink-0">
                  <img src={unifiedLogo} alt="Unified" className="h-10 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate">Unified</h3>
                  <p className="text-muted-foreground">Версія 0.1.0 Alpha</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-tight">
                    Розроблено для забезпечення сучасного та зручного навчального процесу.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Developer Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Режим розробника</CardTitle>
                <CardDescription>
                  Інструменти для налагодження та розробки
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dev-mode-toggle" className="text-base">
                      Активувати режим розробника
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Включити інструменти розробника
                    </div>
                  </div>
                  <Switch 
                    id="dev-mode-toggle"
                    checked={isDeveloperMode}
                    onCheckedChange={toggleDeveloperMode}
                  />
                </div>

                {isDeveloperMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="endpoint-labels" className="text-base">
                          Показувати назви API
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          Відображати API endpoint'и біля кнопок
                        </div>
                      </div>
                      <Switch 
                        id="endpoint-labels"
                        checked={showEndpointLabels}
                        onCheckedChange={toggleEndpointLabels}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="endpoint-popups" className="text-base">
                          Повідомлення про запити
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          Показувати вспливаючі вікна для кожного API запиту
                        </div>
                      </div>
                      <Switch 
                        id="endpoint-popups"
                        checked={showEndpointPopups}
                        onCheckedChange={toggleEndpointPopups}
                      />
                    </div>

                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground">
                      💡 <strong>Порада:</strong> Ці параметри зберігаються локально у вашому браузері. Деактивуйте режим розробника перед виходом.
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Logout */}
            <div className="pt-4">
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleLogout}
              >
                Вийти з акаунту
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
