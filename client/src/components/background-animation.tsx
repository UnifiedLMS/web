import { motion } from "framer-motion";

export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
      {/* Deep neutral gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#0a0a0a]" />
      
      {/* Animated gradient orbs - using primary color (accent from settings) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.35, 0.2],
          x: [-20, 20, -20],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-primary/30 blur-[120px]"
      />
      
      {/* Secondary orb - also using primary color */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.1, 0.25, 0.1],
          x: [30, -30, 30],
          y: [-15, 25, -15],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
        className="absolute top-[30%] right-[-20%] w-[45vw] h-[45vw] rounded-full bg-primary/25 blur-[100px]"
      />
      
      {/* Bottom orb - primary color with different opacity */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [20, -20, 20],
          y: [20, -20, 20],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[110px]"
      />

      {/* Subtle floating particles */}
      <motion.div
        animate={{
          y: [-10, 10, -10],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[20%] left-[15%] w-2 h-2 rounded-full bg-white/10"
      />
      <motion.div
        animate={{
          y: [10, -10, 10],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        className="absolute top-[25%] right-[20%] w-1.5 h-1.5 rounded-full bg-white/10"
      />
      <motion.div
        animate={{
          y: [-8, 8, -8],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
        className="absolute top-[60%] left-[70%] w-1 h-1 rounded-full bg-white/10"
      />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.015] bg-[length:50px_50px]" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
