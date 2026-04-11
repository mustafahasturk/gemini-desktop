use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use crate::app_state::{AppState, WindowMode};
use crate::window_manager::WindowManager;

use std::time::{Instant, Duration};

fn get_tray_text(app: &AppHandle, lang: &str, key: &str) -> String {
    use tauri::path::BaseDirectory;
    
    let lang_path = format!("{}.json", lang);
    let resource_path = app.path()
        .resolve(format!("../src/i18n/locales/{}", lang_path), BaseDirectory::Resource)
        .unwrap_or_default();

    let json_content = std::fs::read_to_string(&resource_path).unwrap_or_else(|_| {
        let fallback_path = app.path()
            .resolve("../src/i18n/locales/en.json", BaseDirectory::Resource)
            .unwrap_or_default();
        std::fs::read_to_string(fallback_path).unwrap_or_else(|_| "{}".to_string())
    });

    let v: serde_json::Value = serde_json::from_str(&json_content).unwrap_or_default();
    v.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or(key)
        .to_string()
}

pub fn update_tray_labels(app: &AppHandle, lang: &str) -> tauri::Result<()> {
    let show_text = get_tray_text(app, lang, "tray_open");
    let chat_text = get_tray_text(app, lang, "tray_new_chat");
    let settings_text = get_tray_text(app, lang, "tray_settings");
    let quit_text = get_tray_text(app, lang, "tray_quit");

    let show_app = MenuItem::with_id(app, "show_app", show_text, true, None::<&str>)?;
    let new_chat = MenuItem::with_id(app, "new_chat", chat_text, true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", settings_text, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_app, &new_chat, &settings, &quit])?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_menu(Some(menu));
    }
    Ok(())
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    let lang = {
        let s = state.settings.lock().unwrap();
        s.language.clone()
    };

    let show_text = get_tray_text(app, &lang, "tray_open");
    let chat_text = get_tray_text(app, &lang, "tray_new_chat");
    let settings_text = get_tray_text(app, &lang, "tray_settings");
    let quit_text = get_tray_text(app, &lang, "tray_quit");

    let show_app = MenuItem::with_id(app, "show_app", show_text, true, None::<&str>)?;
    let new_chat = MenuItem::with_id(app, "new_chat", chat_text, true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", settings_text, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_app, &new_chat, &settings, &quit])?;

    let _ = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .icon(app.default_window_icon().unwrap().clone())
        .on_menu_event(move |app, event| {
            let state = app.state::<AppState>();
            let mut mode = state.window_mode.lock().unwrap();

            match event.id.as_ref() {
                "show_app" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = WindowManager::apply_app_mode(&w);
                        *mode = WindowMode::App;
                    }
                }
                "new_chat" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.navigate("https://gemini.google.com".parse().unwrap());
                        let _ = WindowManager::apply_app_mode(&w);
                        *mode = WindowMode::App;
                    }
                }
                "settings" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = crate::commands::open_settings_window(handle).await;
                    });
                }
                "quit" => { app.exit(0); }
                _ => (),
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    let app = tray.app_handle();
                    let app_state = app.state::<AppState>();
                    
                    let mut last_trigger = app_state.last_tray_trigger.lock().unwrap();
                    if let Some(last) = *last_trigger {
                        if last.elapsed() < Duration::from_millis(500) {
                            return;
                        }
                    }
                    *last_trigger = Some(Instant::now());
                    drop(last_trigger);

                    let mut mode = app_state.window_mode.lock().unwrap();
                    
                    if let Some(w) = app.get_webview_window("main") {
                        let is_visible = w.is_visible().unwrap_or(false);
                        
                        if is_visible {
                            let _ = WindowManager::hide_to_tray(&w);
                        } else {
                            let settings = app_state.settings.lock().unwrap();
                            let _ = WindowManager::apply_mini_mode(&w, &settings);
                            *mode = WindowMode::Mini;
                        }
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
