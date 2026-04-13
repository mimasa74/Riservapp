import React, { useEffect, useState } from 'react';
import { GoogleMap, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface HunterPosition {
  deviceId: string;
  nome: string;
  lat: number;
  lng: number;
}

interface MappaScreenProps {
  onBack: () => void;
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const TUENNO_CENTER = { lat: 46.2954157719716, lng: 10.970932988883895 };

export const MappaScreen = ({ onBack }: MappaScreenProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [hunters, setHunters] = useState<HunterPosition[]>([]);
  const [polygonPath, setPolygonPath] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    // Carica poligono riserva da Firestore (formato: [{lat, lng}])
    getDoc(doc(db, 'geofences', 'riserva-tuenno')).then(snap => {
      if (snap.exists()) {
        setPolygonPath(snap.data().coordinates as { lat: number; lng: number }[]);
      }
    });

    // Ascolta posizioni in real-time
    const unsub = onSnapshot(collection(db, 'user_locations'), snap => {
      setHunters(snap.docs.map(d => d.data() as HunterPosition));
    });
    return unsub;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#EDEEE6' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#ECEDE1',
        borderBottom: '1px solid #d0d5c4',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#5C6B3A', padding: 4, display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{
          fontFamily: '-apple-system, sans-serif',
          fontWeight: 700, fontSize: 14,
          color: '#1A1A14', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Mappa Riserva
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12, color: '#6B6B5A',
          fontFamily: '-apple-system, sans-serif',
        }}>
          {hunters.length} {hunters.length === 1 ? 'cacciatore' : 'cacciatori'} in riserva
        </span>
      </div>

      {/* Mappa */}
      <div style={{ flex: 1 }}>
        {loadError && (
          <div style={{ padding: 24, textAlign: 'center', color: '#8B1A1A', fontFamily: 'inherit' }}>
            Errore caricamento mappa. Verifica la API key Google Maps.
          </div>
        )}
        {!isLoaded && !loadError && (
          <div style={{ padding: 24, textAlign: 'center', color: '#6B6B5A', fontFamily: 'inherit' }}>
            Caricamento mappa...
          </div>
        )}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={TUENNO_CENTER}
            zoom={13}
            options={{
              mapTypeId: 'satellite',
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {polygonPath.length > 0 && (
              <Polygon
                paths={polygonPath}
                options={{
                  strokeColor: '#5C6B3A',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: '#5C6B3A',
                  fillOpacity: 0.08,
                }}
              />
            )}
            {hunters.map(h => (
              <Marker
                key={h.deviceId}
                position={{ lat: h.lat, lng: h.lng }}
                label={{
                  text: h.nome,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#1A1A14',
                }}
                title={h.nome}
              />
            ))}
          </GoogleMap>
        )}
      </div>
    </div>
  );
};
