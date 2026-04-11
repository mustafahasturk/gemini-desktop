import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useI18n } from "../i18n/i18nContext";
import geminiLogo from "../assets/gemini.png";


interface UserSettings {
  shortcut: string;
  toggle_shortcut: string;
  settings_shortcut: string;
  always_on_top: boolean;
  close_to_tray: boolean;
  start_at_startup: boolean;
  language: string;
  new_chat_shortcut: string;
}

interface SettingsProps {
  onClose: () => void;
}

type Section = "shortcuts" | "general" | "language" | "about";

export function Settings({ onClose }: SettingsProps) {
  const { t, setLanguage } = useI18n();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("shortcuts");
  const [recordingType, setRecordingType] = useState<"main" | "toggle" | "settings" | "new_chat" | null>(null);
  const [appVersion, setAppVersion] = useState<string>("1.0.0");

  useEffect(() => {
    import("@tauri-apps/api/app").then(app => app.getVersion()).then(setAppVersion).catch(() => { });
  }, []);

  const closeWindow = async () => {
    try {
      await invoke("close_settings_window");
    } catch (e) {
      console.error("Failed to close window:", e);
    }
    onClose();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!recordingType) return;

      e.preventDefault();
      e.stopPropagation();

      // Cancel with Escape
      if (e.key === "Escape") {
        setRecordingType(null);
        return;
      }

      const keys = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.metaKey) keys.push("Meta");

      if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        let key = e.key.toUpperCase();
        if (key === " ") key = "Space";
        if (key === ",") key = "Comma";
        if (key === ".") key = "Period";
        if (key.startsWith("ARROW")) key = key.replace("ARROW", "");

        if (keys.length === 0 && !key.startsWith("F") && !["INSERT", "DELETE", "HOME", "END", "PAGEUP", "PAGEDOWN", "PRINTSCREEN", "SCROLLLOCK", "PAUSE"].includes(key)) {
          return;
        }

        keys.push(key);

        const newShortcut = keys.join("+");
        if (settings) {
          if (recordingType === "main") setSettings({ ...settings, shortcut: newShortcut });
          else if (recordingType === "toggle") setSettings({ ...settings, toggle_shortcut: newShortcut });
          else if (recordingType === "settings") setSettings({ ...settings, settings_shortcut: newShortcut });
          else setSettings({ ...settings, new_chat_shortcut: newShortcut });
        }
        setRecordingType(null);
      }
    };

    if (recordingType) {
      window.addEventListener("keydown", handleGlobalKeyDown, true);
    }

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [recordingType, settings]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await invoke<UserSettings>("get_settings");
      const autoStart = await isEnabled().catch(() => false);
      setSettings({ ...s, start_at_startup: autoStart });
      // Set i18n language from settings
      if (s.language) {
        setLanguage(s.language as any);
      }
    } catch (e) {
      setSettings({
        shortcut: "Alt+Space",
        toggle_shortcut: "Alt+F",
        settings_shortcut: "Ctrl+.",
        always_on_top: false,
        close_to_tray: true,
        start_at_startup: false,
        language: "tr",
        new_chat_shortcut: "Ctrl+N"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await invoke("update_settings", { newSettings: settings });
      if (settings.start_at_startup) await enable();
      else await disable();

      if (settings.language) {
        setLanguage(settings.language as any);
      }

      closeWindow();
    } catch (e) {
      alert(t("error") + ": " + e);
    }
  };

  const resetShortcut = (type: "main" | "toggle" | "settings" | "new_chat") => {
    if (!settings) return;
    const defaults = { main: "Alt+Space", toggle: "Alt+F", settings: "Ctrl+.", new_chat: "Ctrl+N" };
    setSettings({
      ...settings,
      [type === "main" ? "shortcut" : type === "toggle" ? "toggle_shortcut" : type === "settings" ? "settings_shortcut" : "new_chat_shortcut"]: defaults[type]
    });
    setRecordingType(null);
  };

  if (loading || !settings) return <div className="native-container"></div>;

  return (
    <div className="native-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>{t("settings")}</h1>
        </div>
        <div
          className={`nav-item ${activeSection === "shortcuts" ? "active" : ""}`}
          onClick={() => setActiveSection("shortcuts")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="6" x2="6.01" y1="10" y2="10" /><line x1="10" x2="10.01" y1="10" y2="10" /><line x1="14" x2="14.01" y1="10" y2="10" /><line x1="18" x2="18.01" y1="10" y2="10" /><line x1="7" x2="7.01" y1="14" y2="14" /><line x1="11" x2="11.01" y1="14" y2="14" /><line x1="15" x2="15.01" y1="14" y2="14" /><line x1="8" x2="16" y1="18" y2="18" /></svg>
          {t("shortcuts")}
        </div>
        <div
          className={`nav-item ${activeSection === "general" ? "active" : ""}`}
          onClick={() => setActiveSection("general")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
          {t("general")}
        </div>

        <div
          className={`nav-item ${activeSection === "language" ? "active" : ""}`}
          onClick={() => setActiveSection("language")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2v20" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          {t("language")}
        </div>

        <div style={{ flex: 1 }}></div>

        <div
          className={`nav-item ${activeSection === "about" ? "active" : ""}`}
          onClick={() => setActiveSection("about")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          {t("about")}
        </div>

        <div className="sidebar-footer">
          <div className="social-links-row">
            <button className="social-icon-btn" onClick={() => openUrl("https://github.com/mustafahasturk")} title="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </button>
            <button className="social-icon-btn" onClick={() => openUrl("https://x.com/mstfhasturk")} title="X">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
            </button>
            <button className="social-icon-btn" onClick={() => openUrl("https://instagram.com/mstfhasturk")} title="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </button>
            <button className="social-icon-btn" onClick={() => openUrl("mailto:mustafahasturk@protonmail.com")} title="Email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {activeSection !== "about" && (
          <div className="content-header">
            <h2>
              {activeSection === "shortcuts" && t("shortcutsTitle")}
              {activeSection === "general" && t("generalTitle")}
              {activeSection === "language" && t("languageTitle")}
            </h2>
          </div>
        )}

        <div className="content-body">
          {activeSection === "shortcuts" && (
            <div className="settings-group">
              <div className="list-item">
                <div className="item-info">
                  <label>{t("mainPencere")}</label>
                  <span>{t("mainPencereDesc")}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    className={`shortcut-btn ${recordingType === "main" ? "recording" : ""}`}
                    onClick={() => setRecordingType("main")}
                  >
                    {recordingType === "main" ? t("pressToRecord") : settings.shortcut}
                  </div>
                  <button className="reset-small" onClick={() => resetShortcut("main")}>{t("resetDefault")}</button>
                </div>
              </div>

              <div className="list-item">
                <div className="item-info">
                  <label>{t("windowModeToggle")}</label>
                  <span>{t("windowModeToggleDesc")}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    className={`shortcut-btn ${recordingType === "toggle" ? "recording" : ""}`}
                    onClick={() => setRecordingType("toggle")}
                  >
                    {recordingType === "toggle" ? t("pressToRecord") : settings.toggle_shortcut}
                  </div>
                  <button className="reset-small" onClick={() => resetShortcut("toggle")}>{t("resetDefault")}</button>
                </div>
              </div>

              <div className="list-item">
                <div className="item-info">
                  <label>{t("openSettings")}</label>
                  <span>{t("openSettingsDesc")}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    className={`shortcut-btn ${recordingType === "settings" ? "recording" : ""}`}
                    onClick={() => setRecordingType("settings")}
                  >
                    {recordingType === "settings" ? t("pressToRecord") : settings.settings_shortcut}
                  </div>
                  <button className="reset-small" onClick={() => resetShortcut("settings")}>{t("resetDefault")}</button>
                </div>
              </div>

              <div className="list-item">
                <div className="item-info">
                  <label>{t("newChat")}</label>
                  <span>{t("newChatDesc")}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    className={`shortcut-btn ${recordingType === "new_chat" ? "recording" : ""}`}
                    onClick={() => setRecordingType("new_chat")}
                  >
                    {recordingType === "new_chat" ? t("pressToRecord") : settings.new_chat_shortcut}
                  </div>
                  <button className="reset-small" onClick={() => resetShortcut("new_chat")}>{t("resetDefault")}</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "general" && (
            <div className="settings-group">
              <div className="list-item">
                <div className="item-info">
                  <label>{t("runInBackground")}</label>
                  <span>{t("runInBackgroundDesc")}</span>
                </div>
                <label className="sys-switch">
                  <input
                    type="checkbox"
                    checked={settings.close_to_tray}
                    onChange={e => setSettings({ ...settings, close_to_tray: e.target.checked })}
                  />
                  <span className="sys-slider"></span>
                </label>
              </div>

              <div className="list-item">
                <div className="item-info">
                  <label>{t("startAtStartup")}</label>
                  <span>{t("startAtStartupDesc")}</span>
                </div>
                <label className="sys-switch">
                  <input
                    type="checkbox"
                    checked={settings.start_at_startup}
                    onChange={e => setSettings({ ...settings, start_at_startup: e.target.checked })}
                  />
                  <span className="sys-slider"></span>
                </label>
              </div>

              <div className="list-item">
                <div className="item-info">
                  <label>{t("miniAlwaysOnTop")}</label>
                  <span>{t("miniAlwaysOnTopDesc")}</span>
                </div>
                <label className="sys-switch">
                  <input
                    type="checkbox"
                    checked={settings.always_on_top}
                    onChange={e => setSettings({ ...settings, always_on_top: e.target.checked })}
                  />
                  <span className="sys-slider"></span>
                </label>
              </div>
            </div>
          )}

          {activeSection === "language" && (
            <div className="settings-group">
              <div className="language-grid">
                {(["tr", "az", "en", "de", "es", "fr", "pt", "it", "zh", "ja", "ru", "ko", "ar", "hi", "id", "vi", "th", "nl", "sv", "pl", "uk"] as const).map((lang) => {
                  const names: Record<string, { label: string, info: string }> = {
                    tr: { label: "Türkçe", info: "TR / Türkçe" },
                    az: { label: "Azərbaycan", info: "AZ / Azərbaycan" },
                    en: { label: "English", info: "EN / English" },
                    de: { label: "Deutsch", info: "DE / Deutsch" },
                    es: { label: "Español", info: "ES / Español" },
                    fr: { label: "Français", info: "FR / Français" },
                    pt: { label: "Português", info: "PT / Português" },
                    it: { label: "Italiano", info: "IT / Italiano" },
                    zh: { label: "中文", info: "ZH / 中文" },
                    ja: { label: "日本語", info: "JA / 日本語" },
                    ru: { label: "Русский", info: "RU / Русский" },
                    ko: { label: "한국어", info: "KO / 한국어" },
                    ar: { label: "العربية", info: "AR / العربية" },
                    hi: { label: "हिन्दी", info: "HI / हिन्दी" },
                    id: { label: "Bahasa Indonesia", info: "ID / Indonesia" },
                    vi: { label: "Tiếng Việt", info: "VI / Tiếng Việt" },
                    th: { label: "ไทย", info: "TH / ภาษาไทย" },
                    nl: { label: "Nederlands", info: "NL / Nederlands" },
                    sv: { label: "Svenska", info: "SV / Svenska" },
                    pl: { label: "Polski", info: "PL / Polski" },
                    uk: { label: "Українська", info: "UK / Українська" }
                  };
                  return (
                    <button
                      key={lang}
                      className={`lang-card ${settings.language === lang ? "active" : ""}`}
                      onClick={() => {
                        setSettings({ ...settings, language: lang });
                        setLanguage(lang);
                      }}
                    >
                      <div className="lang-info">
                        <span className="lang-name">{names[lang].label}</span>
                        <span className="lang-native">{names[lang].info}</span>
                      </div>
                      {settings.language === lang && (
                        <div className="active-indicator">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "about" && (
            <div className="about-centered">
              <div className="about-brand">
                <img src={geminiLogo} alt="Gemini" className="about-logo" />
                <h2>Gemini Desktop</h2>
                <div className="about-version">{t("version")} {appVersion}</div>
              </div>

              <div className="about-info-centered">
                <p className="about-text">{t("appDescription")}</p>

                <div className="about-divider"></div>

                <div className="about-credits-centered">
                  <span className="developed-by">Designed & Developed by</span>
                  <div className="dev-name">Mustafa Hastürk</div>

                  <div className="about-links-centered">
                    <button onClick={() => openUrl("https://github.com/mustafahasturk/gemini-desktop")} title="GitHub">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    </button>
                    <button onClick={() => openUrl("https://x.com/mstfhasturk")} title="X">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
                    </button>
                    <button onClick={() => openUrl("mailto:mustafahasturk@protonmail.com")} title="Email">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeSection !== "about" && (
          <div className="content-footer">
            <button className="sys-btn sys-btn-secondary" onClick={closeWindow}>{t("cancel")}</button>
            <button className="sys-btn sys-btn-primary" onClick={handleSave}>{t("saveChanges")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
