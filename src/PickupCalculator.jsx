import { useState, useEffect, useRef } from "react";

export default function PickupCalculator() {
  const [ratePerMile, setRatePerMile] = useState(2.0);
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

  const debounceTimer = useRef(null);
  const suggestionsRef = useRef(null);
  const currentSearchQueryRef = useRef(""); // Use ref instead of state!

  // Fetch suggestions as user types
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const query = location.trim();
    
    if (query.length < 2) {
      setSuggestions([]);
      currentSearchQueryRef.current = "";
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300); // Back to 300ms like the original

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [location]);

  async function fetchSuggestions(query) {
    currentSearchQueryRef.current = query; // Set synchronously via ref

    try {
      const apiKey = "pk.ad8425665c12e1b7f5d7827258d59077";
      const url = `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(query)}&countrycodes=us&limit=6&dedupe=1`;

      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      
      // Ignore stale responses - now this works because we're using ref!
      if (query !== currentSearchQueryRef.current) return;

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
      const cost = distance * ratePerMile;

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
        .pc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
          max-width: 640px;
        }
        .pc-card::before {
          content: ''; display: block; height: 3px; margin: -32px -32px 28px;
          border-radius: 12px 12px 0 0;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
        }
        .pc-title {
          font-family: var(--font-head);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .pc-config {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }
        .pc-config-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: border-color 0.2s;
        }
        .pc-config-item:hover { border-color: rgba(255,255,255,0.12); }
        .pc-config-label {
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
        }
        .pc-config-value {
          font-family: var(--font-head); font-size: 20px; font-weight: 800;
          color: var(--text); display: flex; align-items: center; gap: 4px;
        }
        .pc-rate-input {
          width: 72px; padding: 4px 8px;
          background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
          color: var(--accent); font-family: var(--font-head);
          font-size: 20px; font-weight: 800; text-align: center;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pc-rate-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(232,180,74,0.15);
        }

        .pc-input-section { margin-bottom: 24px; }
        .pc-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: block;
        }
        .pc-autocomplete { position: relative; }
        .pc-input {
          width: 100%; padding: 12px 16px;
          background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); font-family: var(--font-body); font-size: 15px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pc-input::placeholder { color: rgba(107,117,133,0.6); }
        .pc-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(232,180,74,0.12);
        }

        .pc-suggestions {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; max-height: 240px; overflow-y: auto;
          z-index: 1000; box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          animation: fadeUp 0.15s ease;
        }
        .pc-suggestion {
          padding: 12px 16px; cursor: pointer;
          border-bottom: 1px solid rgba(42,49,64,0.4);
          transition: all 0.15s;
          display: flex; align-items: center; gap: 12px;
        }
        .pc-suggestion:first-child { border-radius: 8px 8px 0 0; }
        .pc-suggestion:last-child { border-bottom: none; border-radius: 0 0 8px 8px; }
        .pc-suggestion:hover, .pc-suggestion.active {
          background: rgba(232,180,74,0.08);
        }
        .pc-suggestion.active {
          border-left: 3px solid var(--accent);
          padding-left: 13px;
        }
        .pc-suggestion-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(59,140,247,0.1); color: var(--accent2);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0;
        }
        .pc-suggestion-name { color: var(--text); font-weight: 600; font-size: 14px; }
        .pc-suggestion-detail { color: var(--muted); font-size: 12px; margin-top: 2px; }

        .pc-btn {
          width: 100%; padding: 14px 24px;
          font-family: var(--font-head); font-size: 14px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          background: var(--accent); color: #0d0f12; border: none;
          border-radius: 8px; cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 2px 8px rgba(232,180,74,0.2);
        }
        .pc-btn:hover:not(:disabled) {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 4px 20px rgba(232,180,74,0.35);
          background: #f5c55a;
        }
        .pc-btn:active:not(:disabled) { transform: scale(0.98); }
        .pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .pc-error {
          margin-top: 16px; padding: 12px 16px;
          background: rgba(232,90,74,0.08); border: 1px solid rgba(232,90,74,0.25);
          border-radius: 8px; color: var(--danger); font-size: 13px;
          display: flex; align-items: center; gap: 8px;
          animation: fadeUp 0.2s ease;
        }

        .pc-result {
          margin-top: 24px; border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(74,232,133,0.2);
          animation: fadeUp 0.3s ease;
        }
        .pc-result-header {
          background: rgba(74,232,133,0.06);
          padding: 24px 24px 20px;
          text-align: center;
          border-bottom: 1px solid rgba(74,232,133,0.1);
        }
        .pc-result-label {
          font-size: 10px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
        }
        .pc-result-value {
          font-family: var(--font-head); font-size: 48px; font-weight: 800;
          color: var(--success); line-height: 1;
        }
        .pc-result-breakdown {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
        }
        .pc-result-stat {
          padding: 16px; text-align: center;
          border-right: 1px solid rgba(74,232,133,0.1);
          background: rgba(74,232,133,0.03);
        }
        .pc-result-stat:last-child { border-right: none; }
        .pc-result-stat-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--muted); margin-bottom: 6px;
        }
        .pc-result-stat-value {
          font-family: var(--font-head); font-size: 16px;
          font-weight: 700; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        @media (max-width: 640px) {
          .pc-card { padding: 20px; }
          .pc-card::before { margin: -20px -20px 20px; }
          .pc-config { grid-template-columns: 1fr; }
          .pc-result-value { font-size: 36px; }
          .pc-result-breakdown { grid-template-columns: 1fr; }
          .pc-result-stat { border-right: none; border-bottom: 1px solid rgba(74,232,133,0.1); }
          .pc-result-stat:last-child { border-bottom: none; }
        }
      `}</style>

      <div className="pc-card">
        <div className="pc-title">Vehicle Pickup Calculator</div>

        <div className="pc-config">
          <div className="pc-config-item">
            <div className="pc-config-label">Destination</div>
            <div className="pc-config-value">{DESTINATION}</div>
          </div>
          <div className="pc-config-item">
            <div className="pc-config-label">Rate per Mile</div>
            <div className="pc-config-value">
              $
              <input
                type="number"
                className="pc-rate-input"
                value={ratePerMile}
                onChange={(e) => setRatePerMile(parseFloat(e.target.value) || 0)}
                step="0.10"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="pc-input-section">
          <label className="pc-label">Vehicle Location</label>
          <div className="pc-autocomplete">
            <input
              className="pc-input"
              type="text"
              placeholder="Enter city, state or full address..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setSelectedCoords(null);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="pc-suggestions" ref={suggestionsRef}>
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
                      className={`pc-suggestion ${
                        index === selectedSuggestionIndex ? "active" : ""
                      }`}
                      onClick={() => selectSuggestion(item)}
                    >
                      <div className="pc-suggestion-icon">
                        {address.city || address.town ? "🏙" : "📍"}
                      </div>
                      <div>
                        <div className="pc-suggestion-name">{primaryText}</div>
                        {secondaryText && (
                          <div className="pc-suggestion-detail">
                            {secondaryText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <button
          className="pc-btn"
          onClick={handleCalculate}
          disabled={loading}
        >
          {loading ? "Calculating..." : "Calculate Travel Cost"}
        </button>

        {error && (
          <div className="pc-error">
            <span>!</span> {error}
          </div>
        )}

        {result && (
          <div className="pc-result">
            <div className="pc-result-header">
              <div className="pc-result-label">Estimated Travel Cost</div>
              <div className="pc-result-value">${result.cost.toLocaleString()}</div>
            </div>
            <div className="pc-result-breakdown">
              <div className="pc-result-stat">
                <div className="pc-result-stat-label">Distance</div>
                <div className="pc-result-stat-value">{result.distance.toLocaleString()} mi</div>
              </div>
              <div className="pc-result-stat">
                <div className="pc-result-stat-label">From</div>
                <div className="pc-result-stat-value" title={result.from}>
                  {result.from.split(",")[0]}
                </div>
              </div>
              <div className="pc-result-stat">
                <div className="pc-result-stat-label">To</div>
                <div className="pc-result-stat-value">{DESTINATION}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}