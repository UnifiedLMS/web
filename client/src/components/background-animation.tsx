import { motion } from "framer-motion";

export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#022c43] to-[#000814]" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [-20, 20, -20],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[100px]"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [20, -20, 20],
          y: [20, -20, 20],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/10 blur-[120px]"
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[length:40px_40px]" />
    </div>
  );
}
