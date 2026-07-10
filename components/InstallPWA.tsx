import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
  };

  if (!supportsPWA) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white shadow-lg border border-slate-200 rounded-xl p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Download className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">App installieren</h3>
          <p className="text-sm text-slate-600 mt-1">
            Installieren Sie Wohnpro Guide auf Ihrem Gerät für schnellen Zugriff und Offline-Unterstützung.
          </p>
          <button
            onClick={onClick}
            className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Jetzt installieren
          </button>
        </div>
      </div>
    </div>
  );
}
