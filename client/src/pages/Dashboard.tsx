import { useLocation } from "wouter";
import { useEffect } from "react";
import Home from "@/pages/Home";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getTokenFromCookie } from "@/lib/cookieUtils";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = getTokenFromCookie();
    if (!token) setLocation("/login");
  }, [setLocation]);

  return (
    <DashboardLayout>
      <Home />
    </DashboardLayout>
  );
}
