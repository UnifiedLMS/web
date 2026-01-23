import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema } from "@shared/schema";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BackgroundAnimation } from "@/components/background-animation";
import unifiedLogo from "@assets/unified_logo.png";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const loginMutation = useLogin();

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

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative">
      <BackgroundAnimation />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full max-w-md px-4 z-10"
      >
        <Card className="bg-white/[0.07] backdrop-blur-xl border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
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
                <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-4">Unified</h1>
                <p className="text-white/40 text-sm mt-1">Система управління</p>
              </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm font-medium">Код ЄДЕБО</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Введіть код" 
                          {...field} 
                          autoComplete="username"
                          className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 focus:bg-white/[0.08] focus:border-primary/50 transition-all h-11"
                        />
                      </FormControl>
                      <FormMessage className="text-primary" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm font-medium">Пароль</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Введіть пароль"
                            {...field}
                            autoComplete="current-password"
                            className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 focus:bg-white/[0.08] focus:border-primary/50 transition-all pr-10 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors focus:outline-none"
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
                      <FormMessage className="text-primary" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 mt-3 glow-primary transition-all duration-300"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Вхід"
                  )}
                </Button>
              </form>
            </Form>
            </motion.div>
          </CardContent>
        </Card>
        
        <p className="text-center text-white/25 text-xs mt-8">
          &copy; {new Date().getFullYear()} Unified · Система управління навчанням
        </p>
      </motion.div>
    </div>
  );
}
