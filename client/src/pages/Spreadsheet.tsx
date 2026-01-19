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

interface Group {
  en: string;
  [key: string]: any;
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
  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      try {
        const response = await apiFetch<Group | Group[]>("/api/v1/groups/all");
        // Handle both single group and array responses
        const groupsArray = Array.isArray(response) ? response : [response];
        console.log(`[Spreadsheet] Loaded ${groupsArray.length} group(s)`);
        return groupsArray;
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

  // Get unique disciplines from students (if available)
  const disciplines = useMemo(() => {
    // Since we don't have discipline info in student data, we'll use placeholder columns
    return ["Дисципліна 1", "Дисципліна 2", "Дисципліна 3"];
  }, []);

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
          transition={{ duration: 0.3 }}
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
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : groupsError ? (
                  <div className="text-center text-destructive py-4">
                    Помилка завантаження груп
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                    {filteredGroups.map((group, index) => (
                      <Button
                        key={group.en || `group-${index}`}
                        variant={selectedGroup === group.en ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGroup(group.en)}
                        className="justify-start"
                      >
                        {group.en}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spreadsheet Table */}
              {selectedGroup && (
                <div className="border rounded-lg overflow-x-auto">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        {/* Info rows */}
                        <TableRow className="bg-muted/50">
                          <TableHead rowSpan={4} className="border-r sticky left-0 bg-background z-10 min-w-[200px]">
                            ПІБ
                          </TableHead>
                          {disciplines.map((disc) => (
                            <TableHead key={disc} className="text-center min-w-[150px]">
                              {disc}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/30">
                          <TableHead className="border-r sticky left-0 bg-background z-10" />
                          {disciplines.map((_, idx) => (
                            <TableHead key={`info1-${idx}`} className="text-center text-sm text-muted-foreground">
                              Інформація по відомості, 2025
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/20">
                          <TableHead className="border-r sticky left-0 bg-background z-10" />
                          {disciplines.map((_, idx) => (
                            <TableHead key={`info2-${idx}`} className="text-center text-sm text-muted-foreground">
                              Додаткова інформація
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableHead className="border-r sticky left-0 bg-background z-10" />
                          {disciplines.map((_, idx) => (
                            <TableHead key={`info3-${idx}`} className="text-center text-sm text-muted-foreground">
                              Технічна інформація
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={disciplines.length + 1} className="text-center text-muted-foreground py-8">
                              Немає студентів у цій групі
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedStudents.map((student) => (
                            <TableRow key={student.edbo_id}>
                              <TableCell className="font-medium border-r sticky left-0 bg-background z-10">
                                {getFullName(student)}
                              </TableCell>
                              {disciplines.map((_, idx) => (
                                <TableCell key={`cell-${student.edbo_id}-${idx}`} className="text-center">
                                  {/* Empty cells for data entry */}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
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