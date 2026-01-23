import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

const studentSchema = z.object({
  first_name: z.string().min(1, "Ім'я обов'язкове"),
  middle_name: z.string().min(1, "По батькові обов'язкове"),
  last_name: z.string().min(1, "Прізвище обов'язкове"),
  edbo_id: z.number().min(1, "EDBO ID обов'язковий"),
  date_of_birth: z.string().min(1, "Дата народження обов'язкова"),
  role: z.literal("students"),
  speciality: z.string().min(1, "Спеціальність обов'язкова"),
  degree: z.string().min(1, "Ступінь обов'язкова"),
  course: z.number().min(1).max(6, "Курс має бути від 1 до 6"),
  group: z.object({
    en: z.string().min(1, "Група обов'язкова"),
  }),
  start_of_study: z.string().min(1, "Дата початку навчання обов'язкова"),
  complete_of_study: z.string().min(1, "Дата закінчення навчання обов'язкова"),
  class_teacher_edbo: z.number().optional(),
  scopes: z.array(z.string()).default(["student"]),
  acc_date: z.string(),
  password: z.string().min(6, "Пароль має бути мінімум 6 символів"),
});

export default function Students() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      edbo_id: 0,
      date_of_birth: "",
      role: "students",
      speciality: "",
      degree: "",
      course: 1,
      group: {
        en: "",
      },
      start_of_study: "",
      complete_of_study: "",
      class_teacher_edbo: 0,
      scopes: ["student"],
      acc_date: new Date().toISOString(),
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof studentSchema>) => {
      try {
        console.log("[Students] Creating student:", data);
        
        const result = await apiFetch("/api/v1/students", {
          method: "POST",
          body: JSON.stringify(data),
        });
        
        console.log("[Students] Student created successfully");
        return result;
      } catch (error: any) {
        console.error("[Students] Create mutation error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Успіх",
        description: "Студента успішно створено",
      });
      form.reset();
    },
    onError: (error: any) => {
      console.error("[Students] Mutation onError:", error);
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Не вдалося створити студента",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof studentSchema>) => {
    createMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Створення студента</CardTitle>
              </div>
              <CardDescription>Додайте нового студента до системи</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ім'я *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middle_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>По батькові *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Прізвище *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="edbo_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EDBO ID *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата народження *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="speciality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Спеціальність *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="degree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ступінь *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Курс *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={6}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="group.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Група (EN) *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="start_of_study"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Початок навчання *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="complete_of_study"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Закінчення навчання *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="class_teacher_edbo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EDBO ID класного керівника</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль *</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <GraduationCap className="w-4 h-4 mr-2" />
                    )}
                    Створити студента
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}