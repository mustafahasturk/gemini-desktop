mod app_state;
mod commands;
mod tray;
mod shortcuts;
mod window_manager;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use app_state::{AppState, UserSettings};
use window_manager::WindowManager;
use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Disable DMABUF renderer on Linux to prevent white screen issues caused by GPU driver incompatibilities.
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .invoke_handler(tauri::generate_handler![
            commands::toggle_mini_mode,
            commands::close_to_tray,
            commands::exit_app,
            commands::get_settings,
            commands::update_settings,
            commands::update_shortcut,
            commands::update_toggle_shortcut,
            commands::update_settings_hotkey_command,
            commands::update_new_chat_shortcut,
            commands::open_settings_window,
            commands::close_settings_window
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            {
                let state = app_handle.state::<AppState>();
                let mut settings_lock = state.settings.lock().unwrap();
                
                if let Ok(store) = app_handle.store("settings.json") {
                    if let Some(val) = store.get("config") {
                        if let Ok(s) = serde_json::from_value::<UserSettings>(val) {
                            *settings_lock = s;
                        }
                    }
                }
            }

            let user_agent = if cfg!(target_os = "windows") {
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            } else if cfg!(target_os = "macos") {
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            } else {
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            };

            let handle_nav = app.handle().clone();
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://gemini.google.com".parse().unwrap())
            )
            .title("Gemini")
            .inner_size(1000.0, 650.0)
            .decorations(true)
            .resizable(true)
            .always_on_top(false)
            .user_agent(user_agent)
            .on_navigation(move |url: &tauri::Url| {
                let host = url.host_str().unwrap_or("");
                if host == "gemini.google.com" || host == "accounts.google.com" || host == "myaccount.google.com" {
                    true
                } else {
                    use tauri_plugin_opener::OpenerExt;
                    let _ = handle_nav.opener().open_url(url.as_str(), None::<&str>);
                    false
                }
            })
            .build()?;

            let _ = WindowManager::apply_app_mode(&window);

            tray::setup_tray(app.handle())?;
            shortcuts::setup_shortcuts(app.handle())?;

            let handle = app.handle().clone();
            window.on_window_event(move |event| {
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        let state = handle.state::<AppState>();
                        let settings = state.settings.lock().unwrap();
                        
                        if settings.close_to_tray {
                            if let Some(w) = handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                            api.prevent_close();
                        }
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
