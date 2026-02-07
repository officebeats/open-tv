/*
 * Beats TV - Premium IPTV Player
 * TMDB Integration Module
 * 
 * Provides movie metadata from The Movie Database (TMDB) API
 * with local caching for instant display.
 */

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::sql;

// TMDB API Configuration
const TMDB_BASE_URL: &str = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE: &str = "https://image.tmdb.org/t/p";
const CACHE_TTL_DAYS: i64 = 30;

// Image size presets
pub const IMG_POSTER_SMALL: &str = "w185";
pub const IMG_POSTER_MEDIUM: &str = "w342";
pub const IMG_POSTER_LARGE: &str = "w500";
pub const IMG_BACKDROP_SMALL: &str = "w780";
pub const IMG_BACKDROP_LARGE: &str = "w1280";
pub const IMG_PROFILE_SMALL: &str = "w185";

/// TMDB Movie search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmdbSearchResult {
    pub id: i64,
    pub title: String,
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub release_date: Option<String>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genre_ids: Option<Vec<i32>>,
    pub adult: Option<bool>,
}

/// Full movie details with credits and videos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmdbMovieDetails {
    pub id: i64,
    pub title: String,
    pub original_title: Option<String>,
    pub tagline: Option<String>,
    pub overview: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genres: Option<Vec<Genre>>,
    pub imdb_id: Option<String>,
    pub status: Option<String>,
    pub budget: Option<i64>,
    pub revenue: Option<i64>,
    pub credits: Option<Credits>,
    pub videos: Option<Videos>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genre {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credits {
    pub cast: Option<Vec<CastMember>>,
    pub crew: Option<Vec<CrewMember>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CastMember {
    pub id: i64,
    pub name: String,
    pub character: Option<String>,
    pub profile_path: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewMember {
    pub id: i64,
    pub name: String,
    pub job: String,
    pub department: Option<String>,
    pub profile_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Videos {
    pub results: Option<Vec<Video>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Video {
    pub id: String,
    pub key: String,
    pub name: String,
    #[serde(rename = "type")]
    pub video_type: String,
    pub site: String,
    pub official: Option<bool>,
}

/// Search response wrapper
#[derive(Debug, Deserialize)]
struct SearchResponse {
    results: Vec<TmdbSearchResult>,
    #[allow(dead_code)]
    total_results: i32,
}

/// Cached movie data for local storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmdbCachedMovie {
    pub tmdb_id: i64,
    pub imdb_id: Option<String>,
    pub title: String,
    pub original_title: Option<String>,
    pub tagline: Option<String>,
    pub overview: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genres: Option<String>,  // JSON string
    pub cast: Option<String>,    // JSON string (top 10)
    pub director: Option<String>,
    pub trailer_key: Option<String>,
    pub trailer_site: Option<String>,
    pub fetched_at: i64,
}

/// Get TMDB API key from settings
fn get_api_key() -> Result<String> {
    let settings = crate::settings::get_settings()?;
    settings.tmdb_api_key
        .filter(|k| !k.is_empty())
        .context("TMDB API key not configured. Please add your API key in Settings.")
}

/// Build full image URL from TMDB path
pub fn get_image_url(path: &Option<String>, size: &str) -> Option<String> {
    path.as_ref().map(|p| format!("{}/{}{}", TMDB_IMAGE_BASE, size, p))
}

/// Search for a movie by title
pub async fn search_movie(title: &str, year: Option<i32>) -> Result<Vec<TmdbSearchResult>> {
    let api_key = get_api_key()?;
    let client = reqwest::Client::new();
    
    let mut url = format!(
        "{}/search/movie?api_key={}&query={}&include_adult=false&language=en-US",
        TMDB_BASE_URL,
        api_key,
        urlencoding::encode(title)
    );
    
    if let Some(y) = year {
        url.push_str(&format!("&year={}", y));
    }
    
    let response: SearchResponse = client
        .get(&url)
        .send()
        .await
        .context("Failed to connect to TMDB API")?
        .json()
        .await
        .context("Failed to parse TMDB search response")?;
    
    Ok(response.results)
}

/// Get full movie details with credits and videos in ONE request
pub async fn get_movie_details(tmdb_id: i64) -> Result<TmdbMovieDetails> {
    let api_key = get_api_key()?;
    let client = reqwest::Client::new();
    
    let url = format!(
        "{}/movie/{}?api_key={}&append_to_response=credits,videos&language=en-US",
        TMDB_BASE_URL,
        tmdb_id,
        api_key
    );
    
    let response: TmdbMovieDetails = client
        .get(&url)
        .send()
        .await
        .context("Failed to connect to TMDB API")?
        .json()
        .await
        .context("Failed to parse TMDB movie details")?;
    
    Ok(response)
}

/// Search and get details in one call (for quick lookup)
pub async fn search_and_get_details(title: &str, year: Option<i32>) -> Result<Option<TmdbMovieDetails>> {
    // First check cache
    if let Ok(Some(cached)) = sql::get_tmdb_cache_by_title(title) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Check if cache is still valid (30 days)
        if now - cached.fetched_at < CACHE_TTL_DAYS * 24 * 60 * 60 {
            return Ok(Some(cached_to_details(cached)));
        }
    }
    
    // Search TMDB
    let results = search_movie(title, year).await?;
    
    if let Some(first) = results.first() {
        let details = get_movie_details(first.id).await?;
        
        // Cache the result
        let _ = cache_movie_details(&details);
        
        return Ok(Some(details));
    }
    
    Ok(None)
}

/// Convert cached data back to TmdbMovieDetails
fn cached_to_details(cached: TmdbCachedMovie) -> TmdbMovieDetails {
    let genres: Option<Vec<Genre>> = cached.genres
        .and_then(|g| serde_json::from_str(&g).ok());
    
    let cast: Option<Vec<CastMember>> = cached.cast
        .and_then(|c| serde_json::from_str(&c).ok());
    
    let director = cached.director.clone();
    
    let credits = if cast.is_some() || director.is_some() {
        Some(Credits {
            cast,
            crew: director.map(|d| vec![CrewMember {
                id: 0,
                name: d,
                job: "Director".to_string(),
                department: Some("Directing".to_string()),
                profile_path: None,
            }]),
        })
    } else {
        None
    };
    
    let videos = cached.trailer_key.map(|key| Videos {
        results: Some(vec![Video {
            id: "cached".to_string(),
            key,
            name: "Trailer".to_string(),
            video_type: "Trailer".to_string(),
            site: cached.trailer_site.unwrap_or_else(|| "YouTube".to_string()),
            official: Some(true),
        }]),
    });
    
    TmdbMovieDetails {
        id: cached.tmdb_id,
        title: cached.title,
        original_title: cached.original_title,
        tagline: cached.tagline,
        overview: cached.overview,
        release_date: cached.release_date,
        runtime: cached.runtime,
        vote_average: cached.vote_average,
        vote_count: cached.vote_count,
        popularity: cached.popularity,
        poster_path: cached.poster_path,
        backdrop_path: cached.backdrop_path,
        genres,
        imdb_id: cached.imdb_id,
        status: None,
        budget: None,
        revenue: None,
        credits,
        videos,
    }
}

/// Cache movie details to SQLite
fn cache_movie_details(details: &TmdbMovieDetails) -> Result<()> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    // Extract director from crew
    let director = details.credits.as_ref()
        .and_then(|c| c.crew.as_ref())
        .and_then(|crew| crew.iter().find(|c| c.job == "Director"))
        .map(|d| d.name.clone());
    
    // Get top 10 cast members
    let cast_json = details.credits.as_ref()
        .and_then(|c| c.cast.as_ref())
        .map(|cast| {
            let top_cast: Vec<_> = cast.iter().take(10).cloned().collect();
            serde_json::to_string(&top_cast).unwrap_or_default()
        });
    
    // Get genres as JSON
    let genres_json = details.genres.as_ref()
        .map(|g| serde_json::to_string(g).unwrap_or_default());
    
    // Get trailer (prefer official YouTube trailers)
    let trailer = details.videos.as_ref()
        .and_then(|v| v.results.as_ref())
        .and_then(|videos| {
            videos.iter()
                .filter(|v| v.site == "YouTube" && v.video_type == "Trailer")
                .max_by_key(|v| v.official.unwrap_or(false) as i32)
                .or_else(|| videos.iter().find(|v| v.site == "YouTube"))
        });
    
    let cached = TmdbCachedMovie {
        tmdb_id: details.id,
        imdb_id: details.imdb_id.clone(),
        title: details.title.clone(),
        original_title: details.original_title.clone(),
        tagline: details.tagline.clone(),
        overview: details.overview.clone(),
        release_date: details.release_date.clone(),
        runtime: details.runtime,
        vote_average: details.vote_average,
        vote_count: details.vote_count,
        popularity: details.popularity,
        poster_path: details.poster_path.clone(),
        backdrop_path: details.backdrop_path.clone(),
        genres: genres_json,
        cast: cast_json,
        director,
        trailer_key: trailer.map(|t| t.key.clone()),
        trailer_site: trailer.map(|t| t.site.clone()),
        fetched_at: now,
    };
    
    sql::upsert_tmdb_cache(cached)
}

/// Clean movie title for better search results
pub fn clean_title(title: &str) -> String {
    // Remove common IPTV prefixes/suffixes
    let cleaned = title
        .trim()
        // Remove quality indicators
        .replace(" HD", "")
        .replace(" SD", "")
        .replace(" 4K", "")
        .replace(" UHD", "")
        .replace(" FHD", "")
        // Remove year in parentheses at end (we'll extract it separately)
        .trim()
        .to_string();
    
    // Remove country prefixes like "US| " or "[UK] "
    let re = regex::Regex::new(r"^[\[\(]?[A-Z]{2,3}[\]\)]?[:\|\-\s]+").unwrap();
    re.replace(&cleaned, "").trim().to_string()
}

/// Extract year from title if present
pub fn extract_year(title: &str) -> Option<i32> {
    let re = regex::Regex::new(r"\((\d{4})\)").unwrap();
    re.captures(title)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse().ok())
}
