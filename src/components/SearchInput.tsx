import { useState, useEffect, useRef, useCallback } from "react";
import type { LocationIndex } from "../lib/data";
import { searchLocations } from "../lib/data";
import { geocodeSearch, parseCoordinates, reverseGeocode } from "../lib/geocoding";

export interface SelectedLocation {
  name: string;
  latitude: number;
  longitude: number;
  slug?: string;
  elevationM?: number;
}

interface SearchResult {
  name: string;
  displayName?: string;
  latitude: number;
  longitude: number;
  slug?: string;
  elevationM?: number;
  type: "indexed" | "geocoded" | "coordinates";
}

interface Props {
  locationsIndex: LocationIndex[];
  onSelect: (location: SelectedLocation) => void;
}

export function SearchInput({ locationsIndex, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showIndexedLocations = useCallback(() => {
    const indexed: SearchResult[] = locationsIndex.map((loc) => ({
      type: "indexed" as const,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      slug: loc.slug,
      elevationM: loc.elevation_m,
    }));
    setResults(indexed);
    setIsOpen(true);
  }, [locationsIndex]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timeout = setTimeout(async () => {
      // Check for coordinates
      const coords = parseCoordinates(query);
      if (coords) {
        setResults([
          {
            type: "coordinates",
            name: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        ]);
        setIsOpen(true);
        return;
      }

      // Search local index
      const indexResults: SearchResult[] = searchLocations(
        locationsIndex,
        query,
      ).map((loc) => ({
        type: "indexed" as const,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        slug: loc.slug,
        elevationM: loc.elevation_m,
      }));

      if (indexResults.length >= 3) {
        setResults(indexResults.slice(0, 8));
        setIsOpen(true);
        return;
      }

      // Fall back to geocoding
      setIsLoading(true);
      try {
        const geocoded = await geocodeSearch(query);
        const geocodedResults: SearchResult[] = geocoded
          .filter(
            (g) =>
              !indexResults.some(
                (i) =>
                  Math.abs(i.latitude - g.latitude) < 0.01 &&
                  Math.abs(i.longitude - g.longitude) < 0.01,
              ),
          )
          .map((g) => ({
            type: "geocoded" as const,
            name: g.name,
            displayName: g.displayName,
            latitude: g.latitude,
            longitude: g.longitude,
          }));

        setResults([...indexResults, ...geocodedResults].slice(0, 8));
      } catch {
        setResults(indexResults);
      }
      setIsLoading(false);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, locationsIndex]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery(result.name);
      setIsOpen(false);
      onSelect({
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        slug: result.slug,
        elevationM: result.elevationM,
      });
    },
    [onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Check if near an indexed location
        const nearby = locationsIndex.find(
          (loc) =>
            Math.abs(loc.latitude - latitude) < 0.1 &&
            Math.abs(loc.longitude - longitude) < 0.1,
        );

        if (nearby) {
          setQuery(nearby.name);
          onSelect({
            name: nearby.name,
            latitude: nearby.latitude,
            longitude: nearby.longitude,
            slug: nearby.slug,
            elevationM: nearby.elevation_m,
          });
        } else {
          const name = await reverseGeocode(latitude, longitude);
          const displayName =
            name?.split(",")[0] ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setQuery(displayName);
          onSelect({ name: displayName, latitude, longitude });
        }
        setGeolocating(false);
      },
      () => {
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locationsIndex, onSelect]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              setHighlightIdx(-1);
              if (!val.trim()) {
                showIndexedLocations();
              }
            }}
            onFocus={() => {
              if (!query.trim()) {
                showIndexedLocations();
              } else if (results.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search a city, landmark, or coordinates..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-lg
              text-sm font-body text-ink placeholder:text-ink-muted
              focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30
              transition-colors"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={handleGeolocate}
          disabled={geolocating}
          title="Use my location"
          className="px-3 py-2.5 bg-surface border border-border rounded-lg
            text-ink-light hover:border-teal hover:text-teal
            focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30
            transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          {geolocating ? (
            <div className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 w-full bg-surface border border-border rounded-lg shadow-lg
            overflow-y-auto max-h-72 animate-slide-down"
        >
          {results.map((result, idx) => (
            <button
              key={`${result.latitude}-${result.longitude}-${idx}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2
                transition-colors cursor-pointer
                ${idx === highlightIdx ? "bg-parchment" : "hover:bg-parchment/60"}`}
            >
              {result.type === "indexed" ? (
                <span
                  className="shrink-0 w-5 h-5 rounded bg-teal/10 text-teal
                  flex items-center justify-center text-xs font-mono font-medium"
                  title="Terrain data available"
                >
                  T
                </span>
              ) : result.type === "coordinates" ? (
                <span className="shrink-0 w-5 h-5 rounded bg-amber/10 text-amber flex items-center justify-center">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                  </svg>
                </span>
              ) : (
                <span className="shrink-0 w-5 h-5 rounded bg-border-light text-ink-muted flex items-center justify-center">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
              )}
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">
                  {result.name}
                </div>
                {result.displayName && result.displayName !== result.name && (
                  <div className="text-xs text-ink-muted truncate">
                    {result.displayName}
                  </div>
                )}
                {result.type === "indexed" && (
                  <div className="text-xs text-teal">
                    Terrain profile available
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
