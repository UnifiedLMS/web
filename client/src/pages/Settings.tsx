import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import unifiedLogo from "@assets/unified_logo_1768624517472.png";

// HSL Helper for color conversion
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#00aaee");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const savedColor = localStorage.getItem("highlightColor") || "#00aaee";

    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    setHighlightColor(savedColor);
    applyColor(savedColor);
  }, []);

  const applyColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const hsl = rgbToHsl(r, g, b);
    
    document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  };

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

  const handleLogout = () => {
    // Fade out logic if needed, but for now just logout
    logout();
  };

  const changeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setHighlightColor(color);
    localStorage.setItem("highlightColor", color);
    applyColor(color);
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
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={highlightColor}
                  onChange={changeColor}
                  className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <span className="text-sm font-mono text-muted-foreground uppercase">{highlightColor}</span>
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                Виберіть будь-який колір для кнопок та активних елементів інтерфейсу.
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
              <h3 className="font-bold text-lg">Unified</h3>
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
