//! Search ranking engine.
//!
//! Ranking is tiered so that obviously-intended matches always beat loose ones:
//!   1. exact name match          (rank ~1,000,000)
//!   2. name starts with pattern  (rank ~500,000)
//!   3. substring at a word start (rank ~250,000)
//!   4. substring anywhere        (rank ~120,000)
//!   5. fuzzy subsequence         (rank < 100,000, only if dense enough)
//!
//! Tier 5 additionally requires a minimum density (score relative to pattern
//! length); a sparse subsequence like "rat" scattered across "gradle-wrapper"
//! is rejected instead of flooding results with noise.
//!
//! All comparisons use `fold()`: Unicode lowercase + combining-mark stripping
//! + Turkish dotless-ı normalization, so "İndirilenler" matches "indirilenler".

const TIER_EXACT: i64 = 1_000_000;
const TIER_PREFIX: i64 = 500_000;
const TIER_WORD_SUB: i64 = 250_000;
const TIER_SUB: i64 = 120_000;

/// Case- and accent-insensitive normalization for matching.
pub fn fold(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        for lc in c.to_lowercase() {
            match lc {
                // Combining diacritical marks (produced e.g. by 'İ'.to_lowercase()).
                '\u{0300}'..='\u{036F}' => {}
                'ı' => out.push('i'),
                other => out.push(other),
            }
        }
    }
    out
}

#[inline]
fn is_word_boundary(bytes: &[u8], pos: usize) -> bool {
    if pos == 0 {
        return true;
    }
    matches!(bytes[pos - 1], b' ' | b'_' | b'-' | b'.' | b'(' | b'[' | b'\'')
}

/// Dense subsequence score used only for tier 5. Higher is better.
fn subsequence_score(pattern: &[char], text: &[char]) -> Option<i32> {
    if pattern.len() > text.len() {
        return None;
    }
    let mut total: i32 = 0;
    let mut pi = 0usize;
    let mut streak: i32 = 0;
    let mut gaps: i32 = 0;

    for (ti, &tc) in text.iter().enumerate() {
        if pi >= pattern.len() {
            break;
        }
        if tc == pattern[pi] {
            let boundary = ti == 0
                || matches!(text[ti - 1], ' ' | '_' | '-' | '.' | '(' | '[' | '\'');
            let mut gain = 4;
            if streak > 0 {
                gain += 12 + streak * 2;
            }
            if boundary {
                gain += if ti == 0 { 24 } else { 20 };
            }
            total += gain;
            streak += 1;
            pi += 1;
        } else {
            if pi > 0 {
                gaps += 1;
            }
            streak = 0;
        }
    }
    if pi < pattern.len() {
        return None;
    }
    Some(total - gaps - (text.len() as i32) / 8)
}

/// Rank `name` against a pre-folded pattern. `None` = no match.
/// (Production code folds names once and calls `rank_folded` directly.)
#[cfg_attr(not(test), allow(dead_code))]
pub fn rank(pattern_folded: &str, name: &str) -> Option<i64> {
    rank_folded(pattern_folded, &fold(name))
}

/// Fast path for the in-memory index, where names are folded once at
/// index-build time instead of on every keystroke.
pub fn rank_folded(pattern_folded: &str, name_folded: &str) -> Option<i64> {
    if pattern_folded.is_empty() {
        return Some(0);
    }
    let shortness = 64_i64.saturating_sub(name_folded.chars().count() as i64);

    if name_folded == pattern_folded {
        return Some(TIER_EXACT + shortness);
    }
    if name_folded.starts_with(pattern_folded) {
        return Some(TIER_PREFIX + shortness);
    }
    if let Some(pos) = name_folded.find(pattern_folded) {
        let tier = if is_word_boundary(name_folded.as_bytes(), pos) {
            TIER_WORD_SUB
        } else {
            TIER_SUB
        };
        // Earlier occurrences rank higher.
        return Some(tier + shortness - (pos as i64).min(40));
    }

    // Tier 5: fuzzy, but only for patterns of 3+ chars and dense matches.
    let pat: Vec<char> = pattern_folded.chars().collect();
    if pat.len() < 3 {
        return None;
    }
    let txt: Vec<char> = name_folded.chars().collect();
    let s = subsequence_score(&pat, &txt)?;
    // Density gate: average gain per pattern char must indicate streaks or
    // boundary hits, not scattered single-char matches.
    if (s as i64) < 14 * pat.len() as i64 {
        return None;
    }
    Some((s as i64).min(TIER_SUB - 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_beats_prefix_beats_substring() {
        let exact = rank("fotos", "Fotos").unwrap();
        let prefix = rank("fotos", "Fotoslar").unwrap();
        let sub = rank("fotos", "my_fotos_2024").unwrap();
        assert!(exact > prefix && prefix > sub);
    }

    #[test]
    fn turkish_case_folding() {
        assert!(rank(&fold("indirilenler"), "İndirilenler").unwrap() >= TIER_EXACT);
        assert!(rank(&fold("INDIRILENLER"), "ındirilenler").unwrap() >= TIER_EXACT);
    }

    #[test]
    fn substring_matches_folder_names() {
        assert!(rank(&fold("proje"), "Yeni Projeler").unwrap() >= TIER_WORD_SUB);
        assert!(rank(&fold("oje"), "Yeni Projeler").unwrap() >= TIER_SUB);
    }

    #[test]
    fn sparse_noise_rejected() {
        // "rat" as a scattered subsequence of an unrelated name must not match.
        assert!(rank(&fold("rat"), "gradle-wrapper.jar").is_none());
    }

    #[test]
    fn short_patterns_never_fuzzy() {
        assert!(rank(&fold("ab"), "a_x_b").is_none());
        assert!(rank(&fold("ab"), "absolute").is_some()); // prefix still works
    }

    #[test]
    fn empty_pattern_matches_all() {
        assert_eq!(rank("", "anything"), Some(0));
    }
}
