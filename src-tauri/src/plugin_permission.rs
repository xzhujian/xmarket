use tauri::AppHandle;

/// 插件调用宿主能力的统一入口（权限网关）。
///
/// 插件不能直接调宿主命令（read_config、save_skin 等），只能通过本命令访问宿主能力。
/// 权限模型尚未完善，本命令当前仅打通调用链路并占位；实际的权限校验与能力分发为 TODO。
#[tauri::command]
pub fn plugin_invoke(
    _app: AppHandle,
    plugin_id: String,
    permission: String,
    _args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // TODO: 权限模型完善后，在此校验 plugin_id 是否有 permission 的权限，
    //       校验通过后分发到对应宿主能力执行。
    Ok(serde_json::json!({
        "status": "ok",
        "plugin_id": plugin_id,
        "permission": permission,
    }))
}
