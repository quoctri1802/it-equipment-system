import React from 'react';

export default function Logo({ width = 50, height = 50, showGlow = true }) {
  return (
    <img 
      src="/logo.png" 
      alt="Trung tâm Y tế khu vực Liên Chiểu" 
      width={width} 
      height={height} 
      style={{ 
        filter: showGlow ? 'drop-shadow(0px 0px 8px rgba(108, 209, 246, 0.45))' : 'none',
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain'
      }}
    />
  );
}
