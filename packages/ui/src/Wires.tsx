import React, { useEffect, useRef } from 'react';
import './theme.css';

export interface WireProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'field' | 'graveyard';
  offset?: number;
  className?: string;
}

export const Wire: React.FC<WireProps> = ({ from, to, type, offset = 0, className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Calculate control points for bezier curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Control point offset based on wire type
    const controlOffset = type === 'field' ? -60 : 40;
    const controlX = from.x + dx * 0.5;
    const controlY = from.y + dy * 0.5 + controlOffset + offset;
    
    // Create path
    const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
    
    // Update SVG path
    const pathElement = svg.querySelector('path');
    if (pathElement) {
      pathElement.setAttribute('d', path);
    }
  }, [from, to, type, offset]);

  return (
    <svg
      ref={svgRef}
      className={`wire wire--${type} ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <path
        d=""
        stroke={type === 'field' ? 'var(--card-blue)' : 'var(--card-red)'}
        strokeWidth="3"
        fill="none"
        strokeDasharray={type === 'field' ? '5,5' : 'none'}
        opacity="0.7"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />
    </svg>
  );
};

export interface WiresProps {
  seats: Array<{
    id: string;
    position: { x: number; y: number };
  }>;
  center: { x: number; y: number };
  fieldPosition: { x: number; y: number };
  graveyardPosition: { x: number; y: number };
  className?: string;
}

export const Wires: React.FC<WiresProps> = ({
  seats,
  center,
  fieldPosition,
  graveyardPosition,
  className = ''
}) => {
  return (
    <div className={`wires ${className}`}>
      {seats.map((seat, index) => (
        <React.Fragment key={seat.id}>
          {/* Wire to field */}
          <Wire
            from={seat.position}
            to={fieldPosition}
            type="field"
            offset={index * 12} // Fan out effect
          />
          {/* Wire to graveyard */}
          <Wire
            from={seat.position}
            to={graveyardPosition}
            type="graveyard"
            offset={index * 12} // Fan out effect
          />
        </React.Fragment>
      ))}
    </div>
  );
};
