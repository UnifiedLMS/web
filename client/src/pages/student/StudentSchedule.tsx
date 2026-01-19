import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, 
  Clock, MapPin, User, BookOpen, FileText, CheckCircle, Loader2 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { StudentLayout } from "@/components/StudentLayout";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { uk } from "date-fns/locale";
import { useLocation } from "wouter";

interface LessonEvent {
  startAt: string;
  endAt: string;
}

interface Teacher {
  first_name: string;
  middle_name: string;
  last_name: string;
}

interface Lesson {
  position: number;
  subject: string;
  homework: string;
  topic: string;
  grade: string;
  date: string;
  classroom: string;
  teacher: Teacher;
  event?: LessonEvent;
}

export default function StudentSchedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [location] = useLocation();

  // Fetch schedule
  const { data: schedule, isLoading, error } = useQuery<Lesson[]>({
    queryKey: ["student-schedule"],
    queryFn: () => apiFetch<Lesson[]>("/api/v1/schedule/me"),
    staleTime: 5 * 60 * 1000,
  });

  const normalizeHomework = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "homework") return "";
    return trimmed;
  };

  const getLessonDateKey = (lesson: Lesson) => {
    let dateKey = lesson.date;
    if (lesson.event?.startAt) {
      const parsed = new Date(lesson.event.startAt);
      if (!isNaN(parsed.getTime())) {
        dateKey = format(parsed, "dd-MM-yyyy");
      }
    }
    return dateKey;
  };

  // Group lessons by date
  const lessonsByDate = useMemo(() => {
    if (!schedule) return {};
    
    const grouped: Record<string, Lesson[]> = {};
    schedule.forEach(lesson => {
      // Extract date from event.startAt or use date field
      const dateKey = getLessonDateKey(lesson);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(lesson);
    });

    // Sort lessons by position within each day
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [schedule]);

  useEffect(() => {
    if (!schedule) return;
    const searchIndex = location.indexOf("?");
    if (searchIndex === -1) return;

    const params = new URLSearchParams(location.slice(searchIndex + 1));
    const dateParam = params.get("date");
    const subjectParam = params.get("subject");
    if (!dateParam && !subjectParam) return;

    if (dateParam) {
      const [day, month, year] = dateParam.split("-").map(Number);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
          setCurrentMonth(parsed);
        }
      }
    }

    if (subjectParam) {
      const normalizedSubject = subjectParam.trim();
      if (!normalizedSubject) return;
      const matchedLesson = schedule.find(lesson => {
        const dateMatches = dateParam ? getLessonDateKey(lesson) === dateParam : true;
        return dateMatches && lesson.subject === normalizedSubject;
      });
      if (matchedLesson) {
        setSelectedLesson(matchedLesson);
      }
    }
  }, [schedule, location]);

  // Get lessons for selected date
  const selectedDateLessons = useMemo(() => {
    const dateKey = format(selectedDate, "dd-MM-yyyy");
    return lessonsByDate[dateKey] || [];
  }, [lessonsByDate, selectedDate]);

  // Get dates that have lessons for calendar highlighting
  const datesWithLessons = useMemo(() => {
    return Object.keys(lessonsByDate).map(dateStr => {
      const [day, month, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    });
  }, [lessonsByDate]);

  const sortedLessonDates = useMemo(() => {
    return Object.keys(lessonsByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split("-").map(Number);
      const [dayB, monthB, yearB] = b.split("-").map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });
  }, [lessonsByDate]);

  const formatTime = (lesson: Lesson) => {
    if (lesson.event?.startAt && lesson.event?.endAt) {
      const start = new Date(lesson.event.startAt);
      const end = new Date(lesson.event.endAt);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
      }
    }
    // Fallback times based on position
    const times: Record<number, string> = {
      1: "08:00-09:20",
      2: "09:30-10:50",
      3: "11:20-12:40",
      4: "12:50-14:10",
      5: "14:20-15:40",
      6: "15:50-17:10",
      7: "17:20-18:40",
      8: "18:50-20:10",
    };
    return times[lesson.position] || "—";
  };

  const getTeacherName = (teacher: Teacher) => {
    return `${teacher.last_name} ${teacher.first_name?.[0] || ""}.${teacher.middle_name?.[0] || ""}.`;
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Розклад</h1>
              <p className="text-muted-foreground">Перегляд розкладу занять</p>
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
              {/* Calendar / Date Selection */}
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
                    }}
                    modifiersStyles={{
                      hasLessons: {
                        fontWeight: "bold",
                        textDecoration: "underline",
                        textUnderlineOffset: "4px",
                      },
                    }}
                    className="rounded-md border-0"
                  />
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Вибраний день</span>
                    <div className="w-3 h-0.5 bg-foreground ml-4" />
                    <span>Є заняття</span>
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
                              key={`${lesson.position}-${lesson.subject}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                              {(() => {
                                const homeworkText = normalizeHomework(lesson.homework);
                                return (
                              <Card
                                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
                                onClick={() => setSelectedLesson(lesson)}
                              >
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
                                        {lesson.grade && (
                                          <Badge variant="outline" className="shrink-0">
                                            {lesson.grade}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatTime(lesson)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {getTeacherName(lesson.teacher)}
                                        </span>
                                        {lesson.classroom && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {lesson.classroom}
                                          </span>
                                        )}
                                      </div>
                                      {homeworkText && (
                                        <div className="mt-2 flex items-center gap-1 text-sm">
                                          <FileText className="w-3 h-3 text-amber-500" />
                                          <span className="text-amber-600 dark:text-amber-400">Є домашнє завдання</span>
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
                                key={`${dateKey}-${lesson.position}-${lesson.subject}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                              >
                                {(() => {
                                  const homeworkText = normalizeHomework(lesson.homework);
                                  return (
                                <Card
                                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
                                  onClick={() => setSelectedLesson(lesson)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-primary font-bold">{lesson.position}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-semibold truncate">{lesson.subject}</h4>
                                          {lesson.grade && (
                                            <Badge variant="outline" className="shrink-0">
                                              {lesson.grade}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(lesson)}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {getTeacherName(lesson.teacher)}
                                          </span>
                                          {lesson.classroom && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              {lesson.classroom}
                                            </span>
                                          )}
                                        </div>
                                        {homeworkText && (
                                          <div className="mt-2 flex items-center gap-1 text-sm">
                                            <FileText className="w-3 h-3 text-amber-500" />
                                            <span className="text-amber-600 dark:text-amber-400">Є домашнє завдання</span>
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

        {/* Lesson Detail Dialog */}
        <Dialog open={!!selectedLesson} onOpenChange={() => setSelectedLesson(null)}>
          <DialogContent className="max-w-lg">
            {selectedLesson && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">{selectedLesson.position}</span>
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedLesson.subject}</DialogTitle>
                      <p className="text-sm text-muted-foreground">{formatTime(selectedLesson)}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Teacher */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Викладач</div>
                      <div className="font-medium">
                        {`${selectedLesson.teacher.last_name} ${selectedLesson.teacher.first_name} ${selectedLesson.teacher.middle_name}`}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedLesson.classroom && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Аудиторія</div>
                        <div className="font-medium">{selectedLesson.classroom}</div>
                      </div>
                    </div>
                  )}

                  {/* Topic */}
                  {selectedLesson.topic && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <BookOpen className="w-4 h-4" />
                        Тема заняття
                      </div>
                      <p>{selectedLesson.topic}</p>
                    </div>
                  )}

                  {/* Homework */}
                  {(() => {
                    const homeworkText = normalizeHomework(selectedLesson.homework);
                    if (!homeworkText) return null;
                    return (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-1">
                        <FileText className="w-4 h-4" />
                        Домашнє завдання
                      </div>
                      <p>{homeworkText}</p>
                    </div>
                    );
                  })()}

                  {/* Grade */}
                  {selectedLesson.grade && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">Оцінка за заняття</div>
                        <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{selectedLesson.grade}</div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
