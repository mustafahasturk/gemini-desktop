use tauri::{WebviewWindow, LogicalSize};
use crate::app_state::UserSettings;

pub struct WindowManager;

impl WindowManager {
    pub fn apply_app_mode(window: &WebviewWindow) -> tauri::Result<()> {
        window.set_size(LogicalSize::new(1000.0, 650.0))?;
        window.set_always_on_top(false)?;
        window.set_skip_taskbar(false)?;
        window.show()?;
        window.set_focus()?;
        Ok(())
    }

    pub fn apply_mini_mode(window: &WebviewWindow, settings: &UserSettings) -> tauri::Result<()> {
        window.set_size(LogicalSize::new(450.0, 600.0))?;
        window.set_always_on_top(settings.always_on_top)?;
        window.set_skip_taskbar(true)?;
        window.show()?;
        window.set_focus()?;
        Ok(())
    }

    pub fn hide_to_tray(window: &WebviewWindow) -> tauri::Result<()> {
        window.hide()?;
        Ok(())
    }
}
