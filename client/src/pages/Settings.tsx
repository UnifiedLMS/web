import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import unifiedLogo from "@assets/unified_logo_1768624517472.png";

// HSL Helper for color picker (simplified)
// In a real app we might use a color manipulation library
function hexToHSL(hex: string) {
  // Mock conversion or use predefined palette for MVP
  return hex;
}

const PREDEFINED_COLORS = [
  { name: "Aqua", value: "rgb(0, 170, 255)", class: "bg-[rgb(0,170,255)]" },
  { name: "Emerald", value: "rgb(16, 185, 129)", class: "bg-emerald-500" },
  { name: "Violet", value: "rgb(139, 92, 246)", class: "bg-violet-500" },
  { name: "Rose", value: "rgb(244, 63, 94)", class: "bg-rose-500" },
  { name: "Amber", value: "rgb(245, 158, 11)", class: "bg-amber-500" },
];

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const [highlightColor, setHighlightColor] = useState("rgb(0, 170, 255)");

  useEffect(() => {
    // Load saved settings
    const savedTheme = localStorage.getItem("theme");
    const savedColor = localStorage.getItem("highlightColor");

    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    if (savedColor) {
      setHighlightColor(savedColor);
      // Logic to apply color variable would go here
      // For MVP we just save the preference
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const changeColor = (color: string) => {
    setHighlightColor(color);
    localStorage.setItem("highlightColor", color);
    
    // In a real implementation, we would update CSS variables here
    // document.documentElement.style.setProperty('--primary', color);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold">Налаштування</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Зовнішній вигляд</CardTitle>
            <CardDescription>
              Налаштуйте інтерфейс відповідно до ваших вподобань
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme-toggle" className="text-base">
                  Темна тема
                </Label>
                <div className="text-sm text-muted-foreground">
                  Перемикання між світлою та темною темою
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch 
                  id="theme-toggle" 
                  checked={isDark} 
                  onCheckedChange={toggleTheme} 
                />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">Колір акценту</Label>
              <div className="flex flex-wrap gap-3">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => changeColor(color.value)}
                    className={`
                      w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                      ${color.class}
                      ${highlightColor === color.value ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"}
                    `}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                Цей колір буде використовуватись для кнопок та активних елементів.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Про додаток</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <img src={unifiedLogo} alt="Unified" className="h-10 w-auto" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Unified Learning System</h3>
              <p className="text-muted-foreground">Версія 0.1.0 Alpha</p>
              <p className="text-sm text-muted-foreground mt-2">
                Розроблено для забезпечення сучасного та зручного навчального процесу.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
