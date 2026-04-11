use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use crate::app_state::{AppState, WindowMode, UserSettings};
use crate::window_manager::WindowManager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_store::StoreExt;
use std::str::FromStr;

#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    } else {
        let _settings_window = WebviewWindowBuilder::new(
            &app,
            "settings",
            WebviewUrl::App("index.html".parse().unwrap())
        )
        .title("Gemini - Settings")
        .inner_size(870.0, 620.0)
        .resizable(false)
        .decorations(true)
        .always_on_top(false)
        .background_color(tauri::window::Color(19, 19, 20, 255)) // #131314 - Beyaz flash önleme
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<UserSettings, String> {
    let settings = state.settings.lock().map_err(|_| "Settings locked")?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    new_settings: UserSettings
) -> Result<(), String> {
    let (shortcut_changed, toggle_shortcut_changed, settings_shortcut_changed, new_chat_shortcut_changed, always_on_top_changed) = {
        let settings = state.settings.lock().map_err(|_| "Settings locked")?;
        (
            settings.shortcut != new_settings.shortcut,
            settings.toggle_shortcut != new_settings.toggle_shortcut,
            settings.settings_shortcut != new_settings.settings_shortcut,
            settings.new_chat_shortcut != new_settings.new_chat_shortcut,
            settings.always_on_top != new_settings.always_on_top
        )
    };
    

    if shortcut_changed {
        let _ = update_shortcut(app.clone(), state.clone(), new_settings.shortcut.clone()).await;
    }
    if toggle_shortcut_changed {
        let _ = update_toggle_shortcut(app.clone(), state.clone(), new_settings.toggle_shortcut.clone()).await;
    }
    if settings_shortcut_changed {
        let _ = update_settings_hotkey_command(app.clone(), state.clone(), new_settings.settings_shortcut.clone()).await;
    }
    if new_chat_shortcut_changed {
        let _ = update_new_chat_shortcut(app.clone(), state.clone(), new_settings.new_chat_shortcut.clone()).await;
    }

    if always_on_top_changed {
        if let Some(w) = app.get_webview_window("main") {
            let mode = state.window_mode.lock().unwrap();
            if *mode == WindowMode::Mini {
                let _ = w.set_always_on_top(new_settings.always_on_top);
            }
        }
    }
    if let Ok(store) = app.store("settings.json") {
        store.set("config", serde_json::to_value(&new_settings).unwrap());
        let _ = store.save();
    }

    let mut settings = state.settings.lock().map_err(|_| "Settings locked")?;
    let old_lang = settings.language.clone();
    *settings = new_settings.clone();
    
    if old_lang != new_settings.language {
        let _ = crate::tray::update_tray_labels(&app, &new_settings.language);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn update_shortcut(app: AppHandle, state: State<'_, AppState>, new_shortcut: String) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|_| "Settings locked")?;
    let old_shortcut_str = settings.shortcut.clone();
    
    let shortcut_plugin = app.global_shortcut();
    
    if let Ok(old_s) = Shortcut::from_str(&old_shortcut_str) {
        let _ = shortcut_plugin.unregister(old_s);
    }
    crate::shortcuts::register_shortcut(&app, &new_shortcut).map_err(|e| e.to_string())?;
    
    settings.shortcut = new_shortcut;
    Ok(())
}

#[tauri::command]
pub async fn update_settings_hotkey_command(app: AppHandle, state: State<'_, AppState>, new_shortcut: String) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|_| "Settings locked")?;
    let old_shortcut_str = settings.settings_shortcut.clone();
    
    let shortcut_plugin = app.global_shortcut();
    
    if let Ok(old_s) = Shortcut::from_str(&old_shortcut_str) {
        let _ = shortcut_plugin.unregister(old_s);
    }

    crate::shortcuts::register_settings_shortcut(&app, &new_shortcut).map_err(|e| e.to_string())?;
    
    settings.settings_shortcut = new_shortcut;
    Ok(())
}

#[tauri::command]
pub async fn update_toggle_shortcut(app: AppHandle, state: State<'_, AppState>, new_shortcut: String) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|_| "Settings locked")?;
    let old_shortcut_str = settings.toggle_shortcut.clone();
    
    let shortcut_plugin = app.global_shortcut();
    
    if let Ok(old_s) = Shortcut::from_str(&old_shortcut_str) {
        let _ = shortcut_plugin.unregister(old_s);
    }

    crate::shortcuts::register_mode_toggle_shortcut(&app, &new_shortcut).map_err(|e| e.to_string())?;
    
    settings.toggle_shortcut = new_shortcut;
    Ok(())
}

#[tauri::command]
pub async fn update_new_chat_shortcut(app: AppHandle, state: State<'_, AppState>, new_shortcut: String) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|_| "Settings locked")?;
    let old_shortcut_str = settings.new_chat_shortcut.clone();
    
    let shortcut_plugin = app.global_shortcut();
    
    if let Ok(old_s) = Shortcut::from_str(&old_shortcut_str) {
        let _ = shortcut_plugin.unregister(old_s);
    }

    crate::shortcuts::register_new_chat_shortcut(&app, &new_shortcut).map_err(|e| e.to_string())?;
    
    settings.new_chat_shortcut = new_shortcut;
    Ok(())
}

#[tauri::command]
pub async fn toggle_mini_mode(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    let mut mode = state.window_mode.lock().map_err(|_| "Mutex error")?;
    let settings = state.settings.lock().map_err(|_| "Settings locked")?;

    match *mode {
        WindowMode::App => {
            WindowManager::apply_mini_mode(&window, &settings).map_err(|e| e.to_string())?;
            *mode = WindowMode::Mini;
        }
        WindowMode::Mini => {
            WindowManager::apply_app_mode(&window).map_err(|e| e.to_string())?;
            *mode = WindowMode::App;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn close_to_tray(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    WindowManager::hide_to_tray(&window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.close();
    }
    Ok(())
}

#[tauri::command]
pub async fn exit_app(app: AppHandle) {
    app.exit(0);
}
