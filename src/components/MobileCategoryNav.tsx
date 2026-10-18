import React from 'react';
import { useApp } from '../context/AppContext';

export const MobileCategoryNav: React.FC = () => {
  const { searchFilters, setSearchFilters } = useApp();

  const categories = [
    { id: 'all', label: 'All Turfs', icon: '⚽' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'cricket', label: 'Cricket', icon: '🏏' },
    { id: 'box_cricket', label: 'Box Cricket', icon: '🥅' },
    { id: 'nearby', label: 'Nearby', icon: '📍' },
    { id: 'popular', label: 'Popular', icon: '⭐' },
  ];

  const isSelected = (catId: string) => {
    if (catId === 'all') {
      return (
        searchFilters.sport === 'all' &&
        searchFilters.sortBy !== 'distance' &&
        searchFilters.sortBy !== 'rating' &&
        searchFilters.venueType !== 'indoor'
      );
    }
    if (catId === 'football') {
      return searchFilters.sport === 'football';
    }
    if (catId === 'cricket') {
      return searchFilters.sport === 'cricket' && searchFilters.venueType !== 'indoor';
    }
    if (catId === 'box_cricket') {
      return searchFilters.sport === 'cricket' && searchFilters.venueType === 'indoor';
    }
    if (catId === 'nearby') {
      return searchFilters.sortBy === 'distance';
    }
    if (catId === 'popular') {
      return searchFilters.sortBy === 'rating';
    }
    return false;
  };

  const handleSelectCategory = (catId: string) => {
    if (catId === 'all') {
      setSearchFilters((prev) => ({
        ...prev,
        sport: 'all',
        sortBy: 'recommended',
        venueType: 'all',
      }));
    } else if (catId === 'football') {
      setSearchFilters((prev) => ({
        ...prev,
        sport: 'football',
        venueType: 'all',
      }));
    } else if (catId === 'cricket') {
      setSearchFilters((prev) => ({
        ...prev,
        sport: 'cricket',
        venueType: 'all',
      }));
    } else if (catId === 'box_cricket') {
      setSearchFilters((prev) => ({
        ...prev,
        sport: 'cricket',
        venueType: 'indoor',
      }));
    } else if (catId === 'nearby') {
      setSearchFilters((prev) => ({
        ...prev,
        sortBy: 'distance',
      }));
    } else if (catId === 'popular') {
      setSearchFilters((prev) => ({
        ...prev,
        sortBy: 'rating',
      }));
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0B1315] border-b border-slate-200 dark:border-slate-800 py-2 px-3 sm:px-4 transition-colors">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll scroll-smooth">
        {categories.map((cat) => {
          const active = isSelected(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 ${
                active
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
