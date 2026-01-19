import { useLocation } from "wouter";
import { useEffect } from "react";
import Home from "@/pages/Home";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("unified_token");
    if (!token) setLocation("/login");
  }, [setLocation]);

  return (
    <DashboardLayout>
      <Home />
    </DashboardLayout>
  );
}
