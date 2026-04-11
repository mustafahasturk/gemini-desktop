import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { Settings } from "./components/Settings";
import { I18nProvider } from "./i18n/i18nContext";
import "./App.css";

const appWindow = getCurrentWindow();

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const [initialLanguage, setInitialLanguage] = useState<string>("tr");

  useEffect(() => {
    setWindowLabel(appWindow.label);

    invoke<{ language: string, start_at_startup: boolean }>("get_settings")
      .then(s => {
        setInitialLanguage(s.language);
        if (s.start_at_startup) enable().catch(console.error);
        else disable().catch(console.error);
      })
      .catch(() => setInitialLanguage("tr"));
  }, []);

  const content = windowLabel === "settings" ? (
    <div className="glass-container settings-page">
      <Settings onClose={() => { }} />
    </div>
  ) : (
    <div className="glass-container">
      <div className="content full-content">
        <iframe
          src="https://gemini.google.com"
          className="gemini-iframe"
          title="Gemini"
          allow="clipboard-read; clipboard-write; microphone"
        />
      </div>
    </div>
  );

  return (
    <I18nProvider initialLanguage={initialLanguage}>
      {content}
    </I18nProvider>
  );
}

export default App;
