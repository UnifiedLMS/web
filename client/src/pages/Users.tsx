import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Search, UserSearch, Edit, Trash2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

const userSchema = z.object({
  first_name: z.string().min(1, "Ім'я обов'язкове"),
  middle_name: z.string().min(1, "По батькові обов'язкове"),
  last_name: z.string().min(1, "Прізвище обов'язкове"),
  edbo_id: z.number().min(1, "EDBO ID обов'язковий"),
  date_of_birth: z.string().min(1, "Дата народження обов'язкова"),
  role: z.string().min(1, "Роль обов'язкова"),
  scopes: z.array(z.string()).optional(),
});

const searchSchema = z.object({
  edbo_id: z.string().min(1, "EDBO ID обов'язковий"),
});

const roleSearchSchema = z.object({
  role: z.string().min(1, "Роль обов'язкова"),
});

interface User {
  first_name: string;
  middle_name: string;
  last_name: string;
  edbo_id: number;
  date_of_birth: string;
  role: string;
}

export default function Users() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("search");
  const [searchEdboId, setSearchEdboId] = useState("");
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [roleSearchResults, setRoleSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRoleSearching, setIsRoleSearching] = useState(false);

  // Update form
  const updateForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      edbo_id: 0,
      date_of_birth: "",
      role: "",
      scopes: [],
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (edboId: string) => {
      try {
        console.log(`[Users] Deleting user with EDBO ID: ${edboId}`);
        const response = await apiFetch(`/api/v1/users/${edboId}`, {
          method: "DELETE",
        });
        
        console.log("[Users] User deleted successfully");
        return response;
      } catch (error: any) {
        console.error("[Users] Delete mutation error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Успіх",
        description: "Користувача успішно видалено",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Не вдалося видалити користувача",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema> & { edboId: string }) => {
      try {
        console.log(`[Users] Updating user with EDBO ID: ${data.edboId}`, data);
        
        const result = await apiFetch(`/api/v1/users/${data.edboId}`, {
          method: "PATCH",
          body: JSON.stringify({
            first_name: data.first_name,
            middle_name: data.middle_name,
            last_name: data.last_name,
            edbo_id: data.edbo_id,
            date_of_birth: data.date_of_birth,
            role: data.role,
            scopes: data.scopes || [],
          }),
        });
        
        console.log("[Users] User updated successfully");
        return result;
      } catch (error: any) {
        console.error("[Users] Update mutation error:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Успіх",
        description: "Користувача успішно оновлено",
      });
      updateForm.reset();
      setSearchedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Не вдалося оновити користувача",
      });
    },
  });

  const handleSearch = async (edboIdOverride?: string) => {
    const edboId = edboIdOverride ?? searchEdboId;
    if (!edboId) return;
    setSearchEdboId(edboId);
    setIsSearching(true);
    try {
      const response = await apiFetch<User | User[]>(`/api/v1/users/${edboId}`);
      
      // Handle both single user and array responses
      let user: User;
      if (Array.isArray(response)) {
        if (response.length === 0) {
          throw new Error("Користувача не знайдено");
        }
        user = response[0];
        console.log(`[Users] Found ${response.length} user(s), using first one`);
      } else {
        user = response;
      }
      
      setSearchedUser(user);
      
      // Convert date format from DD.MM.YYYY to YYYY-MM-DD if needed
      let dateOfBirth = user.date_of_birth;
      if (dateOfBirth && dateOfBirth.includes(".")) {
        // Convert DD.MM.YYYY to YYYY-MM-DD
        const parts = dateOfBirth.split(".");
        if (parts.length === 3) {
          dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      updateForm.reset({
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        edbo_id: user.edbo_id,
        date_of_birth: dateOfBirth,
        role: user.role,
        scopes: [],
      });
    } catch (error: any) {
      console.error("[Users] Search error:", error);
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Користувача не знайдено",
      });
      setSearchedUser(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRoleSearch = async () => {
    if (!roleSearchQuery) return;
    setIsRoleSearching(true);
    try {
      // For role search, use /api/v1/users/{role}/all endpoint
      const token = localStorage.getItem("unified_token");
      const url = `/api/proxy/api/v1/users/${encodeURIComponent(roleSearchQuery)}/all`;
      
      console.log(`[Users] Role search: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
      });

      // Try to parse response - even if status is 422, the body might contain valid array data
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response");
      }
      
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        console.error("[Users] Failed to parse role search response:", parseError);
        throw new Error("Не вдалося обробити відповідь сервера");
      }

      // Check if the parsed data is an array - if so, use it regardless of status code
      // The API may return 422 validation error but still include the actual data array
      let data: User | User[];
      if (Array.isArray(parsedData)) {
        // Response is directly an array - use it even if status is 422
        data = parsedData;
        if (response.status === 422) {
          console.log("[Users] API returned 422 but response body contains valid array data");
        }
      } else {
        // Not an array - check if it's an error object
        if (response.status !== 200 && response.status !== 201) {
          const errorMsg = parsedData?.detail || parsedData?.message || `Помилка ${response.status}`;
          throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        }
        // If status is ok but not array, treat as single user
        data = parsedData;
      }
      
      // Handle both single user and array responses
      let users: User[];
      if (Array.isArray(data)) {
        users = data;
      } else {
        users = [data];
      }
      
      setRoleSearchResults(users);
      if (users.length === 0) {
        toast({
          title: "Інформація",
          description: "Користувачів з такою роллю не знайдено",
        });
      }
    } catch (error: any) {
      console.error("[Users] Role search error:", error);
      toast({
        variant: "destructive",
        title: "Помилка",
        description: error.message || "Не вдалося знайти користувачів",
      });
      setRoleSearchResults([]);
    } finally {
      setIsRoleSearching(false);
    }
  };

  const handleRoleUserClick = (user: User) => {
    setActiveTab("search");
    handleSearch(String(user.edbo_id));
  };

  const handleUpdate = (data: z.infer<typeof userSchema>) => {
    if (!searchEdboId) {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Спочатку знайдіть користувача",
      });
      return;
    }
    updateMutation.mutate({ ...data, edboId: searchEdboId });
  };

  const handleDelete = (edboId: string) => {
    if (confirm("Ви впевнені, що хочете видалити цього користувача?")) {
      deleteMutation.mutate(edboId);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Управління користувачами</CardTitle>
              <CardDescription>Пошук, редагування та видалення користувачів</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="search">Пошук за EDBO ID</TabsTrigger>
                  <TabsTrigger value="update">Оновлення</TabsTrigger>
                  <TabsTrigger value="delete">Видалення</TabsTrigger>
                  <TabsTrigger value="role-search">Пошук за роллю</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введіть EDBO ID"
                      value={searchEdboId}
                      onChange={(e) => setSearchEdboId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {searchedUser && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <h3 className="font-semibold">Інформація про користувача</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">ПІБ:</span> {searchedUser.last_name} {searchedUser.first_name} {searchedUser.middle_name}</div>
                        <div><span className="text-muted-foreground">EDBO ID:</span> {searchedUser.edbo_id}</div>
                        <div><span className="text-muted-foreground">Дата народження:</span> {searchedUser.date_of_birth}</div>
                        <div><span className="text-muted-foreground">Роль:</span> {searchedUser.role}</div>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="update" className="space-y-4">
                  <Form {...updateForm}>
                    <form onSubmit={updateForm.handleSubmit(handleUpdate)} className="space-y-4">
                      <FormField
                        control={updateForm.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ім'я</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="middle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>По батькові</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Прізвище</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="edbo_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EDBO ID</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Дата народження</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Роль</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Edit className="w-4 h-4 mr-2" />
                        )}
                        Оновити користувача
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="delete" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Введіть EDBO ID для видалення"
                        value={searchEdboId}
                        onChange={(e) => setSearchEdboId(e.target.value)}
                      />
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(searchEdboId)}
                        disabled={!searchEdboId || deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Увага: видалення користувача незворотне. Будьте обережні.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="role-search" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введіть роль (наприклад: students, teachers, admins)"
                      value={roleSearchQuery}
                      onChange={(e) => setRoleSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRoleSearch()}
                    />
                    <Button onClick={handleRoleSearch} disabled={isRoleSearching}>
                      {isRoleSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserSearch className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {roleSearchResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {roleSearchResults.map((user) => (
                        <motion.div
                          key={user.edbo_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">ПІБ:</span>{" "}
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-left"
                                onClick={() => handleRoleUserClick(user)}
                              >
                                {user.last_name} {user.first_name} {user.middle_name}
                              </Button>
                            </div>
                            <div>
                              <span className="text-muted-foreground">EDBO ID:</span>{" "}
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-left"
                                onClick={() => handleRoleUserClick(user)}
                              >
                                {user.edbo_id}
                              </Button>
                            </div>
                            <div><span className="text-muted-foreground">Дата народження:</span> {user.date_of_birth}</div>
                            <div><span className="text-muted-foreground">Роль:</span> {user.role}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}