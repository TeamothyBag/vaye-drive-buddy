import React, { useState, useRef, memo } from 'react';
import { SlideToConfirmProps } from '@/types/map';
import styles from './SlideToConfirm.module.css';

const SlideToConfirm = memo(({
  onConfirm,
  text,
  confirmText,
  bgColor = "#4CAF50",
  disabled = false,
}: SlideToConfirmProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || disabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = Math.max(0, Math.min(clientX - rect.left - 30, rect.width - 60));
    setPosition(newPosition);
    
    // Auto-confirm if dragged to the end
    if (newPosition >= rect.width - 80) {
      handleEnd();
      onConfirm();
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPosition(0);
  };

  const containerWidth = containerRef.current?.clientWidth || 320;
  const maxPosition = containerWidth - 60;
  const progressPercentage = maxPosition > 0 ? (position / maxPosition) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.slideContainer} ${disabled ? styles.disabled : ''}`}
      style={{
        '--progress-width': `${progressPercentage}%`,
        '--bg-color': bgColor,
        '--thumb-position': `${4 + position}px`,
        '--thumb-transition': isDragging ? "none" : "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      } as React.CSSProperties}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Progress background */}
      <div className={styles.progressBackground} />
      
      {/* Draggable thumb */}
      <div
        className={`
          ${styles.thumb} 
          ${isDragging ? styles.dragging : styles.notDragging}
          ${disabled ? styles.disabled : ''}
        `}
        onMouseDown={(e) => {
          e.preventDefault();
          handleStart(e.clientX);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handleStart(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          handleMove(e.touches[0].clientX);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleEnd();
        }}
      >
        <span className={styles.thumbIcon}>→</span>
      </div>
      
      {/* Text overlay */}
      <div className={styles.textOverlay}>
        <span className="text-center">
          {progressPercentage > 50 ? confirmText : text}
        </span>
      </div>
    </div>
  );
});

SlideToConfirm.displayName = 'SlideToConfirm';

export default SlideToConfirm;