import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Users, BookOpen, Loader2, 
  Search
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TeacherLayout } from "@/components/TeacherLayout";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

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

interface GradeSubmission {
  edbo_id: number;
  subject: string;
  grade_system: string;
  grade: number;
  date: string;
}

export default function TeacherGrades() {
  const GRADE_SYSTEM = "12-point" as const;
  const MAX_GRADE = 12;

  const [selectedGroupEn, setSelectedGroupEn] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGrades, setEditingGrades] = useState<Record<string, string>>({});
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<GroupDetail[]>({
    queryKey: ["teacher-groups"],
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

  // Fetch assigned disciplines for selected group
  const { data: disciplines, isLoading: disciplinesLoading } = useQuery<string[]>({
    queryKey: ["teacher-disciplines", selectedGroupEn],
    queryFn: async () => {
      const response = await apiFetch<string[]>(`/api/v1/teachers/assigned/${selectedGroupEn}/disciplines`);
      return response;
    },
    enabled: !!selectedGroupEn,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch student assessments
  const { data: assessments, isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery<StudentAssessment[]>({
    queryKey: ["teacher-assessments", selectedGroupEn, selectedDiscipline],
    queryFn: async () => {
      console.log(`[TeacherGrades] Fetching assessments for group ${selectedGroupEn}, discipline: ${selectedDiscipline}`);
      
      // Make the POST request with discipline in body
      // The API expects: Content-Type: application/json with body: "Програмування" (JSON string)
      const url = `${window.location.origin}/api/proxy/api/v1/students/${selectedGroupEn}/assesment/all`;
      const token = localStorage.getItem("unified_token");
      
      // Normalize wrapped quotes from API values, then encode as JSON string
      const normalizedDiscipline = selectedDiscipline.replace(/^"+|"+$/g, "");
      const bodyContent = JSON.stringify(normalizedDiscipline);
      console.log(`[TeacherGrades] Sending body:`, bodyContent);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: bodyContent,
      });
      
      console.log(`[TeacherGrades] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TeacherGrades] Error response:`, errorText);
        throw new Error(`Помилка завантаження оцінок: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[TeacherGrades] Response data type:`, typeof data, Array.isArray(data) ? `Array(${data.length})` : "");
      
      // Handle case where API returns a string instead of array
      if (typeof data === "string") {
        console.warn(`[TeacherGrades] API returned string instead of array:`, data);
        return [];
      }
      
      // Ensure we always return an array
      if (!Array.isArray(data)) {
        console.warn(`[TeacherGrades] API returned non-array:`, data);
        return [];
      }
      
      return data;
    },
    enabled: !!selectedGroupEn && !!selectedDiscipline,
    staleTime: 2 * 60 * 1000,
  });

  // Submit grade mutation
  const submitGradeMutation = useMutation({
    mutationFn: async (data: GradeSubmission) => {
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

  // Get all unique dates from assessments
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

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(student => {
      const fullName = `${student.student.last_name} ${student.student.first_name} ${student.student.middle_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [assessments, searchQuery]);

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
    const maxGrade = MAX_GRADE;
    const currentGrade = student.discipline?.[selectedDiscipline]?.[date];

    if (!trimmed) {
      // No delete endpoint, just revert display
      clearEditingGrade(key);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxGrade) {
      toast({ variant: "destructive", title: "Помилка", description: `Оцінка має бути від 1 до ${maxGrade}` });
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

  const selectedGroup = groups?.find(g => g.group.en === selectedGroupEn);

  return (
    <TeacherLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Оцінювання</h1>
            <p className="text-muted-foreground">Виставлення оцінок студентам</p>
          </div>

          {/* Selectors */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Група
                  </label>
                  <Select value={selectedGroupEn} onValueChange={(v) => {
                    setSelectedGroupEn(v);
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

                {/* Discipline Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Дисципліна
                  </label>
                  <Select 
                    value={selectedDiscipline} 
                    onValueChange={setSelectedDiscipline}
                    disabled={!selectedGroupEn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть дисципліну" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : disciplines?.map((discipline) => (
                        <SelectItem key={discipline} value={discipline}>
                          {discipline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Search */}
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
          {selectedGroup && selectedDiscipline && (
            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="outline">{selectedGroup.group.ua}</Badge>
              <Badge variant="outline">{selectedGroup.specialty}</Badge>
              <Badge variant="outline">{selectedGroup.course} курс</Badge>
              <Badge variant="outline">{selectedGroup.degree}</Badge>
              <Badge variant="secondary">{selectedDiscipline}</Badge>
            </div>
          )}

          {/* Spreadsheet */}
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
                            const maxGrade = MAX_GRADE;

                            return (
                              <motion.tr
                                key={student.edbo_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.02 }}
                                className="hover:bg-muted/30"
                              >
                                <td className="sticky left-0 z-10 bg-background p-3 border font-medium">
                                  {`${student.student.last_name} ${student.student.first_name}`}
                                </td>
                                {allDates.map(date => {
                                  const grade = studentGrades[date];
                                  const percentage = grade ? (grade / maxGrade) * 100 : 0;
                                  const colorClass = grade
                                    ? percentage >= 75 ? "text-emerald-600 dark:text-emerald-400"
                                    : percentage >= 50 ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground";
                                  const cellKey = `${student.edbo_id}-${date}`;
                                  const displayValue = editingGrades[cellKey] ?? (grade ? String(grade) : "");
                                  
                                  return (
                                    <td key={date} className={`p-2 text-center border ${colorClass}`}>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={maxGrade}
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

                                          if (nextNumber < 1 || nextNumber > maxGrade) {
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
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Оберіть групу та дисципліну для перегляду журналу</p>
            </div>
          )}
        </motion.div>

      </div>
    </TeacherLayout>
  );
}
