import { useDeveloperMode } from "@/contexts/developer-context";
import { motion, AnimatePresence } from "framer-motion";

interface EndpointLabelProps {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  className?: string;
}

export function EndpointLabel({ endpoint, method = "GET", className = "" }: EndpointLabelProps) {
  const { showEndpointLabels } = useDeveloperMode();

  if (!showEndpointLabels) return null;

  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    POST: "bg-green-500/10 text-green-600 border-green-500/30",
    PUT: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/30",
    PATCH: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  };

  return (
    <div className={`text-xs ${methodColors[method]} px-2 py-1 rounded border ${className}`}>
      <span className="font-semibold">{method}</span> {endpoint}
    </div>
  );
}

interface EndpointNotificationProps {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  data?: any;
}

export function EndpointNotification({ endpoint, method = "GET", data }: EndpointNotificationProps) {
  const { showEndpointPopups } = useDeveloperMode();

  if (!showEndpointPopups) return null;

  const methodColors: Record<string, string> = {
    GET: "border-blue-500/50 bg-blue-500/10",
    POST: "border-green-500/50 bg-green-500/10",
    PUT: "border-orange-500/50 bg-orange-500/10",
    DELETE: "border-red-500/50 bg-red-500/10",
    PATCH: "border-purple-500/50 bg-purple-500/10",
  };

  const methodTextColors: Record<string, string> = {
    GET: "text-blue-700",
    POST: "text-green-700",
    PUT: "text-orange-700",
    DELETE: "text-red-700",
    PATCH: "text-purple-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, x: -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -10, x: -10 }}
      transition={{ duration: 0.2 }}
      className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg border-2 ${methodColors[method]} shadow-lg z-50`}
    >
      <div className={`text-xs font-bold mb-2 ${methodTextColors[method]}`}>
        {method} {endpoint}
      </div>
      {data && (
        <pre className="text-xs bg-black/20 p-2 rounded overflow-auto max-h-32 text-white">
          {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </motion.div>
  );
}
