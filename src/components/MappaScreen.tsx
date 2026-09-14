import { Fragment, useEffect, useRef, useState } from 'react';
import { GoogleMap, Polygon, Marker, OverlayView, useLoadScript } from '@react-google-maps/api';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PuntoPosizione, dimensioneNome, raggruppaPerSocio } from '../utils/posizioni';

interface MappaScreenProps {
  onBack: () => void;
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const TUENNO_CENTER = { lat: 46.2954157719716, lng: 10.970932988883895 };
const ZOOM_INIZIALE = 13;

export const MappaScreen = ({ onBack }: MappaScreenProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lo zoom serve per scrivere i nomi: l'etichetta di Google non lo segue.
  const mappaRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(ZOOM_INIZIALE);

  const [punti, setPunti] = useState<PuntoPosizione[]>([]);
  const [polygonPath, setPolygonPath] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    // Carica poligono riserva da Firestore (formato: [{lat, lng}])
    getDoc(doc(db, 'geofences', 'riserva-tuenno')).then(snap => {
      if (snap.exists()) {
        setPolygonPath(snap.data().coordinates as { lat: number; lng: number }[]);
      }
    });

    // Ascolta posizioni in real-time. Ogni documento e' UN punto, non un socio:
    // il raggruppamento per telefono lo fa raggruppaPerSocio.
    const unsub = onSnapshot(collection(db, 'user_locations'), snap => {
      setPunti(snap.docs.map(d => {
        const v = d.data() as Record<string, unknown>;
        const ts = v.timestamp as { toMillis?: () => number } | undefined;
        return {
          deviceId: String(v.deviceId ?? ''),
          nome: String(v.nome ?? ''),
          lat: Number(v.lat),
          lng: Number(v.lng),
          ms: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null,
        };
      }));
    });
    return unsub;
  }, []);

  const posizioni = raggruppaPerSocio(punti.filter(p => p.ms !== null && p.ms > now - 35 * 60_000));
  const corpoNome = dimensioneNome(zoom);

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
          {posizioni.length} {posizioni.length === 1 ? 'cacciatore' : 'cacciatori'} in riserva
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
            zoom={ZOOM_INIZIALE}
            onLoad={mappa => { mappaRef.current = mappa; }}
            onUnmount={() => { mappaRef.current = null; }}
            onZoomChanged={() => {
              const z = mappaRef.current?.getZoom();
              if (typeof z === 'number') setZoom(z);
            }}
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
            {posizioni.map(socio => (
              <Fragment key={socio.deviceId}>
                {/* Dove il socio e' stato visto: un puntino solo, niente scia */}
                <Marker
                  position={socio.ultimo}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: '#8B1A1A',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  title={socio.ora ? `${socio.nome} — ${socio.ora}` : socio.nome}
                />
                {/* Il nome non e' l'etichetta di Google: quella resta piccola a
                    ogni zoom. Bianco con ombra scura perche' il satellite sotto
                    e' a chiazze, e sul chiaro il bianco da solo sparirebbe. */}
                <OverlayView
                  position={socio.ultimo}
                  mapPaneName={OverlayView.OVERLAY_LAYER}
                >
                  {/* Il riquadro dell'overlay e' largo e alto zero: chiedergli
                      quanto misura il testo (getPixelPositionOffset) tornerebbe
                      sempre zero e il nome finirebbe addosso al puntino. Lo
                      sposta il CSS, che il testo lo ha davvero sotto mano. */}
                  <div style={{
                    position: 'absolute',
                    width: 'max-content',
                    transform: 'translate(-50%, calc(-100% - 14px))',
                    fontFamily: '-apple-system, sans-serif',
                    fontWeight: 700,
                    fontSize: corpoNome,
                    lineHeight: 1.1,
                    color: '#FFFFFF',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.75)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}>
                    {socio.nome}
                    {socio.ora && (
                      <div style={{ fontSize: Math.round(corpoNome * 0.7), fontWeight: 600 }}>
                        {socio.ora}
                      </div>
                    )}
                  </div>
                </OverlayView>
              </Fragment>
            ))}
          </GoogleMap>
        )}
      </div>
    </div>
  );
};
