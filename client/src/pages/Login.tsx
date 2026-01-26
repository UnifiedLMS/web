import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema } from "@shared/schema";
import { api } from "@shared/routes";
import { useLogin, useTokenLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chrome, Eye, EyeOff, Loader2, ClipboardPaste, CheckCircle2, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundAnimation } from "@/components/background-animation";
import unifiedLogo from "@assets/unified_logo.png";
import { useToast } from "@/hooks/use-toast";

// Extract access_token and optionally role from JSON or URL-like string
function extractTokenData(input: string): { token: string | null; role: string | null } {
  const trimmed = input.trim();
  let token: string | null = null;
  let role: string | null = null;
  
  // Try parsing as JSON first
  try {
    const json = JSON.parse(trimmed);
    if (json.access_token) {
      token = json.access_token;
    }
    if (json.role) {
      role = json.role;
    }
    if (token) {
      return { token, role };
    }
  } catch {
    // Not JSON, try other patterns
  }
  
  // Try URL with access_token param
  try {
    const url = new URL(trimmed);
    token = url.searchParams.get("access_token");
    if (token) return { token, role: null };
  } catch {
    // Not a URL
  }
  
  // Try finding access_token in query string format
  const queryMatch = trimmed.match(/access_token=([^&\s"]+)/);
  if (queryMatch) {
    return { token: queryMatch[1], role: null };
  }
  
  // Try finding it in JSON-like format without parsing
  const jsonMatch = trimmed.match(/"access_token"\s*:\s*"([^"]+)"/);
  if (jsonMatch) {
    // Also try to find role
    const roleMatch = trimmed.match(/"role"\s*:\s*"([^"]+)"/);
    return { token: jsonMatch[1], role: roleMatch ? roleMatch[1] : null };
  }
  
  // If it looks like a JWT token directly (starts with eyJ)
  if (trimmed.startsWith("eyJ") && trimmed.split(".").length === 3) {
    return { token: trimmed, role: null };
  }
  
  return { token: null, role: null };
}

// For backward compatibility
function extractAccessToken(input: string): string | null {
  return extractTokenData(input).token;
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoginPending, setGoogleLoginPending] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [tokenInputValid, setTokenInputValid] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
    }
    return true;
  });
  const { toast } = useToast();
  const loginMutation = useLogin();
  const tokenLoginMutation = useTokenLogin();
  const [, setLocation] = useLocation();
  const popupRef = useRef<Window | null>(null);
  const popupCheckIntervalRef = useRef<number | null>(null);
  const popupOpenTimeRef = useRef<number>(0);

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

  const resetGoogleState = useCallback(() => {
    setGoogleLoginPending(false);
    setShowTokenDialog(false);
    setManualTokenInput("");
    setTokenInputValid(null);
    popupRef.current = null;
    if (popupCheckIntervalRef.current) {
      window.clearInterval(popupCheckIntervalRef.current);
      popupCheckIntervalRef.current = null;
    }
  }, []);

  const handleManualTokenSubmit = useCallback(() => {
    const { token, role } = extractTokenData(manualTokenInput);
    if (!token) {
      setTokenInputValid(false);
      toast({
        variant: "destructive",
        title: "Невірний формат",
        description: "Не вдалося знайти токен. Скопіюйте весь текст зі сторінки Google.",
      });
      return;
    }

    setTokenInputValid(true);
    setShowTokenDialog(false);
    setGoogleLoginPending(false);
    
    // Pass role as hint in case server doesn't return it
    tokenLoginMutation.mutate({ token, roleHint: role || undefined }, {
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Помилка входу через Google",
          description: err.message,
        });
        resetGoogleState();
      },
    });
  }, [manualTokenInput, tokenLoginMutation, toast, resetGoogleState]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setManualTokenInput(text);
      // Auto-validate on paste
      const { token, role } = extractTokenData(text);
      setTokenInputValid(token !== null);
      if (token) {
        // Auto-submit on valid paste
        setShowTokenDialog(false);
        setGoogleLoginPending(false);
        // Pass role as hint in case server doesn't return it
        tokenLoginMutation.mutate({ token, roleHint: role || undefined }, {
          onError: (err) => {
            toast({
              variant: "destructive",
              title: "Помилка входу через Google",
              description: err.message,
            });
            resetGoogleState();
          },
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Буфер обміну недоступний",
        description: "Вставте текст вручну (Ctrl+V).",
      });
    }
  }, [tokenLoginMutation, toast, resetGoogleState]);

  // Handle OAuth token from popup via postMessage
  const handleOAuthMessage = useCallback((event: MessageEvent) => {
    // Verify origin for security
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, token, error } = event.data || {};
    
    if (type === "oauth_complete" && token) {
      resetGoogleState();

      tokenLoginMutation.mutate(token, {
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Помилка входу через Google",
            description: err.message,
          });
        },
      });
    } else if (type === "oauth_error") {
      resetGoogleState();
      toast({
        variant: "destructive",
        title: "Помилка входу через Google",
        description: error || "Не вдалося увійти через Google",
      });
    }
  }, [tokenLoginMutation, toast, resetGoogleState]);

  useEffect(() => {
    // Check if this is a popup window that just completed OAuth
    const isPopup = window.opener && window.opener !== window;
    const url = new URL(window.location.href);
    const tokenFromQuery = url.searchParams.get("token") || url.searchParams.get("access_token");
    let tokenFromHash: string | null = null;

    if (!tokenFromQuery && url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      tokenFromHash = hashParams.get("token") || hashParams.get("access_token");
    }

    const oauthToken = tokenFromQuery || tokenFromHash;

    // If we're in a popup with a token, send it to the opener and close
    if (isPopup && oauthToken) {
      try {
        window.opener.postMessage(
          { type: "oauth_complete", token: oauthToken },
          window.location.origin
        );
      } catch (e) {
        console.error("[OAuth] Failed to send message to opener:", e);
      }
      window.close();
      return;
    }

    // If we're in a popup without a token (error case), notify opener and close
    if (isPopup && url.searchParams.get("oauth_error")) {
      try {
        window.opener.postMessage(
          { type: "oauth_error", error: "OAuth помилка від Google" },
          window.location.origin
        );
      } catch (e) {
        console.error("[OAuth] Failed to send error to opener:", e);
      }
      window.close();
      return;
    }

    // If we're the main window with a token in URL (direct redirect fallback)
    if (!isPopup && oauthToken) {
      tokenLoginMutation.mutate(oauthToken, {
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Помилка входу через Google",
            description: error.message,
          });
        },
      });

      // Clean up the URL
      url.searchParams.delete("token");
      url.searchParams.delete("access_token");
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        hashParams.delete("token");
        hashParams.delete("access_token");
        url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
      }
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [tokenLoginMutation, toast]);

  // Listen for postMessage from popup
  useEffect(() => {
    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
      // Cleanup interval on unmount
      if (popupCheckIntervalRef.current) {
        window.clearInterval(popupCheckIntervalRef.current);
      }
    };
  }, [handleOAuthMessage]);

  const handleGoogleLogin = () => {
    const popup = window.open(
      api.auth.loginGoogle.path,
      "googleLogin",
      "width=520,height=680,scrollbars=yes,resizable=yes"
    );

    if (!popup) {
      toast({
        variant: "destructive",
        title: "Спливаюче вікно заблоковано",
        description: "Дозвольте спливаючі вікна для входу через Google.",
      });
      return;
    }

    popupRef.current = popup;
    popupOpenTimeRef.current = Date.now();
    setGoogleLoginPending(true);
    setManualTokenInput("");
    setTokenInputValid(null);

    // Monitor popup for closure
    popupCheckIntervalRef.current = window.setInterval(() => {
      if (popup.closed) {
        if (popupCheckIntervalRef.current) {
          window.clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        popupRef.current = null;
        
        // If popup was open for more than 3 seconds (user likely went through OAuth)
        // and we didn't receive a token via postMessage, show the manual entry dialog
        const wasOpenLongEnough = Date.now() - popupOpenTimeRef.current > 3000;
        if (wasOpenLongEnough && googleLoginPending) {
          setShowTokenDialog(true);
        } else {
          setGoogleLoginPending(false);
        }
      }
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background">
      {isDark && <BackgroundAnimation />}

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

      {/* Manual Token Entry Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={(open) => {
        if (!open) {
          resetGoogleState();
        }
      }}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Завершення входу через Google</DialogTitle>
            <DialogDescription className="text-white/60">
              Скопіюйте весь текст зі сторінки Google (Ctrl+A, Ctrl+C) та вставте його нижче.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <Textarea
              placeholder='{"access_token":"eyJ...", "token_type":"bearer", ...}'
              value={manualTokenInput}
              onChange={(e) => {
                setManualTokenInput(e.target.value);
                const token = extractAccessToken(e.target.value);
                setTokenInputValid(token !== null);
              }}
              className={`min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 font-mono text-sm ${
                tokenInputValid === false ? "border-red-500/50" : tokenInputValid === true ? "border-green-500/50" : ""
              }`}
            />
            
            <AnimatePresence>
              {tokenInputValid === true && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-green-400 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Токен знайдено
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePasteFromClipboard}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Вставити з буферу
              </Button>
              
              <Button
                type="button"
                onClick={handleManualTokenSubmit}
                disabled={!manualTokenInput.trim() || tokenLoginMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {tokenLoginMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Увійти
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full max-w-md px-4 z-10"
      >
        <Card className="bg-card/95 dark:bg-white/[0.07] backdrop-blur-xl border-border dark:border-white/[0.08] shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden">
          <CardContent className="pt-10 pb-8 px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
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
                  disabled={loginMutation.isPending || tokenLoginMutation.isPending || googleLoginPending}
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
                    onClick={googleLoginPending ? () => setShowTokenDialog(true) : handleGoogleLogin}
                    disabled={loginMutation.isPending || tokenLoginMutation.isPending}
                    className="w-full border-border dark:border-white/20 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/10 h-12"
                  >
                    {googleLoginPending || tokenLoginMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Chrome className="mr-2 h-5 w-5" />
                    )}
                    {googleLoginPending ? "Завершити вхід вручну..." : tokenLoginMutation.isPending ? "Вхід..." : "Увійти через Google"}
                  </Button>
                  
                  {googleLoginPending && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-muted-foreground dark:text-white/40 text-xs"
                    >
                      Завершіть вхід у спливаючому вікні, потім закрийте його
                    </motion.p>
                  )}
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
