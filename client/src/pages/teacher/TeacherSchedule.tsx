import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, 
  Clock, MapPin, BookOpen, FileText, Edit, Loader2, Users, Save
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TeacherLayout } from "@/components/TeacherLayout";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { uk } from "date-fns/locale";

interface LessonEvent {
  startAt: string;
  endAt: string;
}

interface Teacher {
  first_name: string;
  middle_name: string;
  last_name: string;
}

interface Group {
  en: string;
  ua: string;
}

interface TeacherLesson {
  position: number;
  subject: string;
  homework: string;
  topic: string;
  grade: string;
  date: string;
  classroom: string;
  lesson_id: string;
  teacher: Teacher;
  group: Group;
  event?: LessonEvent;
}

const lessonEditSchema = z.object({
  topic: z.string().optional(),
  homework: z.string().optional(),
});

export default function TeacherSchedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedLesson, setSelectedLesson] = useState<TeacherLesson | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const normalizeHomework = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "homework") return "";
    return trimmed;
  };

  const editForm = useForm<z.infer<typeof lessonEditSchema>>({
    resolver: zodResolver(lessonEditSchema),
    defaultValues: { topic: "", homework: "" },
  });

  // Fetch schedule
  const { data: schedule, isLoading, error } = useQuery<TeacherLesson[]>({
    queryKey: ["teacher-schedule"],
    queryFn: () => apiFetch<TeacherLesson[]>("/api/v1/schedule/me"),
    staleTime: 5 * 60 * 1000,
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async ({ groupEn, lessonId, data }: { groupEn: string; lessonId: string; data: z.infer<typeof lessonEditSchema> }) => {
      return apiFetch(`/api/v1/schedule/${groupEn}/${lessonId}/revision`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Заняття оновлено" });
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule"] });
      setIsEditMode(false);
      setSelectedLesson(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося оновити заняття" });
    },
  });

  // Group lessons by date
  const lessonsByDate = useMemo(() => {
    if (!schedule) return {};
    
    const grouped: Record<string, TeacherLesson[]> = {};
    schedule.forEach(lesson => {
      let dateKey = lesson.date;
      if (lesson.event?.startAt) {
        const parsed = new Date(lesson.event.startAt);
        if (!isNaN(parsed.getTime())) {
          dateKey = format(parsed, "dd-MM-yyyy");
        }
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(lesson);
    });

    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [schedule]);

  // Get lessons for selected date
  const selectedDateLessons = useMemo(() => {
    const dateKey = format(selectedDate, "dd-MM-yyyy");
    return lessonsByDate[dateKey] || [];
  }, [lessonsByDate, selectedDate]);

  // Get dates that have lessons
  const datesWithLessons = useMemo(() => {
    return Object.keys(lessonsByDate).map(dateStr => {
      const [day, month, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    });
  }, [lessonsByDate]);

  const lessonDaySet = useMemo(() => {
    return new Set(datesWithLessons.map(date => format(date, "yyyy-MM-dd")));
  }, [datesWithLessons]);

  const currentMonthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const daysWithoutLessons = useMemo(() => {
    return currentMonthDays.filter(day => !lessonDaySet.has(format(day, "yyyy-MM-dd")));
  }, [currentMonthDays, lessonDaySet]);

  const sortedLessonDates = useMemo(() => {
    return Object.keys(lessonsByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split("-").map(Number);
      const [dayB, monthB, yearB] = b.split("-").map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });
  }, [lessonsByDate]);

  const formatTime = (lesson: TeacherLesson) => {
    if (lesson.event?.startAt && lesson.event?.endAt) {
      const start = new Date(lesson.event.startAt);
      const end = new Date(lesson.event.endAt);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
      }
    }
    const times: Record<number, string> = {
      1: "08:00-09:20", 2: "09:30-10:50", 3: "11:20-12:40", 4: "12:50-14:10",
      5: "14:20-15:40", 6: "15:50-17:10", 7: "17:20-18:40", 8: "18:50-20:10",
    };
    return times[lesson.position] || "—";
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const openEditDialog = (lesson: TeacherLesson) => {
    setSelectedLesson(lesson);
    editForm.reset({
      topic: lesson.topic || "",
      homework: normalizeHomework(lesson.homework),
    });
    setIsEditMode(true);
  };

  const handleSaveLesson = (data: z.infer<typeof lessonEditSchema>) => {
    if (!selectedLesson) return;
    const normalizedHomework = normalizeHomework(data.homework);
    updateLessonMutation.mutate({
      groupEn: selectedLesson.group.en,
      lessonId: selectedLesson.lesson_id,
      data: {
        ...data,
        homework: normalizedHomework || undefined,
      },
    });
  };

  return (
    <TeacherLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Розклад</h1>
              <p className="text-muted-foreground">Перегляд та редагування занять</p>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Календар
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="w-4 h-4" />
                  Список
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Завантаження розкладу...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-destructive">
              Помилка завантаження розкладу
            </div>
          ) : viewMode === "calendar" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle className="text-lg">
                      {format(currentMonth, "LLLL yyyy", { locale: uk })}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    locale={uk}
                    modifiers={{
                      hasLessons: datesWithLessons,
                      noLessons: daysWithoutLessons,
                    }}
                    modifiersClassNames={{
                      hasLessons: "bg-primary/10 text-primary font-semibold",
                      noLessons: "bg-muted/40 text-muted-foreground",
                    }}
                    className="rounded-md border-0"
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span>Вибраний день</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-md bg-primary/10 border border-primary/30" />
                      <span>Є заняття</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-md bg-muted/40 border border-border" />
                      <span>Немає занять</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lessons List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {format(selectedDate, "d MMMM yyyy", { locale: uk })}
                    {isToday(selectedDate) && (
                      <Badge variant="secondary" className="ml-2">Сьогодні</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {selectedDateLessons.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>На цей день занять немає</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {selectedDateLessons.map((lesson, index) => (
                            <motion.div
                              key={`${lesson.position}-${lesson.subject}-${lesson.group.en}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2, delay: index * 0.05, ease: "easeInOut" }}
                            >
                              {(() => {
                                const homeworkText = normalizeHomework(lesson.homework);
                                return (
                              <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    {/* Lesson Number */}
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-primary font-bold">{lesson.position}</span>
                                    </div>

                                    {/* Lesson Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-semibold truncate">{lesson.subject}</h4>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => openEditDialog(lesson)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Редагувати
                                        </Button>
                                      </div>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatTime(lesson)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          {lesson.group.ua}
                                        </span>
                                        {lesson.classroom && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {lesson.classroom}
                                          </span>
                                        )}
                                      </div>
                                      {lesson.topic && (
                                        <div className="mt-2 flex items-start gap-1 text-sm">
                                          <BookOpen className="w-3 h-3 mt-0.5 text-primary" />
                                          <span className="text-muted-foreground">{lesson.topic}</span>
                                        </div>
                                      )}
                                      {homeworkText && (
                                        <div className="mt-1 flex items-start gap-1 text-sm">
                                          <FileText className="w-3 h-3 mt-0.5 text-primary" />
                                          <span className="text-primary">{homeworkText}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                                );
                              })()}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="w-5 h-5" />
                  Усі заняття
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {sortedLessonDates.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Немає занять у розкладі</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sortedLessonDates.map(dateKey => {
                        const [day, month, year] = dateKey.split("-").map(Number);
                        const date = new Date(year, month - 1, day);
                        const lessons = lessonsByDate[dateKey] || [];

                        return (
                          <div key={dateKey} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{format(date, "d MMMM yyyy", { locale: uk })}</span>
                              {isToday(date) && (
                                <Badge variant="secondary">Сьогодні</Badge>
                              )}
                            </div>
                            {lessons.map((lesson, index) => (
                              <motion.div
                                key={`${dateKey}-${lesson.position}-${lesson.subject}-${lesson.group.en}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03, ease: "easeInOut" }}
                              >
                                {(() => {
                                  const homeworkText = normalizeHomework(lesson.homework);
                                  return (
                                <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-primary font-bold">{lesson.position}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-semibold truncate">{lesson.subject}</h4>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => openEditDialog(lesson)}
                                          >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Редагувати
                                          </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(lesson)}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {lesson.group.ua}
                                          </span>
                                          {lesson.classroom && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              {lesson.classroom}
                                            </span>
                                          )}
                                        </div>
                                        {lesson.topic && (
                                          <div className="mt-2 flex items-start gap-1 text-sm">
                                            <BookOpen className="w-3 h-3 mt-0.5 text-primary" />
                                            <span className="text-muted-foreground">{lesson.topic}</span>
                                          </div>
                                        )}
                                        {homeworkText && (
                                          <div className="mt-1 flex items-start gap-1 text-sm">
                                            <FileText className="w-3 h-3 mt-0.5 text-primary" />
                                            <span className="text-primary">{homeworkText}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                  );
                                })()}
                              </motion.div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Edit Lesson Dialog */}
        <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
          <DialogContent className="max-w-lg">
            {selectedLesson && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Редагування заняття
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Lesson Info */}
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{selectedLesson.subject}</span>
                      <Badge>{selectedLesson.position} пара</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {selectedLesson.group.ua}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(selectedLesson)}
                      </span>
                    </div>
                  </div>

                  {/* Edit Form */}
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleSaveLesson)} className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="topic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              Тема заняття
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Введіть тему заняття..." 
                                className="resize-none"
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="homework"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Домашнє завдання
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Введіть домашнє завдання..." 
                                className="resize-none"
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
                          Скасувати
                        </Button>
                        <Button type="submit" disabled={updateLessonMutation.isPending}>
                          {updateLessonMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Зберегти
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TeacherLayout>
  );
}
