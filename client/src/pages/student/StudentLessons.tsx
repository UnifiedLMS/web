import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, User, Calendar, TrendingUp, TrendingDown, Minus, ChevronRight, Loader2, Filter, SortAsc, SortDesc } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { StudentLayout } from "@/components/StudentLayout";
import { Link } from "wouter";

interface TeacherInfo {
  first_name: string;
  middle_name: string;
  last_name: string;
}

interface GradeData {
  grades: Record<string, number>;
  grade_system: string;
}

interface DisciplinesResponse {
  [disciplineName: string]: TeacherInfo;
}

interface GradesResponse {
  [disciplineName: string]: GradeData;
}

interface SubjectWithGrades {
  name: string;
  teacher: string;
  grades: Record<string, number>;
  gradeSystem: string;
  averageGrade: number;
}

export default function StudentLessons() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "grade">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithGrades | null>(null);
  const [gradeFilter, setGradeFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Fetch disciplines
  const { data: disciplines, isLoading: disciplinesLoading } = useQuery<DisciplinesResponse>({
    queryKey: ["student-disciplines"],
    queryFn: () => apiFetch<DisciplinesResponse>("/api/v1/students/disciplines"),
  });

  // Fetch grades
  const { data: grades, isLoading: gradesLoading } = useQuery<GradesResponse>({
    queryKey: ["student-grades"],
    queryFn: () => apiFetch<GradesResponse>("/api/v1/students/me/grades/all"),
  });

  // Combine disciplines with grades
  const subjects = useMemo(() => {
    if (!disciplines) return [];

    const result: SubjectWithGrades[] = [];

    for (const [name, teacher] of Object.entries(disciplines)) {
      const gradeData = grades?.[name];
      const gradesList = gradeData?.grades || {};
      const gradeValues = Object.values(gradesList);
      const average = gradeValues.length > 0 
        ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length 
        : 0;

      result.push({
        name,
        teacher: `${teacher.last_name} ${teacher.first_name} ${teacher.middle_name}`.trim(),
        grades: gradesList,
        gradeSystem: gradeData?.grade_system || "12-point",
        averageGrade: average,
      });
    }

    return result;
  }, [disciplines, grades]);

  // Filter and sort subjects
  const filteredSubjects = useMemo(() => {
    let filtered = subjects.filter(subject =>
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.teacher.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grade filter
    if (gradeFilter !== "all") {
      filtered = filtered.filter(subject => {
        const maxGrade = subject.gradeSystem.includes("5") ? 5 : 12;
        const percentage = (subject.averageGrade / maxGrade) * 100;
        if (gradeFilter === "high") return percentage >= 75;
        if (gradeFilter === "medium") return percentage >= 50 && percentage < 75;
        if (gradeFilter === "low") return percentage < 50;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === "asc"
          ? a.averageGrade - b.averageGrade
          : b.averageGrade - a.averageGrade;
      }
    });

    return filtered;
  }, [subjects, searchQuery, sortBy, sortOrder, gradeFilter]);

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100;
    if (percentage >= 75) return "text-primary";
    if (percentage >= 50) return "text-foreground";
    return "text-muted-foreground";
  };

  const normalizeDateKey = (value: string) => value.trim().replace(/\./g, "-");

  const getGradeTrend = (grades: Record<string, number>) => {
    const values = Object.values(grades);
    if (values.length < 2) return "neutral";
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    if (older.length === 0) return "neutral";
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (recentAvg > olderAvg + 0.5) return "up";
    if (recentAvg < olderAvg - 0.5) return "down";
    return "neutral";
  };

  const isLoading = disciplinesLoading || gradesLoading;
  const getLessonLink = (date: string) => {
    if (!selectedSubject) return "";
    const normalizedDate = normalizeDateKey(date);
    return `/student/schedule?date=${encodeURIComponent(normalizedDate)}&subject=${encodeURIComponent(selectedSubject.name)}`;
  };

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Мої предмети</h1>
            <p className="text-muted-foreground">Перегляд дисциплін та оцінок</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Пошук за назвою або викладачем..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Фільтр оцінок" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі оцінки</SelectItem>
                    <SelectItem value="high">Високі (≥75%)</SelectItem>
                    <SelectItem value="medium">Середні (50-75%)</SelectItem>
                    <SelectItem value="low">Низькі (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Сортувати за" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">За назвою</SelectItem>
                    <SelectItem value="grade">За оцінкою</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subjects Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Завантаження предметів...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchQuery ? "Предмети не знайдено" : "Немає доступних предметів"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredSubjects.map((subject, index) => {
                  const maxGrade = subject.gradeSystem.includes("5") ? 5 : 12;
                  const trend = getGradeTrend(subject.grades);
                  const progressValue = (subject.averageGrade / maxGrade) * 100;

                  return (
                    <motion.div
                      key={subject.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeInOut" }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200"
                        onClick={() => setSelectedSubject(subject)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{subject.name}</CardTitle>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <User className="w-3 h-3" />
                                <span className="truncate">{subject.teacher}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {trend === "up" && <TrendingUp className="w-4 h-4 text-primary" />}
                              {trend === "down" && <TrendingDown className="w-4 h-4 text-foreground" />}
                              {trend === "neutral" && <Minus className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Середній бал</span>
                              <span className={`text-2xl font-bold ${getGradeColor(subject.averageGrade, maxGrade)}`}>
                                {subject.averageGrade > 0 ? subject.averageGrade.toFixed(1) : "—"}
                              </span>
                            </div>
                            <Progress value={progressValue} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Оцінок: {Object.keys(subject.grades).length}</span>
                              <span>Система: {maxGrade}-бальна</span>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full mt-2">
                              Детальніше <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Subject Detail Dialog */}
        <Dialog open={!!selectedSubject} onOpenChange={() => setSelectedSubject(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            {selectedSubject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedSubject.name}</DialogTitle>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{selectedSubject.teacher}</span>
                  </div>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className={`text-3xl font-bold ${getGradeColor(selectedSubject.averageGrade, selectedSubject.gradeSystem.includes("5") ? 5 : 12)}`}>
                          {selectedSubject.averageGrade > 0 ? selectedSubject.averageGrade.toFixed(2) : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Середній бал</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{Object.keys(selectedSubject.grades).length}</div>
                        <div className="text-xs text-muted-foreground mt-1">Всього оцінок</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">
                          {selectedSubject.gradeSystem.includes("5") ? "5" : "12"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Макс. бал</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grades Table */}
                  {Object.keys(selectedSubject.grades).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Дата</TableHead>
                            <TableHead className="text-right">Оцінка</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(selectedSubject.grades)
                            .sort(([a], [b]) => {
                              // Parse DD-MM-YYYY format
                              const parseDate = (d: string) => {
                                const [day, month, year] = d.split("-").map(Number);
                                return new Date(year, month - 1, day);
                              };
                              return parseDate(b).getTime() - parseDate(a).getTime();
                            })
                            .map(([date, grade]) => {
                              const maxGrade = selectedSubject.gradeSystem.includes("5") ? 5 : 12;
                              const lessonLink = getLessonLink(date);
                              return (
                                <TableRow key={date}>
                                  <TableCell className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    {date.replace(/-/g, ".")}
                                  </TableCell>
                                  <TableCell className={`text-right font-semibold ${getGradeColor(grade, maxGrade)}`}>
                                    {lessonLink ? (
                                      <Link href={lessonLink} className="hover:underline">
                                        {grade}
                                      </Link>
                                    ) : (
                                      grade
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Оцінок поки немає
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
