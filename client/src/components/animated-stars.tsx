import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Star {
  id: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  size: number;
}

interface AnimatedStarsProps {
  count?: number;
  className?: string;
  intensity?: "light" | "medium" | "heavy"; // light for login, medium for other screens
}

export function AnimatedStars({ count = 50, className = "", intensity = "light" }: AnimatedStarsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    // Generate random stars
    const stars: Star[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 20 + Math.random() * 30, // 20-50 seconds
      delay: Math.random() * 2,
      size: Math.random() * (intensity === "light" ? 1.5 : 2.5) + (intensity === "light" ? 0.5 : 1),
    }));
    starsRef.current = stars;
  }, [count, intensity]);

  const getOpacityVariants = () => {
    if (intensity === "light") {
      return {
        animate: {
          opacity: [0.3, 0.8, 0.3],
        },
      };
    }
    return {
      animate: {
        opacity: [0.2, 0.6, 0.2],
      },
    };
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {starsRef.current.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={getOpacityVariants().animate}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
