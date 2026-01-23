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
import { BookOpen, Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

const teacherSchema = z.object({
  first_name: z.string().min(1, "Ім'я обов'язкове"),
  middle_name: z.string().min(1, "По батькові обов'язкове"),
  last_name: z.string().min(1, "Прізвище обов'язкове"),
  edbo_id: z.number().min(1, "EDBO ID обов'язковий"),
  date_of_birth: z.string().min(1, "Дата народження обов'язкова"),
  role: z.literal("teachers"),
  disciplines: z.array(z.string()).min(1, "Додайте хоча б одну дисципліну"),
  specialities: z.array(z.string()).min(1, "Додайте хоча б одну спеціальність"),
  scopes: z.array(z.string()).default(["teacher"]),
  acc_date: z.string(),
  password: z.string().min(6, "Пароль має бути мінімум 6 символів"),
});

export default function Teachers() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      edbo_id: 0,
      date_of_birth: "",
      role: "teachers",
      disciplines: [""],
      specialities: [""],
      scopes: ["teacher"],
      acc_date: new Date().toISOString(),
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof teacherSchema>) => {
      try {
        console.log("[Teachers] Creating teacher:", data);
        
        const result = await apiFetch("/api/v1/teachers", {
          method: "POST",
          body: JSON.stringify(data),
        });
        
        console.log("[Teachers] Teacher created successfully");
        return result;
      } catch (error: any) {
        console.error("[Teachers] Create mutation error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Успіх",
        description: "Викладача успішно створено",
      });
      form.reset({
        disciplines: [""],
        specialities: [""],
        role: "teachers",
        scopes: ["teacher"],
        acc_date: new Date().toISOString(),
      } as any);
    },
    onError: (error: any) => {
      console.error("[Teachers] Mutation onError:", error);
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Не вдалося створити викладача",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof teacherSchema>) => {
    // Filter out empty strings
    const cleanedData = {
      ...data,
      disciplines: data.disciplines.filter((d) => d.trim() !== ""),
      specialities: data.specialities.filter((s) => s.trim() !== ""),
    };
    createMutation.mutate(cleanedData);
  };

  const disciplines = form.watch("disciplines");
  const specialities = form.watch("specialities");

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
                <BookOpen className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Створення викладача</CardTitle>
              </div>
              <CardDescription>Додайте нового викладача до системи</CardDescription>
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

                  {/* Disciplines */}
                  <div className="space-y-2">
                    <FormLabel>Дисципліни *</FormLabel>
                    {disciplines.map((_, index) => (
                      <div key={index} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`disciplines.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} placeholder={`Дисципліна ${index + 1}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {disciplines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newDisciplines = disciplines.filter((_, i) => i !== index);
                              form.setValue("disciplines", newDisciplines);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.setValue("disciplines", [...disciplines, ""]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Додати дисципліну
                    </Button>
                  </div>

                  {/* Specialities */}
                  <div className="space-y-2">
                    <FormLabel>Спеціальності *</FormLabel>
                    {specialities.map((_, index) => (
                      <div key={index} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`specialities.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} placeholder={`Спеціальність ${index + 1}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {specialities.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newSpecialities = specialities.filter((_, i) => i !== index);
                              form.setValue("specialities", newSpecialities);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.setValue("specialities", [...specialities, ""]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Додати спеціальність
                    </Button>
                  </div>

                  <Button type="submit" disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <BookOpen className="w-4 h-4 mr-2" />
                    )}
                    Створити викладача
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