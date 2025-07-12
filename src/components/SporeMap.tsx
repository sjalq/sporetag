import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { formatDistanceToNow } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './SporeMap.css';

interface Spore {
  id: number;
  lat: number;
  lng: number;
  message: string;
  cookie_id: string;
  created_at: string;
}

interface SporeMapProps {
  className?: string;
}

const SporeMap: React.FC<SporeMapProps> = ({ className = '' }) => {
  const [spores, setSpores] = useState<Spore[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showSatellite, setShowSatellite] = useState(true);
  const [showSporeModal, setShowSporeModal] = useState(false);
  const [sporeMessage, setSporeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Fetch spores from API
  const fetchSpores = useCallback(async (bounds?: L.LatLngBounds) => {
    setLoading(true);
    try {
      let url = '/api/spores';

      if (bounds) {
        const params = new URLSearchParams({
          minLat: bounds.getSouth().toString(),
          maxLat: bounds.getNorth().toString(),
          minLng: bounds.getWest().toString(),
          maxLng: bounds.getEast().toString(),
        });
        url += `?${params}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSpores(data.spores || []);
      } else {
        console.error('Failed to fetch spores:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching spores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch for map movement
  const debouncedFetch = useCallback((bounds: L.LatLngBounds) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSpores(bounds);
    }, 500);
  }, [fetchSpores]);

  // Map event handlers
  const MapEventHandler = () => {
    const map = useMap();

    useMapEvents({
      moveend: () => {
        const bounds = map.getBounds();
        debouncedFetch(bounds);
      },
      zoomend: () => {
        const bounds = map.getBounds();
        debouncedFetch(bounds);
      }
    });

    // Store map reference
    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  };

  // Geolocation functionality
  const requestUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);

          // Center map on user location
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          // Fallback to Cape Town if geolocation fails
          setUserLocation([-33.9249, 18.4241]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      console.warn('Geolocation not supported');
      // Fallback to Cape Town
      setUserLocation([-33.9249, 18.4241]);
    }
  }, []);

  // Initial fetch and geolocation request
  useEffect(() => {
    fetchSpores();
    requestUserLocation();
  }, [fetchSpores, requestUserLocation]);

  // Create custom mushroom marker
  const createMushroomMarker = (spore: Spore) => {
    const mushroomHtml = `
      <div class="mushroom-marker" data-spore-id="${spore.id}">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cap-${spore.id}" cx="0.5" cy="0.3" r="0.8">
              <stop offset="0%" stop-color="#D2691E" />
              <stop offset="50%" stop-color="#A0522D" />
              <stop offset="100%" stop-color="#654321" />
            </radialGradient>
            <linearGradient id="stem-${spore.id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F5E6D3" />
              <stop offset="50%" stop-color="#E6D3B7" />
              <stop offset="100%" stop-color="#D3C4A3" />
            </linearGradient>
            <radialGradient id="spots-${spore.id}" cx="0.5" cy="0.5" r="0.3">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#F0F0F0" />
            </radialGradient>
          </defs>
          <ellipse cx="24" cy="18" rx="20" ry="12" fill="url(#cap-${spore.id})" stroke="#5D4037" stroke-width="1" />
          <circle cx="16" cy="14" r="2.4" fill="url(#spots-${spore.id})" />
          <circle cx="30" cy="12" r="1.6" fill="url(#spots-${spore.id})" />
          <circle cx="22" cy="22" r="2" fill="url(#spots-${spore.id})" />
          <circle cx="32" cy="18" r="1.2" fill="url(#spots-${spore.id})" />
          <rect x="20" y="26" width="8" height="16" rx="4" ry="2" fill="url(#stem-${spore.id})" stroke="#D3C4A3" stroke-width="0.6" />
          <ellipse cx="24" cy="28" rx="16" ry="4" fill="#8D6E63" opacity="0.6" />
          <ellipse cx="24" cy="43" rx="6" ry="1.6" fill="#3E2723" opacity="0.4" />
        </svg>
      </div>
    `;

    return L.divIcon({
      html: mushroomHtml,
      className: 'custom-mushroom-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    });
  };

  // Create user location marker (blue dot)
  const createUserLocationMarker = () => {
    const userLocationHtml = `
      <div class="user-location-marker">
        <div class="user-location-dot"></div>
        <div class="user-location-pulse"></div>
      </div>
    `;

    return L.divIcon({
      html: userLocationHtml,
      className: 'custom-user-location-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Generate or get cookie ID for user
  const getCookieId = () => {
    let cookieId = localStorage.getItem('spore_cookie_id');
    if (!cookieId) {
      cookieId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('spore_cookie_id', cookieId);
    }
    return cookieId;
  };

  // Submit spore to API
  const handleSporeSubmit = async () => {
    if (!mapRef.current || !sporeMessage.trim() || submitting) return;

    setSubmitting(true);
    try {
      const center = mapRef.current.getCenter();
      const payload = {
        lat: center.lat,
        lng: center.lng,
        message: sporeMessage.trim(),
        cookie_id: getCookieId()
      };

      const response = await fetch('/api/spores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Success - close modal and refresh spores
        setShowSporeModal(false);
        setSporeMessage('');
        const bounds = mapRef.current.getBounds();
        fetchSpores(bounds);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create spore');
      }
    } catch (error) {
      console.error('Error creating spore:', error);
      alert('Failed to create spore');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className={`spore-map-container ${className}`}>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading spores...</div>
        </div>
      )}

      {/* Satellite Toggle Button */}
      <div className="satellite-toggle">
        <button
          className={`satellite-button ${showSatellite ? 'active' : ''}`}
          onClick={() => setShowSatellite(!showSatellite)}
          title={showSatellite ? 'Switch to Street Map' : 'Switch to Satellite'}
        >
          {showSatellite ? '🗺️' : '🛰️'}
        </button>
      </div>

      {/* Spore Here Button */}
      <div className="spore-button-container">
        <button
          className="spore-button"
          onClick={() => setShowSporeModal(true)}
          title="Drop a spore at map center"
        >
          🍄 Spore Here
        </button>
      </div>

      {/* Spore Creation Modal */}
      {showSporeModal && (
        <div className="spore-modal-overlay" onClick={() => setShowSporeModal(false)}>
          <div className="spore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spore-modal-header">
              <h3>Drop a Spore</h3>
              <button
                className="spore-modal-close"
                onClick={() => setShowSporeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="spore-modal-body">
              <textarea
                className="spore-textarea"
                value={sporeMessage}
                onChange={(e) => setSporeMessage(e.target.value)}
                placeholder="Share your mushroom discovery..."
                maxLength={280}
                rows={4}
              />
              <div className="spore-char-counter">
                {sporeMessage.length}/280
              </div>
              <button
                className="spore-submit-button"
                onClick={handleSporeSubmit}
                disabled={!sporeMessage.trim() || submitting}
              >
                {submitting ? 'Dropping...' : 'Drop Spore'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={userLocation || [-33.9249, 18.4241]} // Use user location or Cape Town default
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        {/* Conditional tile layers */}
        {showSatellite ? (
          <TileLayer
            url="https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=IwX2Cz3uV4qWrc2Tx3eq"
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        <MapEventHandler />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={createUserLocationMarker()}
          >
            <Popup>
              <div className="spore-popup">
                <div className="spore-message">📍 Your current location</div>
              </div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          zoomToBoundsOnClick={true}
          spiderfyOnMaxZoom={true}
          iconCreateFunction={(cluster: L.MarkerCluster) => {
            const count = cluster.getChildCount();
            let className = 'custom-cluster-icon';

            if (count < 10) className += ' cluster-small';
            else if (count < 100) className += ' cluster-medium';
            else className += ' cluster-large';

            return L.divIcon({
              html: `<div class="cluster-inner"><span>${count}</span></div>`,
              className,
              iconSize: [40, 40]
            });
          }}
        >
          {spores.map((spore) => {
            const timeAgo = formatDistanceToNow(new Date(spore.created_at), { addSuffix: true });

            return (
              <Marker
                key={spore.id}
                position={[spore.lat, spore.lng]}
                icon={createMushroomMarker(spore)}
              >
                <Popup>
                  <div className="spore-popup">
                    <div className="spore-message">{spore.message}</div>
                    <div className="spore-timestamp">{timeAgo}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default SporeMap;