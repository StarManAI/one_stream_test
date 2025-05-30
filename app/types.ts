export interface Movie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    runtime: number;
    genres: { id: number; name: string }[];
    credits?: {
      cast: { id: number; name: string }[];
      crew: { id: number; name: string; job: string }[];
    };
    videos?: {
      results: { id: string; key: string; site: string; type: string }[];
    };
  }
  
  export interface ProcessedMovie {
    tmdbId: number;
    title: string;
    overview: string;
    actors: string[];
    genres: string[];
    poster: string | null;
    release: string;
    rating: number;
    trailer: string | null;
    director: string | null;
    duration: number;
    [key: string]: any;
  }
  
  export interface SearchResult {
    id: number;
    title: string;
    release_date?: string;
  }