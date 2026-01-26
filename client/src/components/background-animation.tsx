export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
      {/* Deep neutral gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#0a0a0a]" />
      
      {/* Animated gradient orbs - using CSS animations for better performance */}
      <div 
        className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-primary/30 blur-[120px] animate-blob-1 will-change-transform"
      />
      
      {/* Secondary orb */}
      <div 
        className="absolute top-[30%] right-[-20%] w-[45vw] h-[45vw] rounded-full bg-primary/25 blur-[100px] animate-blob-2 will-change-transform"
      />
      
      {/* Bottom orb */}
      <div 
        className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[110px] animate-blob-3 will-change-transform"
      />

      {/* Subtle floating particles - using CSS animations */}
      <div 
        className="absolute bottom-[20%] left-[15%] w-2 h-2 rounded-full bg-white/10 animate-float-1"
      />
      <div 
        className="absolute top-[25%] right-[20%] w-1.5 h-1.5 rounded-full bg-white/10 animate-float-2"
      />
      <div 
        className="absolute top-[60%] left-[70%] w-1 h-1 rounded-full bg-white/10 animate-float-3"
      />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.015] bg-[length:50px_50px]" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
