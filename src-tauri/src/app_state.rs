use std::sync::Mutex;
use std::time::Instant;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WindowMode {
    Mini,
    App,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    pub shortcut: String,
    pub toggle_shortcut: String,
    pub settings_shortcut: String,
    pub new_chat_shortcut: String,
    pub always_on_top: bool,
    pub close_to_tray: bool,
    pub start_at_startup: bool,
    pub language: String,
}

impl Default for UserSettings {
    fn default() -> Self {
        let sys_lang = sys_locale::get_locale().unwrap_or_else(|| String::from("en"));
        let short_lang = sys_lang.split('-').next().unwrap_or("en").to_string();
        
        let mut final_lang = short_lang.clone();
        let supported_langs = ["tr", "az", "en", "de", "es", "fr", "pt", "it", "zh", "ja", "ru", "ko", "ar", "hi", "id", "vi", "th", "nl", "sv", "pl", "uk"];
        
        if !supported_langs.contains(&final_lang.as_str()) {
            final_lang = "en".to_string();
        }

        Self {
            shortcut: "Alt+Space".to_string(),
            toggle_shortcut: "Alt+F".to_string(),
            settings_shortcut: "Ctrl+.".to_string(),
            new_chat_shortcut: "Ctrl+N".to_string(),
            always_on_top: false,
            close_to_tray: true,
            start_at_startup: false,
            language: final_lang,
        }
    }
}

pub struct AppState {
    pub window_mode: Mutex<WindowMode>,
    pub last_shortcut_trigger: Mutex<Option<Instant>>,
    pub last_tray_trigger: Mutex<Option<Instant>>,
    pub settings: Mutex<UserSettings>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            window_mode: Mutex::new(WindowMode::App),
            last_shortcut_trigger: Mutex::new(None),
            last_tray_trigger: Mutex::new(None),
            settings: Mutex::new(UserSettings::default()),
        }
    }
}
