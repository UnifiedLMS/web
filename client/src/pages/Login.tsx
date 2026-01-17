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
import unifiedLogo from "@assets/unified_logo_1768624517472.png";
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
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md px-4 z-10"
      >
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="flex flex-col items-center mb-8">
              <motion.img
                src={unifiedLogo}
                alt="Unified Logo"
                className="h-20 w-auto mb-4 drop-shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Unified</h1>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Код ЄДЕБО</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Введіть код" 
                          {...field} 
                          autoComplete="username"
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:bg-black/30 transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Пароль</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Введіть пароль"
                            {...field}
                            autoComplete="current-password"
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:bg-black/30 transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none"
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
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-[#00aaff] hover:bg-[#0099e6] text-white font-semibold h-12 mt-2 shadow-[0_0_20px_rgba(0,170,255,0.3)] hover:shadow-[0_0_30px_rgba(0,170,255,0.5)] transition-all duration-300"
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
          </CardContent>
        </Card>
        
        <p className="text-center text-white/30 text-xs mt-8">
          &copy; {new Date().getFullYear()} Unified
        </p>
      </motion.div>
    </div>
  );
}
