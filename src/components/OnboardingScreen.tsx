import React, { useState, useRef } from 'react';

type Phase = 'video' | 'privacy';

interface OnboardingScreenProps {
  onDone: (geoAccepted: boolean) => void;
}

const PRIVACY_TEXT = `Informativa e consenso per trattamento dati personali e geolocalizzazione
App "Riserva Cacciatori Tuenno"

Ai sensi del Regolamento (UE) 2016/679 ("GDPR") e della normativa italiana vigente in materia di protezione dei dati personali, ti informiamo che, tramite la presente applicazione, la Riserva Cacciatori Tuenno tratta i tuoi dati personali, compresi i dati identificativi (es. nome, cognome) e i dati di geolocalizzazione all'interno della riserva, per le finalità di seguito indicate.

1. Titolare del trattamento
Il Titolare del trattamento è il Rettore della Riserva Cacciatori Tuenno, con sede in:
Riserva Cacciatori Tuenno
Via V. Maistrelli 8
38019 Ville d'Anaunia (TN) – Frazione Tuenno
Email: tuenno@cacciatoritrentini.it

Il Titolare potrà nominare, ai sensi dell'art. 28 GDPR, uno o più Responsabili del trattamento (es. fornitori di servizi informatici, gestori dell'app), vincolati da apposito contratto e istruzioni scritte.

2. Tipologie di dati trattati
Tramite l'app vengono trattate in particolare le seguenti categorie di dati personali:
- Dati identificativi: nome, cognome, eventuale numero di licenza di caccia, codice identificativo utente, credenziali di accesso.
- Dati di contatto: indirizzo email, recapito telefonico, altri recapiti da te forniti.
- Dati relativi all'utilizzo dell'app: informazioni essenziali sulle operazioni effettuate (es. accessi, impostazioni selezionate).
- Dati di geolocalizzazione: posizione del dispositivo all'interno dei confini della riserva, rilevata mediante tecnologie di localizzazione (GPS, reti mobili, Wi‑Fi o tecnologie analoghe) e collegata al tuo profilo utente.

3. Finalità e base giuridica del trattamento
I tuoi dati personali vengono trattati per le seguenti finalità:

a) Gestione dell'utenza e dell'applicazione
Creare e gestire il tuo account, consentirti l'accesso alle funzionalità dell'app e adempiere agli obblighi organizzativi connessi all'attività venatoria nella riserva.
Base giuridica: esecuzione di un contratto o di misure precontrattuali (art. 6, par. 1, lett. b) GDPR).

b) Sicurezza e coordinamento delle battute di caccia (geolocalizzazione)
Utilizzare i dati di geolocalizzazione all'interno della riserva per:
- segnalare la presenza di altri cacciatori nelle zone limitrofe;
- evitare la sovrapposizione di battute nella stessa area;
- migliorare la sicurezza durante l'attività venatoria, riducendo il rischio di incidenti tra cacciatori.
Modalità: la tua posizione viene rilevata solo al superamento di specifiche aree virtuali (geofence) definite all'interno della riserva; non viene effettuato un tracciamento continuo illimitato al di fuori della riserva.
Base giuridica: tuo consenso esplicito (art. 6, par. 1, lett. a) GDPR).

c) Adempimento di obblighi legali
Trattare i dati personali nei limiti necessari per adempiere a obblighi previsti da leggi, regolamenti e normativa nazionale o regionale in materia faunistico‑venatoria, sicurezza e responsabilità del gestore della riserva.
Base giuridica: adempimento di obblighi legali (art. 6, par. 1, lett. c) GDPR).

I dati non sono utilizzati per finalità di marketing, profilazione commerciale o altre finalità incompatibili con quanto sopra descritto, salvo tuo eventuale ulteriore e specifico consenso.

4. Modalità di trattamento e conservazione dei dati
I tuoi dati personali sono trattati con strumenti elettronici e, in casi limitati, anche con supporti cartacei, nel rispetto dei principi di liceità, correttezza, trasparenza, minimizzazione e limitazione della conservazione (art. 5 GDPR) e con misure tecniche e organizzative adeguate a garantirne la sicurezza (art. 32 GDPR).

I dati identificativi (es. nome e cognome) e di contatto sono conservati per il tempo necessario alla gestione del rapporto con la riserva e all'utilizzo dell'app, e, successivamente, per il periodo eventualmente previsto dalla legge (es. termini di prescrizione).

I dati di geolocalizzazione sono utilizzati solo per il tempo strettamente necessario a fornire le funzionalità di sicurezza e coordinamento in tempo reale e vengono cancellati automaticamente entro circa 1 minuto dalla loro raccolta, senza creare uno storico permanente dei tuoi spostamenti.

La Riserva Cacciatori Tuenno non conserva un archivio storico dettagliato delle tue posizioni; la geolocalizzazione serve esclusivamente a verificare in tempo reale la presenza di cacciatori nelle diverse aree e a prevenire sovrapposizioni di battute.

5. Ambito di comunicazione dei dati
I tuoi dati potranno essere conosciuti, nei limiti delle rispettive competenze, da:
- personale espressamente autorizzato dal Titolare (es. direzione della riserva, responsabili di battuta, personale di segreteria);
- soggetti terzi che forniscono servizi connessi all'app (es. fornitore della piattaforma, manutentori IT), nominati Responsabili del trattamento ai sensi dell'art. 28 GDPR;
- soggetti pubblici o autorità, quando la comunicazione sia richiesta dalla legge o da ordini legittimi.
I dati non saranno diffusi in modo indiscriminato né pubblicati.

6. Trasferimenti verso Paesi terzi
Qualora i dati siano trattati tramite servizi o infrastrutture ubicate al di fuori dello Spazio Economico Europeo (SEE), l'eventuale trasferimento avverrà nel rispetto degli artt. 44–49 GDPR (es. decisioni di adeguatezza della Commissione Europea o clausole contrattuali standard).

7. Diritti dell'interessato
In qualsiasi momento, ai sensi degli artt. 15–21 GDPR, puoi esercitare nei confronti del Titolare i seguenti diritti:
- diritto di accesso ai dati personali;
- diritto di rettifica dei dati inesatti o incompleti;
- diritto alla cancellazione dei dati ("diritto all'oblio") nei casi previsti dalla legge;
- diritto alla limitazione del trattamento;
- diritto alla portabilità dei dati (nei casi applicabili);
- diritto di opposizione al trattamento basato sul legittimo interesse o sull'esecuzione di compiti di interesse pubblico.

Quando il trattamento si basa sul consenso (in particolare per la geolocalizzazione), hai il diritto di revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento effettuato prima della revoca.

Potrai revocare il consenso alla geolocalizzazione tramite le impostazioni dell'app o del dispositivo; la revoca potrà limitare alcune funzioni di sicurezza e coordinamento delle battute.

Per l'esercizio dei tuoi diritti puoi contattare il Titolare ai recapiti sopra indicati (anche all'indirizzo email tuenno@cacciatoritrentini.it).

Hai inoltre il diritto di proporre reclamo all'Autorità Garante per la protezione dei dati personali qualora ritenga che il trattamento avvenga in violazione del GDPR o della normativa nazionale.

8. Consenso al trattamento dei dati di geolocalizzazione
Per procedere con l'utilizzo delle funzionalità di geolocalizzazione all'interno della riserva, ti chiediamo di esprimere il tuo consenso esplicito:

"Ho letto e compreso l'informativa sul trattamento dei miei dati personali, compresi i dati di geolocalizzazione all'interno della Riserva Cacciatori Tuenno. Acconsento al trattamento della mia posizione tramite sistemi di geolocalizzazione con attivazione mediante geofence, esclusivamente per le finalità di sicurezza e gestione delle battute di caccia descritte, con cancellazione automatica dei dati di posizione entro circa 1 minuto dalla raccolta."`;

export const OnboardingScreen = ({ onDone }: OnboardingScreenProps) => {
  const [phase, setPhase] = useState<Phase>('video');
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleChoice = (accepted: boolean) => {
    localStorage.setItem('riservapp_onboarding', 'done');
    localStorage.setItem('riservapp_geo', accepted ? 'true' : 'false');
    onDone(accepted);
  };

  // ── PHASE 1: Video ─────────────────────────────────────────────────
  if (phase === 'video') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
        <video
          ref={videoRef}
          src="/onboarding.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setPhase('privacy')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Tap per saltare */}
        <button
          onClick={() => setPhase('privacy')}
          style={{
            position: 'absolute', bottom: 32, right: 20,
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.7)', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          Salta
        </button>
      </div>
    );
  }

  // ── PHASE 2: Privacy + bottoni ─────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: '#EDEEE6', fontFamily: 'inherit',
    }}>
      {/* Header immagine */}
      <div style={{ flexShrink: 0, height: '28vh', position: 'relative', overflow: 'hidden' }}>
        <img
          src="/onboarding.png"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          draggable={false}
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px',
          background: 'linear-gradient(to bottom, transparent, #EDEEE6)',
        }} />
      </div>

      {/* Testo scrollabile */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 0' } as React.CSSProperties}>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: '#3A3A2E', whiteSpace: 'pre-wrap', margin: 0 }}>
          {PRIVACY_TEXT}
        </p>
      </div>

      {/* Bottoni */}
      <div style={{
        flexShrink: 0, padding: '14px 20px 28px',
        background: '#EDEEE6', borderTop: '1px solid #d0d5c4',
        display: 'flex', gap: 10,
      }}>
        <button
          onClick={() => handleChoice(false)}
          style={{
            flex: 1, padding: '14px 8px', borderRadius: 24,
            border: '1.5px solid #5C6B3A', background: 'transparent',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            color: '#5C6B3A', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          Non accetto
        </button>
        <button
          onClick={() => handleChoice(true)}
          style={{
            flex: 2, padding: '14px 8px', borderRadius: 24,
            border: 'none', background: '#5C6B3A',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            color: '#EDEEE6', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          Accetto
        </button>
      </div>
    </div>
  );
};
