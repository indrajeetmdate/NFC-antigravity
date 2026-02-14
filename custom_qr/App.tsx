
import React from 'react';
import QrCodeGenerator from './components/QrCodeGenerator';

const QrCodeGeneratorPage: React.FC = () => {

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <header className="text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gold to-yellow-200">
              Custom QR Code
            </span> Generator
          </h1>
          <p className="mt-2 text-base sm:text-lg text-zinc-400 max-w-3xl">
            This QR code will be added to your physical card and vCard.
          </p>
        </header>
      </div>
      
      <main>
        <QrCodeGenerator />
      </main>
      
    </div>
  );
};

export default QrCodeGeneratorPage;
