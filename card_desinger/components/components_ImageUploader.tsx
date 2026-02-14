

import React, { useRef } from 'react';

interface ImageUploaderProps {
  label: string;
  imageUrl: string | null;
  onImageUpload: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageUrl, onImageUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/jpeg, image/png"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className={`w-full h-32 border-2 border-dashed border-gold/50 rounded-lg flex items-center justify-center transition-all duration-300 hover:border-gold hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-gold`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="text-center text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gold/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="mt-2 block text-sm font-medium text-gold">{label}</span>
          </div>
        )}
      </button>
    </div>
  );
};

export default ImageUploader;