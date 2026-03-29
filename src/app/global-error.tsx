'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-black text-white p-4">
        <div className="flex flex-col items-center justify-center min-h-[100dvh]">
          <h2 className="text-2xl text-red-500 font-bold mb-4">קריסת מערכת גלובלית</h2>
          <p className="text-indigo-200 mb-4 text-center">
            אנא צלמי את המסך ולשלוח למפתח לתיקון:
          </p>
          
          <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl text-left dir-ltr w-full max-w-sm overflow-x-auto mb-8 font-mono text-xs text-red-300 break-words whitespace-pre-wrap">
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
      </body>
    </html>
  );
}
