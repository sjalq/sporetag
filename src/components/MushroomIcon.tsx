import React from 'react';
import './MushroomIcon.css';

interface MushroomIconProps {
  size?: number;
  glowColor?: string;
  className?: string;
}

const MushroomIcon: React.FC<MushroomIconProps> = ({ 
  size = 24, 
  glowColor = '#8B5A2B',
  className = ''
}) => {
  const iconId = `mushroom-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div 
      className={`mushroom-icon ${className}`}
      style={{
        '--glow-color': glowColor
      } as React.CSSProperties}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`${iconId}-cap`} cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#D2691E" />
            <stop offset="50%" stopColor="#A0522D" />
            <stop offset="100%" stopColor="#654321" />
          </radialGradient>
          <linearGradient id={`${iconId}-stem`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5E6D3" />
            <stop offset="50%" stopColor="#E6D3B7" />
            <stop offset="100%" stopColor="#D3C4A3" />
          </linearGradient>
          <radialGradient id={`${iconId}-spots`} cx="0.5" cy="0.5" r="0.3">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F0F0" />
          </radialGradient>
        </defs>
        
        {/* Mushroom cap */}
        <ellipse
          cx="12"
          cy="9"
          rx="10"
          ry="6"
          fill={`url(#${iconId}-cap)`}
          stroke="#5D4037"
          strokeWidth="0.5"
        />
        
        {/* White spots on cap */}
        <circle cx="8" cy="7" r="1.2" fill={`url(#${iconId}-spots)`} />
        <circle cx="15" cy="6" r="0.8" fill={`url(#${iconId}-spots)`} />
        <circle cx="11" cy="11" r="1" fill={`url(#${iconId}-spots)`} />
        <circle cx="16" cy="9" r="0.6" fill={`url(#${iconId}-spots)`} />
        
        {/* Mushroom stem */}
        <rect
          x="10"
          y="13"
          width="4"
          height="8"
          rx="2"
          ry="1"
          fill={`url(#${iconId}-stem)`}
          stroke="#D3C4A3"
          strokeWidth="0.3"
        />
        
        {/* Gills under cap */}
        <ellipse
          cx="12"
          cy="14"
          rx="8"
          ry="2"
          fill="#8D6E63"
          opacity="0.6"
        />
        
        {/* Ground/base */}
        <ellipse
          cx="12"
          cy="21.5"
          rx="3"
          ry="0.8"
          fill="#3E2723"
          opacity="0.4"
        />
      </svg>
    </div>
  );
};

export default MushroomIcon;