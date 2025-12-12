import React, { useMemo } from 'react';

interface ColorfulGradientBackgroundProps {
  seed: string | number;
  className?: string;
}

// Colorful gradient palettes inspired by the reference image
const gradientPalettes = [
  // Orange-Pink-Yellow (like reference image)
  ['#FF8C42', '#FF3CAC', '#FFDD00', '#FF6B6B'],
  // Purple-Blue-Pink
  ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  // Teal-Green-Yellow
  ['#11998e', '#38ef7d', '#FFDD00', '#00d2ff'],
  // Blue-Purple-Pink
  ['#4facfe', '#00f2fe', '#a855f7', '#ec4899'],
  // Orange-Red-Yellow
  ['#f093fb', '#f5576c', '#FF8C42', '#FFDD00'],
  // Green-Teal-Blue
  ['#56ab2f', '#a8e6cf', '#00b4db', '#0083B0'],
  // Pink-Purple-Blue
  ['#ee0979', '#ff6a00', '#a855f7', '#667eea'],
  // Sunset colors
  ['#fa709a', '#fee140', '#f093fb', '#FF6B6B'],
];

const ColorfulGradientBackground: React.FC<ColorfulGradientBackgroundProps> = ({ 
  seed, 
  className = '' 
}) => {
  const gradientStyle = useMemo(() => {
    // Use seed to deterministically pick a palette
    const hash = String(seed).split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const paletteIndex = Math.abs(hash) % gradientPalettes.length;
    const palette = gradientPalettes[paletteIndex];
    
    // Create random blob positions based on seed
    const blobPositions = [
      { x: Math.abs((hash * 13) % 100), y: Math.abs((hash * 17) % 60) },
      { x: Math.abs((hash * 23) % 80), y: Math.abs((hash * 29) % 100) },
      { x: Math.abs((hash * 31) % 100), y: Math.abs((hash * 37) % 80) },
    ];
    
    return {
      background: `
        radial-gradient(circle at ${blobPositions[0].x}% ${blobPositions[0].y}%, ${palette[0]}CC 0%, transparent 50%),
        radial-gradient(circle at ${blobPositions[1].x}% ${blobPositions[1].y}%, ${palette[1]}CC 0%, transparent 45%),
        radial-gradient(circle at ${blobPositions[2].x}% ${blobPositions[2].y}%, ${palette[2]}AA 0%, transparent 55%),
        linear-gradient(135deg, ${palette[3]}DD 0%, ${palette[0]}DD 50%, ${palette[2]}DD 100%)
      `.trim(),
      filter: 'blur(0px)',
    };
  }, [seed]);

  return (
    <div 
      className={`w-full h-full ${className}`}
      style={gradientStyle}
    />
  );
};

export default ColorfulGradientBackground;