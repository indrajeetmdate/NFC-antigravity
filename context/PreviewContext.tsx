
import React, { createContext, useContext, useState } from 'react';

interface PreviewContextType {
  previewSlug: string | null;
  setPreviewSlug: (slug: string | null) => void;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

export const PreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  return (
    <PreviewContext.Provider value={{ previewSlug, setPreviewSlug }}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => {
  const context = useContext(PreviewContext);
  if (!context) throw new Error('usePreview must be used within a PreviewProvider');
  return context;
};
