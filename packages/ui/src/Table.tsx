import React from 'react';
import './theme.css';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Table: React.FC<TableProps> = ({ children, className = '', style }) => {
  return (
    <div 
      className={`table-surface ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse at center, rgba(58, 134, 125, 0.3) 0%, rgba(45, 105, 98, 0.5) 100%)
        `,
        borderRadius: '50%',
        boxShadow: `
          inset 0 0 60px rgba(0, 0, 0, 0.25),
          0 0 80px rgba(0, 0, 0, 0.4)
        `,
        border: '6px solid rgba(255, 255, 255, 0.8)',
        ...style
      }}
    >
      {children}
    </div>
  );
};
