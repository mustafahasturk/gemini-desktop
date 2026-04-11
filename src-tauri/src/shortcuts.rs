use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use std::str::FromStr;
use std::time::{Instant, Duration};
use crate::app_state::{AppState, WindowMode};
use crate::window_manager::WindowManager;

pub fn setup_shortcuts(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap();
    let hotkey_str = settings.shortcut.clone();
    let toggle_hotkey_str = settings.toggle_shortcut.clone();
    let settings_hotkey_str = settings.settings_shortcut.clone();
    let new_chat_hotkey_str = settings.new_chat_shortcut.clone();
    drop(settings);

    register_shortcut(app, &hotkey_str)?;
    register_settings_shortcut(app, &settings_hotkey_str)?;
    register_mode_toggle_shortcut(app, &toggle_hotkey_str)?;
    register_new_chat_shortcut(app, &new_chat_hotkey_str)?;
    Ok(())
}

pub fn register_new_chat_shortcut(app: &AppHandle, hotkey_str: &str) -> tauri::Result<()> {
    let shortcut = Shortcut::from_str(hotkey_str)
        .map_err(|e| tauri::Error::from(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

    let _ = app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.navigate("https://gemini.google.com".parse().unwrap());
                let _ = w.show();
                let _ = w.set_focus();
            }
        }
    });

    Ok(())
}

pub fn register_mode_toggle_shortcut(app: &AppHandle, hotkey_str: &str) -> tauri::Result<()> {
    let shortcut = Shortcut::from_str(hotkey_str)
        .map_err(|e| tauri::Error::from(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

    let _ = app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = crate::commands::toggle_mini_mode(app_handle.clone(), app_handle.state()).await;
            });
        }
    });
    Ok(())
}

pub fn register_settings_shortcut(app: &AppHandle, hotkey_str: &str) -> tauri::Result<()> {
    let shortcut = Shortcut::from_str(hotkey_str)
        .map_err(|e| tauri::Error::from(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

    let _ = app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = crate::commands::open_settings_window(app_handle).await;
            });
        }
    });

    Ok(())
}

pub fn register_shortcut(app: &AppHandle, hotkey_str: &str) -> tauri::Result<()> {
    let shortcut = Shortcut::from_str(hotkey_str).map_err(|e| tauri::Error::from(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

    let _ = app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let state = app.state::<AppState>();
            
            let mut last_trigger = state.last_shortcut_trigger.lock().unwrap();
            if let Some(last) = *last_trigger {
                if last.elapsed() < Duration::from_millis(300) {
                    return;
                }
            }
            *last_trigger = Some(Instant::now());
            
            if let Some(main) = app.get_webview_window("main") {
                let is_visible = main.is_visible().unwrap_or(false);
                let is_focused = main.is_focused().unwrap_or(false);
                let settings = state.settings.lock().unwrap();
                let mode = state.window_mode.lock().unwrap();
                let is_mini = *mode == WindowMode::Mini;
                
                if is_visible && (is_focused || is_mini) {
                    let _ = WindowManager::hide_to_tray(&main);
                } else {
                    drop(mode);
                    let mut mode_mut = state.window_mode.lock().unwrap();
                    let _ = WindowManager::apply_mini_mode(&main, &settings);
                    *mode_mut = WindowMode::Mini;
                }
            }
        }
    });

    Ok(())
}
