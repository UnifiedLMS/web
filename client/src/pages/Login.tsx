import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema } from "@shared/schema";
import { api } from "@shared/routes";
import { useLogin, useTokenLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Chrome, Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { BackgroundAnimation } from "@/components/background-animation";
import { AnimatedStars } from "@/components/animated-stars";
import unifiedLogo from "@assets/unified_logo.png";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [didTryCookieLogin, setDidTryCookieLogin] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
    }
    return true;
  });
  const { toast } = useToast();
  const loginMutation = useLogin();
  const tokenLoginMutation = useTokenLogin();

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const form = useForm<z.infer<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof loginRequestSchema>) => {
    loginMutation.mutate(data, {
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Помилка входу",
          description: error.message,
        });
      },
    });
  };

  // Handle Google OAuth: errors from redirect, then token from cookies only
  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error") || url.searchParams.get("oauth_error");

    if (error) {
      toast({
        variant: "destructive",
        title: "Помилка входу через Google",
        description: url.searchParams.get("error_description") || "Не вдалося увійти через Google",
      });
      url.searchParams.delete("error");
      url.searchParams.delete("oauth_error");
      url.searchParams.delete("error_description");
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, document.title, url.toString());
      setDidTryCookieLogin(true);
      return;
    }

    if (didTryCookieLogin) return;

    const cookieString = document.cookie || "";
    if (!cookieString) {
      setDidTryCookieLogin(true);
      return;
    }

    const cookieMap = cookieString.split(";").reduce<Record<string, string>>((acc, part) => {
      const [rawKey, ...rest] = part.split("=");
      if (!rawKey) return acc;
      const key = rawKey.trim();
      const value = rest.join("=").trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {});

    const possibleTokenKeys = [
      "unified_token",
      "access_token",
      "token",
      "auth_token",
      "google_oauth_token",
    ];
    const tokenKey = possibleTokenKeys.find((key) => cookieMap[key]);
    const tokenFromCookie = tokenKey ? cookieMap[tokenKey] : undefined;

    if (!tokenFromCookie) {
      setDidTryCookieLogin(true);
      return;
    }

    const possibleRoleKeys = ["role", "user_role", "userRole", "unified_role"];
    const roleKey = possibleRoleKeys.find((key) => cookieMap[key]);
    const roleHint = roleKey ? cookieMap[roleKey] : undefined;

    setDidTryCookieLogin(true);

    tokenLoginMutation.mutate(
      { token: tokenFromCookie, roleHint },
      {
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Помилка входу через Google",
            description: err.message || "Не вдалося увійти за токеном з cookies",
          });
        },
      }
    );
  }, [didTryCookieLogin, tokenLoginMutation, toast]);

  const handleGoogleLogin = () => {
    // Redirect to Google auth - API will redirect back with token
    window.location.href = api.auth.loginGoogle.path;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background">
      {isDark && (
        <>
          <BackgroundAnimation />
          <AnimatedStars count={80} className="opacity-60" intensity="light" />
        </>
      )}

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground dark:text-white hover:bg-white/20 dark:hover:bg-white/20 transition-all duration-200 shadow-lg"
        aria-label={isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      >
        {isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut", delay: 1.2 }}
        className="w-full max-w-md px-4 z-10"
      >
        <Card className="bg-card/95 dark:bg-white/[0.07] backdrop-blur-xl border-border dark:border-white/[0.08] shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden">
          <CardContent className="pt-10 pb-8 px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut", delay: 1.4 }}
            >
              <div className="flex flex-col items-center mb-8">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full scale-150" />
                  <motion.img
                    src={unifiedLogo}
                    alt="Unified Logo"
                    className="h-20 w-auto relative drop-shadow-lg"
                  />
                </motion.div>
                <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mt-4">Unified</h1>
                <p className="text-muted-foreground text-sm mt-1">Система управління</p>
              </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 dark:text-white/80 text-sm font-medium">Код ЄДЕБО</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Введіть код" 
                          {...field} 
                          autoComplete="username"
                          className="bg-background dark:bg-white/[0.05] border-border dark:border-white/[0.08] text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/25 focus:bg-background dark:focus:bg-white/[0.08] focus:border-primary/50 transition-all h-11"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 dark:text-white/80 text-sm font-medium">Пароль</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Введіть пароль"
                            {...field}
                            autoComplete="current-password"
                            className="bg-background dark:bg-white/[0.05] border-border dark:border-white/[0.08] text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/25 focus:bg-background dark:focus:bg-white/[0.08] focus:border-primary/50 transition-all pr-10 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/70 transition-colors focus:outline-none"
                            aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 mt-3 glow-primary transition-all duration-300"
                  disabled={loginMutation.isPending || tokenLoginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Вхід"
                  )}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card dark:bg-transparent px-3 text-xs uppercase tracking-wide text-muted-foreground dark:text-white/30">або</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={loginMutation.isPending || tokenLoginMutation.isPending}
                    className="w-full border-border dark:border-white/20 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/10 h-12"
                  >
                    {tokenLoginMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Chrome className="mr-2 h-5 w-5" />
                    )}
                    {tokenLoginMutation.isPending ? "Вхід..." : "Увійти через Google"}
                  </Button>
                </div>
              </form>
            </Form>
            </motion.div>
          </CardContent>
        </Card>
        
        <p className="text-center text-muted-foreground/60 dark:text-white/25 text-xs mt-8">
          &copy; {new Date().getFullYear()} Unified · Система управління навчанням
        </p>
      </motion.div>
    </div>
  );
}
