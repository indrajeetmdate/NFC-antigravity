
import React, { useState, useEffect, useRef } from 'react';
import type { CardFaceData } from '../../types';
import NfcIcon from './components_NfcIcon';

interface BusinessCardProps {
  data: CardFaceData;
  isActive?: boolean;
  onClick?: () => void;
  side: 'Front' | 'Back';
  onDragStart: (type: 'text' | 'image', id: string, e: React.MouseEvent | React.TouchEvent) => void;
  width?: number; // New optional prop for dynamic width
  height?: number; // New optional prop for dynamic height
  selectedElementId: string | null;
  onSelect: (type: 'text' | 'image', id: string) => void;
}

const BusinessCard = React.forwardRef<HTMLDivElement, BusinessCardProps>(({ 
    data, 
    isActive, 
    onClick, 
    side, 
    onDragStart, 
    width = 525, 
    height = 300,
    selectedElementId,
    onSelect 
}, ref) => {
  const { backgroundColor, nfcIconColor, texts, images, backgroundImageUrl, fullDesignUrl, urlColor } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate the scale to fit the card into the container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        // Use getBoundingClientRect for fractional widths which are more accurate during zoom/transform
        const parentWidth = containerRef.current.getBoundingClientRect().width;
        setScale(parentWidth / width);
      }
    };

    updateScale();
    
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [width]);
  
  return (
    <div className="relative group w-full flex justify-center" style={{ margin: '0 auto' }}>
        {/* Container that maintains aspect ratio and handles scaling logic */}
        <div 
          ref={containerRef} 
          className="relative" 
          style={{ 
              aspectRatio: `${width}/${height}`,
              width: '100%',
              // maxWidth constraint removed to allow filling container on large screens
          }}
        >
             {/* The internal wrapper applies the transform. 
                 We force width/height to match the native resolution so the 'ref' content renders correctly. */}
            <div 
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top left', 
                width: `${width}px`, 
                height: `${height}px` 
              }}
            >
                 {/* The clickable/active state wrapper */}
                <div 
                    onClick={onClick}
                    className="h-full w-full rounded-none transition-all duration-300"
                >
                     {/* The actual card content referenced for image generation */}
                    <div 
                      ref={ref} 
                      className="w-full h-full shadow-2xl rounded-xl font-poppins relative overflow-hidden select-none"
                      style={{ backgroundColor: backgroundColor, WebkitTapHighlightColor: 'transparent' }}
                    >
                        {/* 1. Background Layer (Full Design OR Background Image) */}
                        {fullDesignUrl ? (
                            <img src={fullDesignUrl} alt={`${side} Full Design`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover z-0" />
                        ) : backgroundImageUrl ? (
                            <img src={backgroundImageUrl} alt={`${side} card background`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover z-0" />
                        ) : null}

                        {/* 2. Editor Elements */}
                        {images.map((image) => (
                            <div
                            key={image.id}
                            className={`absolute cursor-move touch-none ${selectedElementId === image.id ? 'ring-2 ring-gold ring-offset-2 ring-offset-black/50 z-20' : 'z-10'}`}
                            style={{
                                left: `${image.x}%`,
                                top: `${image.y}%`,
                                width: `${image.width * image.scale}px`,
                                height: `${image.height * image.scale}px`,
                                transform: 'translate(-50%, -50%)',
                                mixBlendMode: image.mixBlendMode || 'normal', // Handle Blend Mode
                                WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => onDragStart('image', image.id, e)}
                            onTouchStart={(e) => onDragStart('image', image.id, e)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect('image', image.id);
                            }}
                            >
                            {image.url && (
                                <img src={image.url} alt={image.id} crossOrigin="anonymous" className="w-full h-full object-contain pointer-events-none" />
                            )}
                            </div>
                        ))}
                        
                        {texts.map((text) => (
                            <div
                            key={text.id}
                            className={`absolute cursor-move select-none whitespace-nowrap touch-none p-2 border border-transparent rounded ${selectedElementId === text.id ? 'ring-2 ring-gold bg-black/20 z-20' : 'z-10'}`}
                            style={{
                                left: `${text.x}%`,
                                top: `${text.y}%`,
                                transform: 'translate(-50%, -50%)',
                                color: text.color,
                                fontWeight: text.fontWeight,
                                fontFamily: text.fontFamily || 'Poppins',
                                fontSize: `${text.fontSize * text.scale}px`,
                                letterSpacing: `${text.letterSpacing}em`,
                                textAlign: text.textAlign,
                                WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => onDragStart('text', text.id, e)}
                            onTouchStart={(e) => onDragStart('text', text.id, e)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect('text', text.id);
                            }}
                            >
                            {text.content || '...'}
                            </div>
                        ))}

                        <NfcIcon className="absolute top-4 right-4 w-14 h-14 z-0 pointer-events-none opacity-80" fill={nfcIconColor} />

                        {side === 'Back' && (
                            <div
                                className="absolute bottom-4 left-6 text-[10px] font-medium tracking-wider z-0 pointer-events-none"
                                style={{ 
                                    color: urlColor || nfcIconColor, // Use specific URL color or fallback
                                    opacity: 0.6,
                                }}
                            >
                                www.canopycorp.in
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
});

export default BusinessCard;
