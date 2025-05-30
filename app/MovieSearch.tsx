'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { searchMovies, getMovieDetails, processMovieData, getLanguages } from './tmdbService';
import { ProcessedMovie, SearchResult } from './types';
import SortableItem from './SortableItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function MovieSearch() {
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<boolean[]>([]);
  const [searchResults, setSearchResults] = useState<ProcessedMovie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [languages, setLanguages] = useState<{iso_639_1: string, english_name: string}[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [editingMovieId, setEditingMovieId] = useState<number | null>(null);
  const [editedMovie, setEditedMovie] = useState<ProcessedMovie | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchLanguages = async () => {
      const langs = await getLanguages();
      setLanguages(langs);
      // Set default language to English if found
      const english = langs.find(l => l.english_name === 'English');
      if (english) {
        setSelectedLanguage(english.iso_639_1);
      }
    };
    fetchLanguages();
  }, []);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim() !== '');
      setFileContent(lines);
      setSelectedMovies(new Array(lines.length).fill(true));
      setSearchResults([]);
    };
    reader.readAsText(file);
  };

  const handleCheckboxChange = (index: number) => {
    const newSelectedMovies = [...selectedMovies];
    newSelectedMovies[index] = !newSelectedMovies[index];
    setSelectedMovies(newSelectedMovies);
  };

  const handleSearch = async () => {
    if (fileContent.length === 0) return;

    setIsLoading(true);
    const results: ProcessedMovie[] = [];

    for (let i = 0; i < fileContent.length; i++) {
      if (!selectedMovies[i]) continue;

      try {
        const searchResult = await searchMovies(fileContent[i], selectedLanguage);
        if (searchResult && searchResult.length > 0) {
          const details = await getMovieDetails(searchResult[0].id, selectedLanguage);
          if (details) {
            results.push(processMovieData(details));
          }
        }
      } catch (error) {
        console.error(`Error processing movie ${fileContent[i]}:`, error);
      }
    }

    setSearchResults(results);
    setIsLoading(false);
  };

  const removeMovie = (tmdbId: number) => {
    setSearchResults(searchResults.filter(movie => movie.tmdbId !== tmdbId));
  };

  const handleManualSearch = async (query: string) => {
    setManualSearchQuery(query);
    if (query.length > 2) {
      const results = await searchMovies(query, selectedLanguage);
      setSearchSuggestions(results || []);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddMovie = async (movie: SearchResult) => {
    setIsLoading(true);
    try {
      const details = await getMovieDetails(movie.id, selectedLanguage);
      if (details) {
        setSearchResults([...searchResults, processMovieData(details)]);
      }
    } catch (error) {
      console.error(`Error adding movie ${movie.title}:`, error);
    } finally {
      setIsLoading(false);
      setManualSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSave = () => {
    const dataToSave = {
      movies: searchResults,
      language: selectedLanguage,
      order: searchResults.map(movie => movie.tmdbId)
    };
    console.log('Saving movies:', dataToSave);
    alert(`Movies data would be saved to backend (${searchResults.length} movies)`);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileContent([]);
    setSelectedMovies([]);
    setSearchResults([]);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSearchResults((items) => {
        const oldIndex = items.findIndex(item => item.tmdbId === active.id);
        const newIndex = items.findIndex(item => item.tmdbId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const startEditing = (movie: ProcessedMovie) => {
    setEditingMovieId(movie.tmdbId);
    setEditedMovie({...movie});
  };

  const cancelEditing = () => {
    setEditingMovieId(null);
    setEditedMovie(null);
  };

  const saveEditing = () => {
    if (!editedMovie) return;
    
    setSearchResults(searchResults.map(movie => 
      movie.tmdbId === editedMovie.tmdbId ? editedMovie : movie
    ));
    setEditingMovieId(null);
    setEditedMovie(null);
  };

  const handleFieldChange = (field: string, value: string | string[]) => {
    if (!editedMovie) return;
    setEditedMovie({
      ...editedMovie,
      [field]: value
    });
  };

  const allGenres = Array.from(
    new Set(searchResults.flatMap(movie => movie.genres))
  ).sort();

  const filteredResults = selectedGenre === 'all' 
    ? searchResults 
    : searchResults.filter(movie => movie.genres.includes(selectedGenre));

  // Reset selectedGenre if it is no longer available
  useEffect(() => {
    if (selectedGenre !== 'all' && !allGenres.includes(selectedGenre)) {
      setSelectedGenre('all');
    }
  }, [allGenres, selectedGenre]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Movie Search App</h1>
        
        {/* Language Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="block cursor-pointer w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
          >
            {languages.map((lang) => (
              <option key={lang.iso_639_1} value={lang.iso_639_1}>
                {lang.english_name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload a text file with movie titles (one per line)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {/* Movie List Section */}
        {fileContent.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Movies from file</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded">
              {fileContent.map((movie, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`movie-${index}`}
                    checked={selectedMovies[index]}
                    onChange={() => handleCheckboxChange(index)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor={`movie-${index}`} className="ml-2 text-gray-700">
                    {movie}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mb-6">
          {searchResults.length === 0 ? (
            <button
              onClick={handleSearch}
              disabled={fileContent.length === 0 || isLoading}
              className={`px-4 py-2 rounded-md text-white ${fileContent.length === 0 || isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
            >
              Save
            </button>
          )}
        </div>

        {/* Manual Search */}
        {searchResults.length > 0 && (
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add more movies manually
            </label>
            <input
              type="text"
              value={manualSearchQuery}
              onChange={(e) => handleManualSearch(e.target.value)}
              placeholder="Search for a movie..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
            />
            {showSuggestions && searchSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchSuggestions.map((movie) => (
                  <li
                    key={movie.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleAddMovie(movie)}
                  >
                    {movie.title} {movie.release_date ? `(${movie.release_date.substring(0, 4)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Genre Filter */}
        {searchResults.length > 0 && allGenres.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="block cursor-pointer w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
            >
              <option value="all">All Genres</option>
              {allGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Results */}
        {filteredResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Results</h2>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredResults.map(movie => movie.tmdbId)}
                strategy={verticalListSortingStrategy}
              >
                {filteredResults.map((movie, index) => (
                  <SortableItem
                    key={movie.tmdbId}
                    id={movie.tmdbId}
                    renderHandle={({
                      setActivatorNodeRef,
                      listeners,
                    }: {
                      setActivatorNodeRef: (element: HTMLElement | null) => void;
                      listeners: React.HTMLAttributes<Element>;
                    }) => (
                      <svg
                        id="icon"
                        ref={node => setActivatorNodeRef(node as unknown as HTMLElement)}
                        {...listeners}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 32 32"
                        className="h-6 w-6 text-gray-500 mr-2 cursor-grab"
                        aria-label="Drag handle"
                        style={{ marginRight: 8 }}
                      >
                        <defs>
                          <style>{'.cls-1{fill:none;}'}</style>
                        </defs>
                        <title>drag--vertical</title>
                        <polygon points="4 20 15 20 15 26.17 12.41 23.59 11 25 16 30 21 25 19.59 23.59 17 26.17 17 20 28 20 28 18 4 18 4 20"/>
                        <polygon points="11 7 12.41 8.41 15 5.83 15 12 4 12 4 14 28 14 28 12 17 12 17 5.83 19.59 8.41 21 7 16 2 11 7"/>
                        <rect id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" className="cls-1" width="32" height="32"/>
                      </svg>
                    )}
                  >
                    {editingMovieId === movie.tmdbId ? (
                      <div className="border rounded-lg overflow-hidden shadow-sm p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={editedMovie?.title || ''}
                              onChange={(e) => handleFieldChange('title', e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm p-4"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Release Year</label>
                            <input
                              type="text"
                              value={editedMovie?.release || ''}
                              onChange={(e) => handleFieldChange('release', e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm p-4"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                            <input
                              type="number"
                              value={editedMovie?.rating || 0}
                              onChange={(e) => handleFieldChange('rating', e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm p-4"
                              step="0.1"
                              min="0"
                              max="10"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              value={editedMovie?.duration || 0}
                              onChange={(e) => handleFieldChange('duration', e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm p-4"
                            />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Overview</label>
                          <textarea
                            value={editedMovie?.overview || ''}
                            onChange={(e) => handleFieldChange('overview', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm p-4"
                            rows={3}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Genres (comma separated)</label>
                          <input
                            type="text"
                            value={editedMovie?.genres.join(', ') || ''}
                            onChange={(e) => handleFieldChange('genres', e.target.value.split(',').map(g => g.trim()))}
                            className="w-full rounded-md border-gray-300 shadow-sm p-4"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Actors (comma separated)</label>
                          <input
                            type="text"
                            value={editedMovie?.actors.join(', ') || ''}
                            onChange={(e) => handleFieldChange('actors', e.target.value.split(',').map(a => a.trim()))}
                            className="w-full rounded-md border-gray-300 shadow-sm p-4"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
                          <input
                            type="text"
                            value={editedMovie?.director || ''}
                            onChange={(e) => handleFieldChange('director', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm p-4"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Trailer URL</label>
                          <input
                            type="text"
                            value={editedMovie?.trailer || ''}
                            onChange={(e) => handleFieldChange('trailer', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm p-4"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden shadow-sm mb-4">
                        <div className="p-4 bg-gray-50 flex justify-between items-center">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-800">
                              {movie.title} ({movie.release.substring(0, 4)})
                            </h3>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditing(movie)}
                              className="text-blue-500 hover:text-blue-700 cursor-pointer"
                              aria-label="Edit movie"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeMovie(movie.tmdbId)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                              aria-label="Remove movie"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col md:flex-row gap-4">
                          {movie.poster && (
                            <div className="w-full md:w-1/4 flex-shrink-0">
                              <img
                                src={movie.poster}
                                alt={`${movie.title} poster`}
                                className="w-full h-auto rounded"
                              />
                            </div>
                          )}
                          <div className="flex-grow">
                            <div className="mb-3">
                              <span className="font-semibold">Rating:</span> {!isNaN(Number(movie.rating)) ? Number(movie.rating).toFixed(1) : 'N/A'}/10
                            </div>
                            <div className="mb-3">
                              <span className="font-semibold">Duration:</span> {movie.duration} minutes
                            </div>
                            <div className="mb-3">
                              <span className="font-semibold">Director:</span> {movie.director || 'Unknown'}
                            </div>
                            <div className="mb-3">
                              <span className="font-semibold">Genres:</span> {movie.genres.join(', ')}
                            </div>
                            <div className="mb-3">
                              <span className="font-semibold">Actors:</span> {movie.actors.join(', ')}
                            </div>
                            <div className="mb-3">
                              <span className="font-semibold">Overview:</span> {movie.overview}
                            </div>
                            {movie.trailer && (
                              <div>
                                <span className="font-semibold">Trailer:</span>{' '}
                                <a href={movie.trailer} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  Watch on YouTube
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}