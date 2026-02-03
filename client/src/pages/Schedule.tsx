import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTokenFromCookie } from "@/lib/cookieUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, 
  Clock, MapPin, BookOpen, FileText, Edit, Loader2, Users, Save,
  Plus, Trash2, GraduationCap, Search, Download, Upload
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { downloadWorksheet, readWorksheetFromFile, type WorksheetRows } from "@/lib/excel";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { uk } from "date-fns/locale";

// Types
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

interface Lesson {
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

interface GroupDetail {
  degree: string;
  course: number;
  group: {
    en: string;
    ua: string;
  };
  specialty: string;
  disciplines: Record<string, number>;
  class_teacher_edbo: number;
}

interface GroupsApiResponse {
  skilled_worker?: GroupDetail[];
  bachelor?: GroupDetail[];
  junior_specialist?: GroupDetail[];
  master?: GroupDetail[];
}

interface StudentInfo {
  first_name: string;
  middle_name: string;
  last_name: string;
}

interface StudentAssessment {
  edbo_id: number;
  student: StudentInfo;
  discipline: Record<string, Record<string, number>>;
}

// Schemas
const lessonEditSchema = z.object({
  topic: z.string().optional(),
  homework: z.string().optional(),
});

const lessonCreateSchema = z.object({
  subject: z.string().min(1, "Введіть назву предмету"),
  position: z.coerce.number().min(1).max(8),
  classroom: z.string().optional(),
  date: z.string().min(1, "Оберіть дату"),
  topic: z.string().optional(),
  homework: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export default function Schedule() {
  const GRADE_SYSTEM = "12-point" as const;
  const MAX_GRADE = 12;

  // State for schedule view
  const [selectedGroupEn, setSelectedGroupEn] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<Lesson | null>(null);

  // State for grades tab
  const [gradesGroupEn, setGradesGroupEn] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGrades, setEditingGrades] = useState<Record<string, string>>({});
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Main tab state
  const [mainTab, setMainTab] = useState<"schedule" | "grades">("schedule");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const normalizeHomework = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "homework") return "";
    return trimmed;
  };

  const normalizeTopic = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const lower = trimmed.toLowerCase();
    if (lower === "topic" || lower === "lesson" || lower === "—" || lower === "homework") return "";
    return trimmed;
  };

  // Forms
  const editForm = useForm<z.infer<typeof lessonEditSchema>>({
    resolver: zodResolver(lessonEditSchema),
    defaultValues: { topic: "", homework: "" },
  });

  const createForm = useForm<z.infer<typeof lessonCreateSchema>>({
    resolver: zodResolver(lessonCreateSchema),
    defaultValues: {
      subject: "",
      position: 1,
      classroom: "",
      date: format(new Date(), "dd-MM-yyyy"),
      topic: "",
      homework: "",
      startTime: "",
      endTime: "",
    },
  });

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<GroupDetail[]>({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const response = await apiFetch<GroupsApiResponse>("/api/v1/groups/all");
      const allGroups: GroupDetail[] = [];
      if (response.skilled_worker) allGroups.push(...response.skilled_worker);
      if (response.bachelor) allGroups.push(...response.bachelor);
      if (response.junior_specialist) allGroups.push(...response.junior_specialist);
      if (response.master) allGroups.push(...response.master);
      return allGroups;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch schedule for selected group
  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useQuery<Lesson[]>({
    queryKey: ["admin-schedule", selectedGroupEn],
    queryFn: () => apiFetch<Lesson[]>(`/api/v1/schedule/${selectedGroupEn}`),
    enabled: !!selectedGroupEn,
    staleTime: 5 * 60 * 1000,
  });

  // Get disciplines for selected group
  const selectedGroup = groups?.find(g => g.group.en === selectedGroupEn);
  const gradesGroup = groups?.find(g => g.group.en === gradesGroupEn);
  const disciplines = useMemo(() => {
    if (!gradesGroup?.disciplines) return [];
    return Object.keys(gradesGroup.disciplines);
  }, [gradesGroup]);

  // Fetch student assessments
  const { data: assessments, isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery<StudentAssessment[]>({
    queryKey: ["admin-assessments", gradesGroupEn, selectedDiscipline],
    queryFn: async () => {
      const normalizedDiscipline = selectedDiscipline.replace(/^"+|"+$/g, "");
      try {
        const data = await apiFetch<StudentAssessment[]>(
          `/api/v1/students/${gradesGroupEn}/assesment/all`,
          {
            method: "POST",
            body: JSON.stringify(normalizedDiscipline),
          }
        );
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("[Schedule] Assessment fetch error:", error);
        return [];
      }
    },
    enabled: !!gradesGroupEn && !!selectedDiscipline,
    staleTime: 2 * 60 * 1000,
  });

  // Mutations
  const updateLessonMutation = useMutation({
    mutationFn: async ({ groupEn, lessonId, data }: { groupEn: string; lessonId: string; data: z.infer<typeof lessonEditSchema> }) => {
      return apiFetch(`/api/v1/schedule/${groupEn}/${lessonId}/revision`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Заняття оновлено" });
      queryClient.invalidateQueries({ queryKey: ["admin-schedule", selectedGroupEn] });
      setIsEditMode(false);
      setSelectedLesson(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося оновити заняття" });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: z.infer<typeof lessonCreateSchema>) => {
      const group = groups?.find(g => g.group.en === selectedGroupEn);
      if (!group) throw new Error("Групу не знайдено");

      // Build event object if times are provided
      let event: { startAt: string; endAt: string } | undefined;
      if (data.startTime && data.endTime && data.date) {
        const [day, month, year] = data.date.split("-").map(Number);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        event = {
          startAt: `${dateStr}T${data.startTime}:00.000Z`,
          endAt: `${dateStr}T${data.endTime}:00.000Z`,
        };
      }

      const payload = {
        subject: data.subject,
        position: data.position,
        classroom: data.classroom || "moodle",
        event,
        date: data.date,
        topic: data.topic || "",
        homework: data.homework || "",
        group: {
          en: group.group.en,
          ua: group.group.ua,
        },
      };

      return apiFetch("/api/v1/schedule", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Заняття створено" });
      queryClient.invalidateQueries({ queryKey: ["admin-schedule", selectedGroupEn] });
      setIsCreateMode(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося створити заняття" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async ({ groupEn, lessonId }: { groupEn: string; lessonId: string }) => {
      return apiFetch(`/api/v1/schedule/${groupEn}/${lessonId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Заняття видалено" });
      queryClient.invalidateQueries({ queryKey: ["admin-schedule", selectedGroupEn] });
      setDeleteConfirmLesson(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося видалити заняття" });
    },
  });

  const submitGradeMutation = useMutation({
    mutationFn: async (data: { edbo_id: number; subject: string; grade_system: string; grade: number; date: string }) => {
      return apiFetch(`/api/v1/students/${data.edbo_id}/assessment`, {
        method: "PATCH",
        body: JSON.stringify({
          subject: data.subject,
          grade_system: data.grade_system,
          grade: data.grade,
          date: data.date,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Успіх", description: "Оцінку виставлено" });
      refetchAssessments();
      setSavingCellKey(null);
    },
    onError: (error: any) => {
      setSavingCellKey(null);
      toast({ variant: "destructive", title: "Помилка", description: error.message || "Не вдалося виставити оцінку" });
    },
  });

  // Memos for schedule
  const lessonsByDate = useMemo(() => {
    if (!schedule) return {};
    
    const grouped: Record<string, Lesson[]> = {};
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

  const selectedDateLessons = useMemo(() => {
    const dateKey = format(selectedDate, "dd-MM-yyyy");
    return lessonsByDate[dateKey] || [];
  }, [lessonsByDate, selectedDate]);

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

  // Memos for grades
  const allDates = useMemo(() => {
    if (!assessments || !selectedDiscipline) return [];
    
    const dateSet = new Set<string>();
    assessments.forEach(student => {
      const disciplineGrades = student.discipline?.[selectedDiscipline];
      if (disciplineGrades) {
        Object.keys(disciplineGrades).forEach(date => dateSet.add(date));
      }
    });
    
    return Array.from(dateSet).sort((a, b) => {
      const parseDate = (d: string) => {
        const [day, month, year] = d.split("-").map(Number);
        return new Date(year, month - 1, day);
      };
      return parseDate(a).getTime() - parseDate(b).getTime();
    });
  }, [assessments, selectedDiscipline]);

  const filteredStudents = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(student => {
      const fullName = `${student.student.last_name} ${student.student.first_name} ${student.student.middle_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [assessments, searchQuery]);

  // Handlers
  const formatTime = (lesson: Lesson) => {
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



  const openEditDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    editForm.reset({
      topic: lesson.topic || "",
      homework: normalizeHomework(lesson.homework),
    });
    setIsEditMode(true);
  };

  const openCreateDialog = () => {
    createForm.reset({
      subject: "",
      position: 1,
      classroom: "",
      date: format(selectedDate, "dd-MM-yyyy"),
      topic: "",
      homework: "",
      startTime: "",
      endTime: "",
    });
    setIsCreateMode(true);
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

  const handleCreateLesson = (data: z.infer<typeof lessonCreateSchema>) => {
    createLessonMutation.mutate(data);
  };

  const handleDeleteLesson = () => {
    if (!deleteConfirmLesson) return;
    deleteLessonMutation.mutate({
      groupEn: deleteConfirmLesson.group.en,
      lessonId: deleteConfirmLesson.lesson_id,
    });
  };

  const clearEditingGrade = useCallback((key: string) => {
    setEditingGrades(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleCellSubmit = useCallback((student: StudentAssessment, date: string, rawValue: string) => {
    if (!selectedDiscipline) return;

    const key = `${student.edbo_id}-${date}`;
    const trimmed = rawValue.trim();
    const currentGrade = student.discipline?.[selectedDiscipline]?.[date];

    if (!trimmed) {
      clearEditingGrade(key);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_GRADE) {
      toast({ variant: "destructive", title: "Помилка", description: `Оцінка має бути від 1 до ${MAX_GRADE}` });
      return;
    }

    if (parsed === currentGrade) {
      clearEditingGrade(key);
      return;
    }

    setSavingCellKey(key);
    submitGradeMutation.mutate({
      edbo_id: student.edbo_id,
      subject: selectedDiscipline,
      grade_system: GRADE_SYSTEM,
      grade: parsed,
      date,
    });
  }, [selectedDiscipline, submitGradeMutation, toast, clearEditingGrade]);

  const TEMPLATE_NAME = "UnifiedWeb Admin Grades";

  const handleExport = useCallback(() => {
    if (!gradesGroup || !selectedDiscipline) {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Оберіть групу та дисципліну",
      });
      return;
    }

    const dates = allDates.length > 0 ? allDates : ["DD-MM-YYYY"];
    const headerRow = ["EDBO ID", "Student", ...dates];
    const rows: WorksheetRows = [
      ["Template", TEMPLATE_NAME],
      ["Group", gradesGroup.group.en],
      ["Discipline", selectedDiscipline],
      ["Grade System", GRADE_SYSTEM],
      headerRow,
      ...(assessments || []).map((student) => {
        const fullName = `${student.student.last_name} ${student.student.first_name} ${student.student.middle_name}`;
        const grades = dates.map((date) => student.discipline?.[selectedDiscipline]?.[date] ?? "");
        return [student.edbo_id, fullName, ...grades];
      }),
    ];

    const safeDiscipline = selectedDiscipline.replace(/[\\/:*?"<>|]/g, "-");
    downloadWorksheet(rows, `Admin_Grades_${gradesGroup.group.en}_${safeDiscipline}.xlsx`, "Grades");
  }, [assessments, allDates, selectedDiscipline, gradesGroup, toast]);

  const handleImport = useCallback(async (file: File) => {
    if (!gradesGroup || !selectedDiscipline) {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Оберіть групу та дисципліну перед імпортом",
      });
      return;
    }

    setIsImporting(true);
    try {
      const rows = await readWorksheetFromFile(file);
      if (rows.length < 5) {
        throw new Error("Файл не відповідає шаблону");
      }

      if (rows[0]?.[0] !== "Template" || (rows[0]?.[1] !== TEMPLATE_NAME && rows[0]?.[1] !== "UnifiedWeb Teacher Grades")) {
        throw new Error("Неправильний шаблон файлу");
      }

      if (rows[1]?.[0] !== "Group" || String(rows[1]?.[1] ?? "") !== gradesGroup.group.en) {
        throw new Error("Файл не відповідає обраній групі");
      }

      if (rows[2]?.[0] !== "Discipline" || String(rows[2]?.[1] ?? "") !== selectedDiscipline) {
        throw new Error("Файл не відповідає обраній дисципліні");
      }

      if (rows[3]?.[0] !== "Grade System" || String(rows[3]?.[1] ?? "") !== GRADE_SYSTEM) {
        throw new Error("Неправильна шкала оцінювання");
      }

      const headerRow = rows[4];
      if (headerRow?.[0] !== "EDBO ID" || headerRow?.[1] !== "Student") {
        throw new Error("Неправильні заголовки таблиці");
      }

      const dateHeaders = headerRow.slice(2).map((cell) => String(cell ?? "").trim()).filter(Boolean);
      if (dateHeaders.length === 0) {
        throw new Error("У файлі відсутні колонки дат");
      }

      const normalizedDates = dateHeaders.map((dateValue) => {
        const str = String(dateValue).trim();
        if (/^\d{2}[-./]\d{2}[-./]\d{4}$/.test(str)) {
          return str.replace(/[./]/g, "-");
        }
        const serialNum = Number(str);
        if (!Number.isNaN(serialNum) && serialNum > 0 && serialNum < 100000) {
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + serialNum * 24 * 60 * 60 * 1000);
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
        return str;
      });
      
      const datePattern = /^\d{2}-\d{2}-\d{4}$/;
      if (normalizedDates.some((date) => !datePattern.test(date))) {
        throw new Error("Формат дат має бути ДД-ММ-РРРР");
      }

      const studentMap = new Map((assessments || []).map((student) => [student.edbo_id, student]));
      const submissions: { edbo_id: number; subject: string; grade_system: string; grade: number; date: string }[] = [];

      for (let rowIndex = 5; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        if (!row || row.length === 0) continue;

        const edboId = Number(row[0]);
        if (!edboId) continue;

        if (!studentMap.has(edboId)) {
          throw new Error(`EDBO ID ${edboId} не знайдено у поточній групі`);
        }

        normalizedDates.forEach((date, index) => {
          const cellValue = row[index + 2];
          if (cellValue === "" || cellValue === null || cellValue === undefined) {
            return;
          }

          const numericValue = Number(cellValue);
          if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > MAX_GRADE) {
            throw new Error(`Невалідна оцінка для EDBO ID ${edboId} (${date})`);
          }

          submissions.push({
            edbo_id: edboId,
            subject: selectedDiscipline,
            grade_system: GRADE_SYSTEM,
            grade: numericValue,
            date,
          });
        });
      }

      for (const submission of submissions) {
        await apiFetch(`/api/v1/students/${submission.edbo_id}/assessment`, {
          method: "PATCH",
          body: JSON.stringify({
            subject: submission.subject,
            grade_system: submission.grade_system,
            grade: submission.grade,
            date: submission.date,
          }),
        });
      }

      toast({
        title: "Успіх",
        description: "Оцінки успішно імпортовано",
      });

      refetchAssessments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Помилка імпорту",
        description: error?.message || "Не вдалося імпортувати файл",
      });
    } finally {
      setIsImporting(false);
    }
  }, [assessments, refetchAssessments, selectedDiscipline, gradesGroup, toast]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleImport(file);
    event.target.value = "";
  }, [handleImport]);

  const renderLessonCard = (lesson: Lesson, index: number, showDate = false) => {
    const homeworkText = normalizeHomework(lesson.homework);
    const topicText = normalizeTopic(lesson.topic);
    return (
      <motion.div
        key={`${lesson.position}-${lesson.subject}-${lesson.group.en}-${lesson.date}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, delay: index * 0.05, ease: "easeInOut" }}
      >
        <Card 
          className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
          onClick={() => openEditDialog(lesson)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">{lesson.position}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold truncate">{lesson.subject}</h4>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(lesson);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Редагувати
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmLesson(lesson);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
                  {lesson.teacher && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {lesson.teacher.last_name} {lesson.teacher.first_name?.[0]}.{lesson.teacher.middle_name?.[0]}.
                    </span>
                  )}
                </div>
                {topicText && (
                  <div className="mt-2 flex items-start gap-1 text-sm">
                    <BookOpen className="w-3 h-3 mt-0.5 text-primary" />
                    <span className="text-muted-foreground">{topicText}</span>
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
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Розклад та оцінювання</h1>
            <p className="text-muted-foreground">Управління розкладом занять та оцінками студентів</p>
          </div>

          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="schedule" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Розклад
              </TabsTrigger>
              <TabsTrigger value="grades" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Оцінки
              </TabsTrigger>
            </TabsList>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              {/* Group Selector */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    <div className="flex-1 space-y-2 w-full sm:w-auto">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Група
                      </label>
                      <Select value={selectedGroupEn} onValueChange={setSelectedGroupEn}>
                        <SelectTrigger className="w-full sm:w-[300px]">
                          <SelectValue placeholder="Оберіть групу" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupsLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : groups?.map((group) => (
                            <SelectItem key={group.group.en} value={group.group.en}>
                              <span className="font-medium">{group.group.ua}</span>
                              <span className="text-muted-foreground ml-2">
                                ({group.course} курс, {group.degree})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedGroupEn && (
                      <div className="flex gap-2">
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
                        <Button onClick={openCreateDialog} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Додати заняття
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Group Info Badge */}
              {selectedGroup && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedGroup.group.ua}</Badge>
                  <Badge variant="outline">{selectedGroup.specialty}</Badge>
                  <Badge variant="outline">{selectedGroup.course} курс</Badge>
                  <Badge variant="outline">{selectedGroup.degree}</Badge>
                </div>
              )}

              {/* Schedule Content */}
              {!selectedGroupEn ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Оберіть групу для перегляду розкладу</p>
                </div>
              ) : scheduleLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Завантаження розкладу...</p>
                </div>
              ) : scheduleError ? (
                <div className="text-center py-16 text-destructive">
                  Помилка завантаження розкладу
                </div>
              ) : viewMode === "calendar" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1">
                    <CardContent className="pt-6">
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
                      </div>
                    </CardContent>
                  </Card>

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
                            <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
                              <Plus className="w-4 h-4" />
                              Додати заняття
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <AnimatePresence>
                              {selectedDateLessons.map((lesson, index) => renderLessonCard(lesson, index))}
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
                          <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
                            <Plus className="w-4 h-4" />
                            Додати заняття
                          </Button>
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
                                {lessons.map((lesson, index) => renderLessonCard(lesson, index, true))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades" className="space-y-6">
              {/* Selectors */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Група
                      </label>
                      <Select value={gradesGroupEn} onValueChange={(v) => {
                        setGradesGroupEn(v);
                        setSelectedDiscipline("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Оберіть групу" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupsLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : groups?.map((group) => (
                            <SelectItem key={group.group.en} value={group.group.en}>
                              <span className="font-medium">{group.group.ua}</span>
                              <span className="text-muted-foreground ml-2">
                                ({group.course} курс, {group.degree})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Дисципліна
                      </label>
                      <Select 
                        value={selectedDiscipline} 
                        onValueChange={setSelectedDiscipline}
                        disabled={!gradesGroupEn}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Оберіть дисципліну" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplines.map((discipline) => (
                            <SelectItem key={discipline} value={discipline}>
                              {discipline}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedDiscipline && (
                    <div className="mt-4 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Пошук студента..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Group Info */}
              {gradesGroup && selectedDiscipline && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{gradesGroup.group.ua}</Badge>
                  <Badge variant="outline">{gradesGroup.specialty}</Badge>
                  <Badge variant="outline">{gradesGroup.course} курс</Badge>
                  <Badge variant="outline">{gradesGroup.degree}</Badge>
                  <Badge variant="secondary">{selectedDiscipline}</Badge>
                </div>
              )}

              {/* Grades Spreadsheet */}
              {selectedDiscipline ? (
                assessmentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Завантаження даних...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    {searchQuery ? "Студентів не знайдено" : "Немає даних для цієї групи"}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Журнал оцінок</CardTitle>
                      <CardDescription>
                        {filteredStudents.length} студентів • {allDates.length} дат
                      </CardDescription>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={handleExport}>
                          <Download className="w-4 h-4 mr-2" />
                          Експорт Excel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isImporting}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isImporting ? "Імпорт..." : "Імпорт Excel"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="w-full" style={{ maxWidth: "calc(100vw - 350px)" }}>
                        <div className="min-w-max">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="sticky left-0 z-10 bg-muted p-3 text-left font-medium border min-w-[250px]">
                                  Студент
                                </th>
                                {allDates.map(date => (
                                  <th key={date} className="p-3 text-center font-medium border min-w-[80px]">
                                    {date.substring(0, 5).replace("-", ".")}
                                  </th>
                                ))}
                                <th className="p-3 text-center font-medium border min-w-[100px]">
                                  Середній
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.map((student, index) => {
                                const studentGrades = student.discipline?.[selectedDiscipline] || {};
                                const gradeValues = Object.values(studentGrades);
                                const average = gradeValues.length > 0 
                                  ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(1)
                                  : "—";

                                return (
                                  <motion.tr
                                    key={student.edbo_id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02, duration: 0.2, ease: "easeInOut" }}
                                    className="hover:bg-muted/30"
                                  >
                                    <td className="sticky left-0 z-10 bg-background p-3 border font-medium">
                                      {`${student.student.last_name} ${student.student.first_name}`}
                                    </td>
                                    {allDates.map(date => {
                                      const grade = studentGrades[date];
                                      const percentage = grade ? (grade / MAX_GRADE) * 100 : 0;
                                      const colorClass = grade
                                        ? percentage >= 75 ? "text-primary"
                                        : percentage >= 50 ? "text-foreground"
                                        : "text-muted-foreground"
                                        : "text-muted-foreground";
                                      const cellKey = `${student.edbo_id}-${date}`;
                                      const displayValue = editingGrades[cellKey] ?? (grade ? String(grade) : "");
                                      
                                      return (
                                        <td key={date} className={`p-2 text-center border ${colorClass}`}>
                                          <Input
                                            type="number"
                                            min={1}
                                            max={MAX_GRADE}
                                            value={displayValue}
                                            onChange={(e) => {
                                              const nextValue = e.target.value;
                                              if (!nextValue) {
                                                setEditingGrades(prev => ({ ...prev, [cellKey]: "" }));
                                                return;
                                              }

                                              const nextNumber = Number(nextValue);
                                              if (!Number.isFinite(nextNumber)) {
                                                return;
                                              }

                                              if (nextNumber < 1 || nextNumber > MAX_GRADE) {
                                                return;
                                              }

                                              setEditingGrades(prev => ({
                                                ...prev,
                                                [cellKey]: nextValue,
                                              }));
                                            }}
                                            onBlur={(e) => handleCellSubmit(student, date, e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.currentTarget.blur();
                                              }
                                              if (e.key === "Escape") {
                                                clearEditingGrade(cellKey);
                                                e.currentTarget.blur();
                                              }
                                            }}
                                            placeholder="—"
                                            disabled={savingCellKey === cellKey}
                                            className="h-8 text-center"
                                          />
                                        </td>
                                      );
                                    })}
                                    <td className="p-3 text-center border font-bold">
                                      {average}
                                    </td>
                                  </motion.tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Оберіть групу та дисципліну для перегляду журналу</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
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

        {/* Create Lesson Dialog */}
        <Dialog open={isCreateMode} onOpenChange={setIsCreateMode}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Створення заняття
              </DialogTitle>
              <DialogDescription>
                Додайте нове заняття до розкладу групи {selectedGroup?.group.ua}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateLesson)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Предмет *</FormLabel>
                      <FormControl>
                        <Input placeholder="Назва предмету" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер пари *</FormLabel>
                        <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} пара</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="classroom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Аудиторія</FormLabel>
                        <FormControl>
                          <Input placeholder="moodle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата *</FormLabel>
                      <FormControl>
                        <Input placeholder="ДД-ММ-РРРР" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Початок (опціонально)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Кінець (опціонально)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тема (опціонально)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Тема заняття" className="resize-none" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="homework"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Домашнє завдання (опціонально)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Домашнє завдання" className="resize-none" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateMode(false)}>
                    Скасувати
                  </Button>
                  <Button type="submit" disabled={createLessonMutation.isPending}>
                    {createLessonMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Створити
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmLesson} onOpenChange={() => setDeleteConfirmLesson(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Видалення заняття
              </DialogTitle>
              <DialogDescription>
                Ви впевнені, що хочете видалити це заняття? Цю дію неможливо скасувати.
              </DialogDescription>
            </DialogHeader>
            
            {deleteConfirmLesson && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{deleteConfirmLesson.subject}</span>
                  <Badge>{deleteConfirmLesson.position} пара</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {deleteConfirmLesson.group.ua}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {deleteConfirmLesson.date}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmLesson(null)}>
                Скасувати
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteLesson}
                disabled={deleteLessonMutation.isPending}
              >
                {deleteLessonMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Видалити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
