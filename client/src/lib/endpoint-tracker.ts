import { useDeveloperMode } from "@/contexts/developer-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

interface EndpointCall {
  id: string;
  endpoint: string;
  method: string;
  data?: any;
  timestamp: number;
}

let endpointCallListeners: ((call: EndpointCall) => void)[] = [];

export function registerEndpointCall(endpoint: string, method: string, data?: any) {
  if (endpoint === "" || method === "") return;
  
  const call: EndpointCall = {
    id: `${Date.now()}-${Math.random()}`,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
  };

  endpointCallListeners.forEach((listener) => listener(call));
}

export function useEndpointNotifications() {
  const { showEndpointPopups } = useDeveloperMode();
  const { toast } = useToast();
  const toastIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!showEndpointPopups) return;

    const handleEndpointCall = (call: EndpointCall) => {
      const methodColors: Record<string, string> = {
        GET: "bg-blue-500",
        POST: "bg-green-500",
        PUT: "bg-orange-500",
        DELETE: "bg-red-500",
        PATCH: "bg-purple-500",
      };

      const color = methodColors[call.method] || "bg-gray-500";

      toast({
        title: `${call.method} ${call.endpoint}`,
        description: call.data ? JSON.stringify(call.data).substring(0, 100) : "No data",
        duration: 5000,
        className: `${color} text-white`,
      });
    };

    endpointCallListeners.push(handleEndpointCall);

    return () => {
      endpointCallListeners = endpointCallListeners.filter((listener) => listener !== handleEndpointCall);
    };
  }, [showEndpointPopups, toast]);
}
