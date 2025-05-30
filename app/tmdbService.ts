import axios from 'axios';
import { ProcessedMovie } from './types'; // Adjust the import path as necessary

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const searchMovies = async (query: string, language: string = 'en-US'): Promise<any> => {
  try {
    const response = await axios.get(`${BASE_URL}/search/movie`, {
      params: {
        api_key: API_KEY,
        query: query,
        include_adult: false,
        language: language,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error('Error searching movies:', error);
    return null;
  }
};

export const getMovieDetails = async (id: number, language: string = 'en-US'): Promise<any> => {
  try {
    // First try with selected language
    const response = await axios.get(`${BASE_URL}/movie/${id}`, {
      params: {
        api_key: API_KEY,
        append_to_response: 'credits,videos',
        language: language,
      },
    });
    
    // If overview is empty, try English as fallback
    if (!response.data.overview && language !== 'en-US') {
      const englishResponse = await axios.get(`${BASE_URL}/movie/${id}`, {
        params: {
          api_key: API_KEY,
          append_to_response: 'credits,videos',
          language: 'en-US',
        },
      });
      return {
        ...response.data,
        overview: englishResponse.data.overview || response.data.overview,
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const processMovieData = (movie: any): ProcessedMovie => {
  const director = movie.credits?.crew.find(
    (person: any) => person.job === 'Director'
  )?.name;

  const trailer = movie.videos?.results.find(
    (video: any) => video.site === 'YouTube' && video.type === 'Trailer'
  )?.key;

  return {
    tmdbId: movie.id,
    title: movie.title,
    overview: movie.overview,
    actors: movie.credits?.cast.slice(0, 5).map((actor: any) => actor.name) || [],
    genres: movie.genres?.map((genre: any) => genre.name) || [],
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    release: movie.release_date,
    rating: movie.vote_average,
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer}` : null,
    director: director || null,
    duration: movie.runtime || 0,
  };
};

export const getLanguages = async (): Promise<{iso_639_1: string, english_name: string}[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/configuration/languages`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
};