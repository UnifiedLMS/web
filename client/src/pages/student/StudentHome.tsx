import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Settings } from "lucide-react";
import { StudentLayout } from "@/components/StudentLayout";

export default function StudentHome() {
  const features = [
    {
      title: "Мої предмети",
      description: "Переглядайте ваші дисципліни, оцінки та середній бал",
      icon: BookOpen,
      link: "/student/lessons",
    },
    {
      title: "Розклад",
      description: "Перегляд розкладу занять по дням та місяцям",
      icon: Calendar,
      link: "/student/schedule",
    },
    {
      title: "Налаштування",
      description: "Змініть email, пароль та інші параметри",
      icon: Settings,
      link: "/student/settings",
    },
  ];

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Вітаємо!</h1>
          <p className="text-lg text-muted-foreground">
            Оберіть функцію для роботи з системою
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.link}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: "easeInOut" }}
              whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.3, ease: "easeInOut" } }}
            >
              <Card className="h-full hover:shadow-xl dark:hover:shadow-primary/5 transition-all duration-300 border-border/50 dark:border-border hover:border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-primary/10 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.link}>
                    <Button className="w-full">Відкрити</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
}
