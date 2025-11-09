import { useEffect, useState } from "react";

export function MapView() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  // Only load map components on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsClient(true);
      Promise.all([
        import("react-leaflet"),
        import("leaflet"),
        import("leaflet/dist/leaflet.css")
      ]).then(([reactLeaflet, L]) => {
        // Fix for default marker icons in react-leaflet
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
        
        // Add custom CSS for transparent scale control
        const style = document.createElement('style');
        style.textContent = `
          .leaflet-control-scale {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .leaflet-control-scale-line {
            background: transparent !important;
            border: none !important;
            border-top: 2px solid #333 !important;
            border-bottom: 2px solid #333 !important;
            color: #333 !important;
            font-weight: bold !important;
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(255, 255, 255, 0.8) !important;
          }
          .dark .leaflet-control-scale-line {
            border-top-color: #fff !important;
            border-bottom-color: #fff !important;
            color: #fff !important;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8) !important;
          }
        `;
        document.head.appendChild(style);
        
        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          ScaleControl: reactLeaflet.ScaleControl,
          useMap: reactLeaflet.useMap,
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Check and request geolocation permission explicitly
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('Geolocation permission:', result.state);
        if (result.state === 'denied') {
          setError("Geolocation permission denied. Please enable location access in your browser settings.");
        }
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          console.log('Geolocation permission changed to:', result.state);
          if (result.state === 'denied') {
            setError("Geolocation permission denied. Please enable location access in your browser settings.");
          }
        });
      }).catch((err) => {
        console.warn('Permission query not supported:', err);
      });
    }

    const watchId = navigator.geolocation.watchPosition(
      (geoPosition) => {
        const { latitude, longitude, accuracy: coordAccuracy } = geoPosition.coords;
        
        // Log the coordinates and accuracy for debugging
        console.log('Location received:', { 
          latitude, 
          longitude, 
          accuracy: coordAccuracy,
          accuracyMeters: coordAccuracy ? `${coordAccuracy.toFixed(0)}m` : 'unknown'
        });
        
        // Check if accuracy is too poor (more than 1000 meters = 1km)
        if (coordAccuracy && coordAccuracy > 1000) {
          console.warn('⚠️ Location accuracy is poor:', coordAccuracy.toFixed(0), 'meters (', (coordAccuracy / 1000).toFixed(1), 'km)');
          console.warn('This may indicate the browser is using IP-based or network-based location instead of GPS.');
        } else if (coordAccuracy) {
          console.log('✓ Location accuracy is good:', coordAccuracy.toFixed(0), 'meters');
        }
        
        setPosition([latitude, longitude]);
        setAccuracy(coordAccuracy || null);
        setError(null);
      },
      (err) => {
        const errorMessage = `Error getting location: ${err.message}`;
        setError(errorMessage);
        console.error('Geolocation error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to allow GPS to get a fix
        maximumAge: 0, // Always get fresh location
      }
    );

    // Cleanup function to stop watching position when component unmounts
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isClient]);

  // Default center (can be any location, will be overridden once position is available)
  const defaultCenter: [number, number] = [0, 0];
  const center = position || defaultCenter;

  if (!isClient || !MapComponents) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-4">
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, ScaleControl, useMap } = MapComponents;

  // Component to handle map centering - must be defined here to use the dynamically imported useMap hook
  const MapCenter = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);

    return null;
  };

  const isPoorAccuracy = accuracy !== null && accuracy > 1000;

  return (
    <div className="w-full h-screen relative">
      {/* Warning banner for poor accuracy */}
      {isPoorAccuracy && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-orange-100 dark:bg-orange-900 border border-orange-400 dark:border-orange-600 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <div className="text-orange-600 dark:text-orange-400 text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                Low Location Accuracy
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                Your location is accurate to within {(accuracy! / 1000).toFixed(1)} km. 
                The browser is using IP-based or network-based location instead of GPS.
              </p>
              <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                <p><strong>To get better accuracy:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Use a mobile device with GPS</li>
                  <li>Check browser location settings</li>
                  <li>Ensure you're on HTTPS</li>
                  <li>Grant high-accuracy location permission</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ScaleControl 
          position="bottomleft"
          imperial={false}
          metric={true}
        />
        {position && (
          <>
            <Marker position={position}>
              <Popup>
                <div className="text-sm">
                  <strong>Your Position</strong>
                  <br />
                  <br />
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Latitude:</span> {position[0].toFixed(6)}
                    </div>
                    <div>
                      <span className="font-semibold">Longitude:</span> {position[1].toFixed(6)}
                    </div>
                    {accuracy !== null && (
                      <div>
                        <span className="font-semibold">Accuracy:</span>{" "}
                        {accuracy < 1000 
                          ? `${accuracy.toFixed(0)} m` 
                          : `${(accuracy / 1000).toFixed(1)} km`}
                        {isPoorAccuracy && (
                          <span className="block text-orange-600 dark:text-orange-400 text-xs mt-1 font-semibold">
                            ⚠️ Using network-based location (not GPS)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
            <MapCenter center={position} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

