import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Search, ArrowUpDown, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

// API response structure for a single group entry
interface GroupEntry {
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

// API response - object with degree categories as keys
interface GroupsApiResponse {
  [degreeCategory: string]: GroupEntry[];
}

// Flattened group for display
interface Group {
  en: string;
  ua: string;
  degree: string;
  course: number;
  specialty: string;
  disciplines: Record<string, number>;
  class_teacher_edbo: number;
}

interface Student {
  first_name: string;
  middle_name: string;
  last_name: string;
  edbo_id: number;
  date_of_birth: string;
  role: string;
  speciality: string;
  degree: string;
  course: number;
  group: {
    en: string;
    [key: string]: any;
  };
  start_of_study: string;
  complete_of_study: string;
  class_teacher_edbo: number;
}

export default function Spreadsheet() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading, error: groupsError, refetch: refetchGroups } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      try {
        const response = await apiFetch<GroupsApiResponse>("/api/v1/groups/all");
        
        // The response is an object with degree categories as keys (skilled_worker, bachelor, etc.)
        // Each category contains an array of group entries
        const flattenedGroups: Group[] = [];
        
        if (response && typeof response === 'object') {
          // Iterate over each degree category
          for (const [category, groupEntries] of Object.entries(response)) {
            if (Array.isArray(groupEntries)) {
              // Process each group entry in this category
              for (const entry of groupEntries) {
                if (entry && entry.group && entry.group.en) {
                  flattenedGroups.push({
                    en: entry.group.en,
                    ua: entry.group.ua || entry.group.en,
                    degree: entry.degree,
                    course: entry.course,
                    specialty: entry.specialty,
                    disciplines: entry.disciplines || {},
                    class_teacher_edbo: entry.class_teacher_edbo,
                  });
                }
              }
            }
          }
        }
        
        console.log(`[Spreadsheet] Loaded ${flattenedGroups.length} group(s) from API`);
        return flattenedGroups;
      } catch (error: any) {
        console.error("[Spreadsheet] Error loading groups:", error);
        toast({
          variant: "destructive",
          title: "Помилка",
          description: error.message || "Не вдалося завантажити групи",
        });
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch students for selected group
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["students", selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return [];
      try {
        const response = await apiFetch<Student | Student[]>(`/api/v1/students/${selectedGroup}`);
        // Handle both single student and array responses
        const studentsArray = Array.isArray(response) ? response : [response];
        console.log(`[Spreadsheet] Loaded ${studentsArray.length} student(s) for group ${selectedGroup}`);
        return studentsArray;
      } catch (error: any) {
        console.error(`[Spreadsheet] Error loading students for group ${selectedGroup}:`, error);
        toast({
          variant: "destructive",
          title: "Помилка",
          description: error.message || "Не вдалося завантажити студентів",
        });
        throw error;
      }
    },
    enabled: !!selectedGroup,
  });

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter((group) =>
      group.en.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  // Get the currently selected group data
  const selectedGroupData = useMemo(() => {
    return groups.find(g => g.en === selectedGroup);
  }, [groups, selectedGroup]);

  // Get disciplines from the selected group
  const disciplines = useMemo(() => {
    if (selectedGroupData && selectedGroupData.disciplines) {
      return Object.keys(selectedGroupData.disciplines);
    }
    return [];
  }, [selectedGroupData]);

  // Sort students
  const sortedStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name} ${a.middle_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name} ${b.middle_name}`.toLowerCase();
      return sortOrder === "asc" 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    return sorted;
  }, [students, sortOrder]);

  const getInitials = (student: Student) => {
    const first = student.first_name?.[0] || "";
    const middle = student.middle_name?.[0] || "";
    const last = student.last_name?.[0] || "";
    return `${last}${first}${middle}`.toUpperCase();
  };

  const getFullName = (student: Student) => {
    return `${student.last_name} ${student.first_name} ${student.middle_name}`;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-[95vw]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Електронні відомості</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group Search and Selection */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Пошук групи..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {sortOrder === "asc" ? "За зростанням" : "За спаданням"}
                  </Button>
                </div>

                {groupsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Завантаження груп...</p>
                  </div>
                ) : groupsError ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-destructive font-medium">Помилка завантаження груп</div>
                    <p className="text-sm text-muted-foreground">
                      Перевірте підключення до мережі та спробуйте ще раз
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchGroups()}
                    >
                      Спробувати знову
                    </Button>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Групи не знайдено" : "Немає доступних груп"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-3 border rounded-lg bg-muted/30">
                    {filteredGroups.map((group, index) => (
                      <Button
                        key={group.en || `group-${index}`}
                        variant={selectedGroup === group.en ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGroup(group.en)}
                        className={`justify-start font-medium transition-all h-auto py-2 flex-col items-start ${
                          selectedGroup === group.en 
                            ? "shadow-md" 
                            : "hover:bg-primary/10 hover:border-primary/30"
                        }`}
                      >
                        <span className="font-semibold">{group.en}</span>
                        <span className={`text-xs ${selectedGroup === group.en ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {group.course} курс · {group.degree === "bachelor" ? "Бакалавр" : group.degree === "Кваліфікований робітник" ? "КР" : group.degree}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spreadsheet Table */}
              {selectedGroup && (
                <div className="space-y-4">
                  {/* Selected group info */}
                  {selectedGroupData && (
                    <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div>
                        <span className="font-semibold text-lg">{selectedGroupData.en}</span>
                        <span className="text-muted-foreground ml-2">({selectedGroupData.ua})</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {selectedGroupData.specialty} · {selectedGroupData.course} курс · 
                        {selectedGroupData.degree === "bachelor" ? " Бакалавр" : ` ${selectedGroupData.degree}`}
                      </span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        Дисциплін: {disciplines.length}
                      </span>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-x-auto bg-card">
                    {studentsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Завантаження студентів...</p>
                      </div>
                    ) : disciplines.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        У цієї групи немає зареєстрованих дисциплін
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          {/* Main header row */}
                          <TableRow className="bg-muted/40 dark:bg-muted/20 border-b-2 border-border">
                            <TableHead className="border-r border-border sticky left-0 bg-card z-10 min-w-[220px] font-semibold">
                              ПІБ
                            </TableHead>
                            {disciplines.map((disc) => (
                              <TableHead key={disc} className="text-center min-w-[140px] font-semibold">
                                {disc}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={disciplines.length + 1} className="text-center text-muted-foreground py-12">
                                Немає студентів у цій групі
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedStudents.map((student, idx) => (
                              <TableRow 
                                key={student.edbo_id}
                                className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/20 dark:bg-muted/10"}
                              >
                                <TableCell className="font-medium border-r border-border sticky left-0 bg-card z-10">
                                  {getFullName(student)}
                                </TableCell>
                                {disciplines.map((discipline, disciplineIdx) => (
                                  <TableCell 
                                    key={`cell-${student.edbo_id}-${disciplineIdx}`} 
                                    className="text-center hover:bg-primary/5 transition-colors cursor-pointer"
                                  >
                                    {/* Empty cells for data entry */}
                                    <span className="text-muted-foreground/30">—</span>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}

              {!selectedGroup && (
                <div className="text-center text-muted-foreground py-12">
                  Виберіть групу для відображення відомості
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}