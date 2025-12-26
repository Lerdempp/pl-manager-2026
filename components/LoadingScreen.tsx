import React from 'react';

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="h-screen w-full bg-zinc-950 relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>
      
      <div className="z-10 flex flex-col items-center gap-6 p-8 rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/5 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse"></div>
          <svg className="animate-spin h-10 w-10 text-emerald-400 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-lg font-medium text-zinc-200 tracking-wide">{message}</p>
      </div>
    </div>
  );
};

