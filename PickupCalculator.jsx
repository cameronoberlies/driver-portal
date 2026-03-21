import { useState, useEffect, useRef } from "react";

export default function PickupCalculator() {
  const RATE_PER_MILE = 2.0;
  const DESTINATION = "Shelby, NC";
  const DEST_LAT = 35.2923;
  const DEST_LON = -81.5357;

  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");

  const debounceTimer = useRef(null);
  const suggestionsRef = useRef(null);

  // Fetch suggestions as user types
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const query = location.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setCurrentSearchQuery("");
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [location]);

  async function fetchSuggestions(query) {
    setCurrentSearchQuery(query);

    try {
      const apiKey = "pk.ad8425665c12e1b7f5d7827258d59077";
      const url = `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(query)}&countrycodes=us&limit=6&dedupe=1`;

      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      if (query !== currentSearchQuery) return;

      const rankedResults = rankResults(data, query);
      setSuggestions(rankedResults);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  }

  function rankResults(results, query) {
    const queryLower = query.toLowerCase();

    const scored = results.map((item) => {
      let score = 0;
      const address = item.address || {};
      const displayLower = item.display_name.toLowerCase();

      if (address.city || address.town) score += 100;
      if (address.state) score += 50;
      if (displayLower.startsWith(queryLower)) score += 200;

      const cityName = (address.city || address.town || "").toLowerCase();
      if (cityName.startsWith(queryLower)) score += 150;

      if (item.display_name.length > 100) score -= 30;

      const goodTypes = [
        "city",
        "town",
        "village",
        "state",
        "county",
        "administrative",
      ];
      if (goodTypes.includes(item.type)) score += 80;

      return { ...item, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  function selectSuggestion(suggestion) {
    setLocation(suggestion.display_name);
    setSelectedCoords({
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
    });
    setSuggestions([]);
    setTimeout(() => handleCalculate(), 100);
  }

  async function geocodeLocation(location) {
    const apiKey = "pk.ad8425665c12e1b7f5d7827258d59077";
    const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(location)}, USA&format=json&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to find location. Please try again.");
    }

    const data = await response.json();

    if (data.length === 0) {
      throw new Error(
        "Location not found. Please check the address and try again."
      );
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  }

  async function getDrivingDistance(origin) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${DEST_LON},${DEST_LAT}?overview=false`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to calculate route. Please try again.");
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("Could not find a route to this location.");
    }

    const distanceMeters = data.routes[0].distance;
    const distanceMiles = distanceMeters * 0.000621371;
    const adjustedMiles = distanceMiles * 1.03;

    return Math.round(adjustedMiles);
  }

  async function handleCalculate() {
    const loc = location.trim();

    if (!loc) {
      setError("Please enter a vehicle location");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const originCoords = selectedCoords || (await geocodeLocation(loc));
      const distance = await getDrivingDistance(originCoords);
      const cost = distance * RATE_PER_MILE;

      setResult({
        from: loc,
        distance,
        cost: Math.round(cost),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        Math.min(prev + 1, suggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedSuggestionIndex]);
      } else {
        handleCalculate();
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div className="fade-in">
      <style>{`
        .pickup-calc-destination {
          background: rgba(232, 180, 74, 0.08);
          border: 1px solid rgba(232, 180, 74, 0.2);
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 13px;
          color: var(--text);
        }

        .pickup-calc-autocomplete {
          position: relative;
        }

        .pickup-calc-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .pickup-calc-suggestion {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: background-color 0.2s;
        }

        .pickup-calc-suggestion:last-child {
          border-bottom: none;
        }

        .pickup-calc-suggestion:hover,
        .pickup-calc-suggestion.active {
          background-color: rgba(232, 180, 74, 0.1);
        }

        .pickup-calc-suggestion-name {
          color: var(--text);
          font-weight: 500;
          font-size: 14px;
        }

        .pickup-calc-suggestion-details {
          color: var(--muted);
          font-size: 12px;
          margin-top: 2px;
        }

        .pickup-calc-result {
          margin-top: 20px;
          padding: 20px;
          background: rgba(74, 232, 133, 0.08);
          border: 1px solid rgba(74, 232, 133, 0.2);
          border-radius: 6px;
        }

        .pickup-calc-result-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .pickup-calc-result-value {
          font-family: var(--font-head);
          font-size: 32px;
          font-weight: 800;
          color: var(--success);
          margin-bottom: 12px;
        }

        .pickup-calc-result-details {
          color: var(--text);
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>

      <div className="form-card">
        <div className="form-card-title">Vehicle Pickup Calculator</div>

        <div className="pickup-calc-destination">
          <strong>Destination:</strong> {DESTINATION} | <strong>Rate:</strong>{" "}
          ${RATE_PER_MILE.toFixed(2)}/mile
        </div>

        <div className="field">
          <label>Vehicle Location</label>
          <div className="pickup-calc-autocomplete">
            <input
              type="text"
              placeholder="Enter city, state or full address"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setSelectedCoords(null);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="pickup-calc-suggestions" ref={suggestionsRef}>
                {suggestions.map((item, index) => {
                  const address = item.address || {};
                  let primaryText = "";
                  let secondaryText = "";

                  if (address.city || address.town) {
                    primaryText = address.city || address.town;
                    const parts = [];
                    if (address.county) parts.push(address.county);
                    if (address.state) parts.push(address.state);
                    secondaryText = parts.join(", ");
                  } else if (address.county) {
                    primaryText = address.county;
                    secondaryText = address.state || "";
                  } else {
                    const parts = item.display_name.split(",").slice(0, 3);
                    primaryText = parts[0];
                    secondaryText = parts.slice(1).join(",");
                  }

                  return (
                    <div
                      key={index}
                      className={`pickup-calc-suggestion ${
                        index === selectedSuggestionIndex ? "active" : ""
                      }`}
                      onClick={() => selectSuggestion(item)}
                    >
                      <div className="pickup-calc-suggestion-name">
                        {primaryText}
                      </div>
                      {secondaryText && (
                        <div className="pickup-calc-suggestion-details">
                          {secondaryText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCalculate}
          disabled={loading}
          style={{ marginTop: 16 }}
        >
          {loading ? "Calculating..." : "Calculate Travel Cost →"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(232, 90, 74, 0.1)",
              border: "1px solid rgba(232, 90, 74, 0.3)",
              borderRadius: 6,
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div className="pickup-calc-result">
            <div className="pickup-calc-result-label">Total Travel Cost</div>
            <div className="pickup-calc-result-value">${result.cost}</div>
            <div className="pickup-calc-result-details">
              <strong>Distance:</strong> {result.distance.toLocaleString()}{" "}
              miles
              <br />
              <strong>From:</strong> {result.from}
              <br />
              <strong>To:</strong> {DESTINATION}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}