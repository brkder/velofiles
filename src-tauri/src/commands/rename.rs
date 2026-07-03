use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRule {
    /// Template supporting tokens: {name} {ext} {n} {n:3} {date} {time} {uid} {parent}
    pub template: String,
    /// Optional find/replace applied to the original stem before templating.
    pub find: String,
    pub replace: String,
    pub use_regex: bool,
    pub case_insensitive: bool,
    pub counter_start: i64,
    pub counter_step: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenamePlanItem {
    pub from: String,
    pub to: String,
    pub ok: bool,
    pub error: String,
}

fn short_uid(seed: usize) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:x}", now.wrapping_add(seed as u128 * 0x9e3779b9))
        .chars()
        .rev()
        .take(8)
        .collect()
}

fn apply_template(rule: &RenameRule, path: &Path, index: usize) -> Result<String, String> {
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();
    let parent = path
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // Step 1: find/replace on the stem.
    let mut name = stem.clone();
    if !rule.find.is_empty() {
        if rule.use_regex {
            let pattern = if rule.case_insensitive {
                format!("(?i){}", rule.find)
            } else {
                rule.find.clone()
            };
            let re = Regex::new(&pattern).map_err(|e| format!("Invalid regex: {e}"))?;
            name = re.replace_all(&name, rule.replace.as_str()).to_string();
        } else if rule.case_insensitive {
            let lower_name = name.to_lowercase();
            let lower_find = rule.find.to_lowercase();
            let mut result = String::new();
            let mut rest = name.as_str();
            let mut rest_lower = lower_name.as_str();
            while let Some(pos) = rest_lower.find(&lower_find) {
                result.push_str(&rest[..pos]);
                result.push_str(&rule.replace);
                rest = &rest[pos + rule.find.len()..];
                rest_lower = &rest_lower[pos + lower_find.len()..];
            }
            result.push_str(rest);
            name = result;
        } else {
            name = name.replace(&rule.find, &rule.replace);
        }
    }

    // Step 2: expand template tokens.
    let counter = rule.counter_start + (index as i64) * rule.counter_step;
    let modified: DateTime<Local> = std::fs::metadata(path)
        .and_then(|m| m.modified())
        .map(DateTime::from)
        .unwrap_or_else(|_| Local::now());

    let mut out = rule.template.clone();
    if out.trim().is_empty() {
        out = "{name}".to_string();
    }
    // {n:width} padded counters
    let re_pad = Regex::new(r"\{n:(\d+)\}").unwrap();
    out = re_pad
        .replace_all(&out, |caps: &regex::Captures| {
            let width: usize = caps[1].parse().unwrap_or(1);
            format!("{:0width$}", counter, width = width)
        })
        .to_string();
    out = out
        .replace("{name}", &name)
        .replace("{ext}", &ext)
        .replace("{n}", &counter.to_string())
        .replace("{date}", &modified.format("%Y-%m-%d").to_string())
        .replace("{time}", &modified.format("%H-%M-%S").to_string())
        .replace("{uid}", &short_uid(index))
        .replace("{parent}", &parent);

    // Re-attach the extension unless the template already used {ext}.
    if !ext.is_empty() && !rule.template.contains("{ext}") {
        out = format!("{out}.{ext}");
    }

    // Windows-invalid characters.
    if out.chars().any(|c| matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')) {
        return Err("INVALID_CHARS".to_string());
    }
    if out.trim().is_empty() {
        return Err("EMPTY_NAME".to_string());
    }
    Ok(out)
}

fn build_plan(paths: &[String], rule: &RenameRule) -> Vec<RenamePlanItem> {
    let mut seen = std::collections::HashSet::new();
    paths
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let path = PathBuf::from(p);
            match apply_template(rule, &path, i) {
                Ok(new_name) => {
                    let target = path
                        .parent()
                        .map(|par| par.join(&new_name))
                        .unwrap_or_else(|| PathBuf::from(&new_name));
                    let key = target.to_string_lossy().to_lowercase();
                    let duplicate = !seen.insert(key);
                    let exists = target.exists() && target != path;
                    RenamePlanItem {
                        from: p.clone(),
                        to: new_name,
                        ok: !duplicate && !exists,
                        error: if duplicate {
                            "DUPLICATE_TARGET".into()
                        } else if exists {
                            "ALREADY_EXISTS".into()
                        } else {
                            String::new()
                        },
                    }
                }
                Err(e) => RenamePlanItem {
                    from: p.clone(),
                    to: String::new(),
                    ok: false,
                    error: e,
                },
            }
        })
        .collect()
}

#[tauri::command]
pub fn batch_rename_preview(paths: Vec<String>, rule: RenameRule) -> Vec<RenamePlanItem> {
    build_plan(&paths, &rule)
}

#[tauri::command]
pub fn batch_rename_apply(paths: Vec<String>, rule: RenameRule) -> Result<u32, String> {
    let plan = build_plan(&paths, &rule);
    if plan.iter().any(|i| !i.ok) {
        return Err("PLAN_HAS_ERRORS".into());
    }
    let mut renamed = 0u32;
    for item in plan {
        let src = PathBuf::from(&item.from);
        let dst = src
            .parent()
            .map(|p| p.join(&item.to))
            .ok_or("No parent directory")?;
        if src == dst {
            continue;
        }
        std::fs::rename(&src, &dst).map_err(|e| format!("{}: {e}", item.from))?;
        renamed += 1;
    }
    Ok(renamed)
}
