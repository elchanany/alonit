'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('ALONIT CLIENT CRASH:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white p-6 text-center z-50 fixed inset-0">
      <h2 className="text-2xl text-red-500 font-bold mb-4">שגיאת מערכת חמורה</h2>
      <p className="text-indigo-200 mb-4 max-w-md">
        אנא צלמי את המסך הזה ושלחי למפתח כדי שנוכל לתקן את התקלה מיד:
      </p>
      
      <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl text-left dir-ltr w-full max-w-md overflow-x-auto mb-8 font-mono text-xs text-red-200 break-words whitespace-pre-wrap">
        <span className="font-bold block mb-2">{error.name}: {error.message}</span>
        <span className="opacity-70">{error.stack}</span>
      </div>

      <button
        onClick={() => reset()}
        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/20"
      >
        רענן את הפיד
      </button>
    </div>
  );
}
