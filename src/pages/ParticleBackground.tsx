import React from 'react';

export function ParticleBackground() {
  // Generate random positions and animations for particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 40 + 20, // 20-60px
    animationDelay: Math.random() * 10,
    animationDuration: Math.random() * 20 + 15, // 15-35s
    opacity: Math.random() * 0.3 + 0.1, // 0.1-0.4
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-slow"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`,
          }}
        >
          {/* Parallelogram shape using CSS transform */}
          <div
            className="parallelogram-particle"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size * 0.6}px`,
              opacity: particle.opacity,
            }}
          />
        </div>
      ))}
      
      {/* Additional smaller particles */}
      {Array.from({ length: 8 }, (_, i) => ({
        id: i + 12,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 25 + 15, // 15-40px
        animationDelay: Math.random() * 15,
        animationDuration: Math.random() * 25 + 20, // 20-45s
        opacity: Math.random() * 0.2 + 0.05, // 0.05-0.25
      })).map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-reverse"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`,
          }}
        >
          <div
            className="parallelogram-particle-alt"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size * 0.8}px`,
              opacity: particle.opacity,
            }}
          />
        </div>
      ))}
    </div>
  );
}
