import { createContext, useContext, useState, ReactNode } from "react";

interface DeveloperContextType {
  isDeveloperMode: boolean;
  showEndpointLabels: boolean;
  showEndpointPopups: boolean;
  toggleDeveloperMode: () => void;
  toggleEndpointLabels: () => void;
  toggleEndpointPopups: () => void;
}

const DeveloperContext = createContext<DeveloperContextType | undefined>(undefined);

export function DeveloperProvider({ children }: { children: ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("dev_mode");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [showEndpointLabels, setShowEndpointLabels] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("dev_endpoint_labels");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [showEndpointPopups, setShowEndpointPopups] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("dev_endpoint_popups");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const toggleDeveloperMode = () => {
    setIsDeveloperMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("dev_mode", newValue.toString());
      if (!newValue) {
        // Disable all sub-features when turning off dev mode
        localStorage.setItem("dev_endpoint_labels", "false");
        localStorage.setItem("dev_endpoint_popups", "false");
        setShowEndpointLabels(false);
        setShowEndpointPopups(false);
      }
      return newValue;
    });
  };

  const toggleEndpointLabels = () => {
    setShowEndpointLabels((prev) => {
      const newValue = !prev;
      localStorage.setItem("dev_endpoint_labels", newValue.toString());
      return newValue;
    });
  };

  const toggleEndpointPopups = () => {
    setShowEndpointPopups((prev) => {
      const newValue = !prev;
      localStorage.setItem("dev_endpoint_popups", newValue.toString());
      return newValue;
    });
  };

  return (
    <DeveloperContext.Provider
      value={{
        isDeveloperMode,
        showEndpointLabels,
        showEndpointPopups,
        toggleDeveloperMode,
        toggleEndpointLabels,
        toggleEndpointPopups,
      }}
    >
      {children}
    </DeveloperContext.Provider>
  );
}

export function useDeveloperMode() {
  const context = useContext(DeveloperContext);
  if (context === undefined) {
    throw new Error("useDeveloperMode must be used within DeveloperProvider");
  }
  return context;
}
