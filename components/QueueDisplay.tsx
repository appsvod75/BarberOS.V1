
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useBarber } from '../context/BarberContext';
import { Ticket } from '../types';
import { X, LogOut, ListVideo, Play, Info, Shuffle } from 'lucide-react';
import ReactPlayer from 'react-player';

// Cast ReactPlayer to avoid TS errors with props
const Player = ReactPlayer as unknown as React.ComponentType<any>;

interface QueueDisplayProps {
  onClose?: () => void;
}

export const QueueDisplay = ({ onClose }: QueueDisplayProps) => {
  const { tickets, config, logout, currentUser } = useBarber();
  const [servingTickets, setServingTickets] = useState<Ticket[]>([]);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Volume State for Ducking effect (1.0 = 100%, 0.3 = 30%)
  const [playerVolume, setPlayerVolume] = useState(1.0);

  // Ref to control the announcement loop
  const announcementTimeoutRef = useRef<any>(null);

  // Playlist Logic
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  // Persist Shuffle State using Lazy Initializer
  const [isShuffle, setIsShuffle] = useState(() => {
    const saved = localStorage.getItem('playlist_shuffle');
    return saved === 'true'; // Default false if not set
  });

  const playlist = config.videoPlaylist && config.videoPlaylist.length > 0
    ? config.videoPlaylist
    : config.youtubeVideoId
      ? [{ id: 'default', name: 'Default Video', url: config.youtubeVideoId, type: 'link' }] as any
      : [{ id: 'fallback', name: 'Barber Demo', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A', type: 'link' }] as any;

  const currentVideoUrl = playlist[currentVideoIndex]?.url;

  // Reset Shuffle when video URL changes (New Playlist Loaded)
  useEffect(() => {
    setIsShuffle(false);
  }, [currentVideoUrl]);

  // Toggle Shuffle
  const toggleShuffle = () => {
    const newState = !isShuffle;
    setIsShuffle(newState);
    localStorage.setItem('playlist_shuffle', String(newState));
  };

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle video end (Next in playlist)
  const handleVideoEnd = () => {
    if (isShuffle && playlist.length > 1) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentVideoIndex); // Avoid repeating same video
      setCurrentVideoIndex(nextIndex);
    } else {
      setCurrentVideoIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  // Filter active tickets
  useEffect(() => {
    const active = tickets.filter(t => t.status === 'serving');
    setServingTickets(active);
  }, [tickets]);

  // Voice Announcement Logic with Volume Ducking
  useEffect(() => {
    if (!audioEnabled) return;

    const latestTicket = tickets
      .filter(t => t.status === 'serving')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestTicket && latestTicket.id !== lastAnnouncedId) {
      setLastAnnouncedId(latestTicket.id);

      // Stop any previous loop and audio
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      window.speechSynthesis.cancel();

      // 1. DUCK VOLUME (Bajar volumen al 30%)
      setPlayerVolume(0.3);

      // Start 4x Repetition Loop
      let count = 0;

      const playSequence = () => {
        if (count < 4) {
          // Pass a callback to run AFTER speech finishes
          announceTicket(latestTicket, () => {
            count++;
            // Only schedule next if we haven't reached limit
            if (count < 4) {
              announcementTimeoutRef.current = setTimeout(playSequence, 3000);
            } else {
              // 2. RESTORE VOLUME (Regresar al 100% después del último anuncio)
              // Small delay for natural transition
              setTimeout(() => {
                setPlayerVolume(1.0);
              }, 1000);
            }
          });
        }
      };

      playSequence();
    }

    // Cleanup on unmount or change
    return () => {
      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
      window.speechSynthesis.cancel();
      // Restore volume just in case
      setPlayerVolume(1.0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, audioEnabled]);

  const announceTicket = (ticket: Ticket, onEnd?: () => void) => {
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = 'es-ES';
    utterance.text = `Turno ${ticket.fullCode.replace('-', ' ')}. Pasar a ${ticket.chair || 'Silla'}.`;
    utterance.rate = 0.9;

    // Trigger callback only when speech physically ends
    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    // Error handling just in case
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Logic for Seamless Marquee
  const baseDuration = 20; // Faster base speed (20s)
  const speed = config.tickerSpeed || 1;
  // Ref for the iframe to send commands dynamically
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Effect to toggle Shuffle/Loop on the fly without reloading
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send commands to YouTube Player
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        "event": "command",
        "func": "setShuffle",
        "args": [isShuffle]
      }), "*");

      // If turning ON shuffle, we might want to also ensure loop is ON
      if (isShuffle) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          "event": "command",
          "func": "setLoop",
          "args": [true]
        }), "*");
      }
    }
  }, [isShuffle]); // Run whenever shuffle state changes

  const animationDuration = `${baseDuration / speed}s`;

  const rawMessages = (config.tickerMessage || '').split('\n').filter(m => m.trim() !== '');
  const messages = rawMessages.length > 0 ? rawMessages : ['Bienvenidos a BarberOS', 'Espere su turno'];
  const fullText = messages.join('  •  ');

  // Format Time
  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // Format Date (Ej: LUN 25 ENE)
  const dateStr = currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden relative">

      {/* --- CONTROLS OVERLAY --- */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] bg-zinc-800/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition-all border border-zinc-600"
          title="Salir de vista de pantalla"
        >
          <X size={24} />
        </button>
      )}

      {!onClose && currentUser?.role === 'display' && (
        <button
          onClick={logout}
          className="absolute top-4 left-4 z-[60] bg-zinc-800/40 hover:bg-red-600 text-zinc-400 hover:text-white p-2 rounded-full backdrop-blur-md transition-all border border-zinc-700/30 group"
          title="Cerrar Sesión de Pantalla"
        >
          <LogOut size={20} />
        </button>
      )}

      {!audioEnabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <button
            onClick={() => setAudioEnabled(true)}
            className="px-8 py-4 bg-red-600 text-white text-2xl font-bold rounded-xl hover:bg-red-700 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.6)]"
          >
            ACTIVAR SONIDO Y PANTALLA
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Queue List (1/5 width) */}
        <div className="w-1/5 bg-zinc-900 border-r-4 border-zinc-700 flex flex-col">
          <div className="bg-red-700 p-2 text-center shadow-lg z-10">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Turnos Actuales</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {servingTickets.length === 0 && (
              <div className="text-center text-zinc-500 mt-10 text-lg">Esperando turnos...</div>
            )}
            {servingTickets.map((ticket, idx) => {
              const isCalling = ticket.id === lastAnnouncedId;
              return (
                <div
                  key={ticket.id}
                  className={`p-3 rounded-lg border-l-8 shadow-lg transform transition-all relative ${isCalling
                    ? 'bg-white text-black border-red-600 scale-[1.02] z-10 ring-4 ring-red-600/50 my-2'
                    : 'bg-zinc-800 text-white border-zinc-600 opacity-90'
                    }`}
                >
                  {/* HEADER: LLAMANDO CENTRADO */}
                  <div className="h-6 flex items-center justify-center mb-1">
                    {isCalling && (
                      <span className="text-sm font-black text-red-600 animate-pulse tracking-[0.2em] uppercase">
                        📢 LLAMANDO...
                      </span>
                    )}
                  </div>

                  {/* BODY: CODIGO + SILLA (MISMA LINEA) */}
                  <div className="flex justify-between items-end border-b border-zinc-300/20 pb-2 mb-2">
                    {/* Codigo */}
                    <div className="text-5xl font-black tracking-tighter leading-none">
                      {ticket.fullCode}
                    </div>

                    {/* Silla */}
                    <div className="flex flex-col items-end pb-1">
                      <span className={`text-[10px] font-bold uppercase mb-0.5 ${isCalling ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Pasar a
                      </span>
                      <div className={`px-3 py-1 rounded font-black text-xl uppercase tracking-wide shadow-sm ${isCalling ? 'bg-black text-white' : 'bg-zinc-600 text-zinc-300'}`}>
                        {ticket.chair || 'Silla 1'}
                      </div>
                    </div>
                  </div>

                  {/* FOOTER: NOMBRE */}
                  <div className={`text-sm font-bold truncate ${isCalling ? 'text-zinc-800' : 'text-zinc-400'}`}>
                    {ticket.clientName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact "Next" Section */}
          <div className="bg-zinc-800 p-2 border-t border-zinc-700 shrink-0">
            <h3 className="text-zinc-500 text-[10px] uppercase text-center mb-1">En Espera</h3>
            <div className="flex gap-1 justify-center overflow-x-auto pb-1 scrollbar-hide">
              {tickets.filter(t => t.status === 'waiting').slice(0, 4).map(t => (
                <span key={t.id} className="bg-zinc-700 px-2 py-0.5 rounded text-sm font-bold text-zinc-300 whitespace-nowrap">{t.fullCode}</span>
              ))}
              {tickets.filter(t => t.status === 'waiting').length > 4 && <span className="text-zinc-500 text-xs flex items-center">...</span>}
            </div>
          </div>
        </div>

        {/* Right Column: Universal Video Player (4/5 width) */}
        <div
          className="w-4/5 bg-black relative flex items-center justify-center overflow-hidden group"
        >
          <div className="absolute inset-0 w-full h-full">
            {/* 1. RAW HTML EMBED CODE DETECTION */}
            {currentVideoUrl && currentVideoUrl.trim().startsWith('<') ? (
              <div className="w-full h-full" dangerouslySetInnerHTML={{
                __html: (() => {
                  let html = currentVideoUrl;
                  // AUTO-FIX TWITCH EMBEDS
                  if (html.includes('player.twitch.tv')) {
                    const host = window.location.hostname;
                    // Replace existing parent param or append
                    if (html.includes('parent=')) {
                      html = html.replace(/parent=[^&"']+/g, `parent=${host}&parent=localhost&parent=127.0.0.1`);
                    } else {
                      // Basic append - fragile but covers simple src="..."
                      html = html.replace('?', `?parent=${host}&parent=localhost&parent=127.0.0.1&`);
                    }
                  }
                  return html;
                })()
              }} />
            ) :
              /* 2. TWITCH URL DETECTION (AUTO-CONVERT TO IFRAME) */
              (currentVideoUrl?.includes('twitch.tv')) ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const host = window.location.hostname;
                      let channel = '';
                      if (currentVideoUrl.includes('channel=')) {
                        channel = currentVideoUrl.split('channel=')[1].split('&')[0];
                      } else {
                        const parts = currentVideoUrl.split('/').filter((p: string) => p);
                        channel = parts[parts.length - 1];
                        if (channel.includes('?')) channel = channel.split('?')[0];
                      }
                      return `<iframe 
                             src="https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=127.0.0.1&parent=${host}&muted=true&autoplay=true" 
                             height="100%" 
                             width="100%" 
                             frameborder="0" 
                             allowfullscreen>
                           </iframe>`;
                    })()
                  }}
                />
              ) :
                /* 3. YOUTUBE DETECTION (ROBUST EXTRACTOR) */
                (() => {
                  const youtubeSrc = useMemo(() => {
                    const url = currentVideoUrl;
                    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return null;

                    // Extract YouTube ID or Playlist ID
                    let videoId = '';
                    let playlistId = '';

                    if (url.includes('list=')) {
                      playlistId = url.split('list=')[1].split('&')[0];
                    }

                    if (url.includes('v=')) {
                      videoId = url.split('v=')[1].split('&')[0];
                    } else if (url.includes('youtu.be/')) {
                      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
                    } else if (url.includes('embed/')) {
                      videoId = url.split('embed/')[1].split(/[?#]/)[0];
                    }

                    // Remove random index logic in favor of native API
                    return playlistId
                      ? `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=${audioEnabled ? 0 : 1}&loop=1&enablejsapi=1`
                      : `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${audioEnabled ? 0 : 1}&loop=1&playlist=${videoId}&enablejsapi=1`;
                  }, [currentVideoUrl, audioEnabled]); // depend on audioEnabled to reload mute state

                  if (!youtubeSrc) return null;

                  return (
                    <iframe
                      ref={iframeRef}
                      key={`${youtubeSrc}-${audioEnabled}`}
                      width="100%"
                      height="100%"
                      src={youtubeSrc}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      onLoad={(e) => {
                        if (isShuffle) {
                          // Send native command to shuffle playlist
                          e.currentTarget.contentWindow?.postMessage(JSON.stringify({
                            "event": "command",
                            "func": "setShuffle",
                            "args": [true]
                          }), "*");
                          // Also loop playlist
                          e.currentTarget.contentWindow?.postMessage(JSON.stringify({
                            "event": "command",
                            "func": "setLoop",
                            "args": [true]
                          }), "*");
                        }
                      }}
                    ></iframe>
                  );
                })() || (
                  /* 4. UNIVERSAL PLAYER (MP4, etc) */
                  <Player
                    key={currentVideoUrl} // Force reload on source change
                    url={currentVideoUrl}
                    width="100%"
                    height="100%"
                    playing={true}
                    volume={playerVolume} // Control de volumen dinámico
                    muted={!audioEnabled} // Solo muteado si no se ha activado el audio
                    loop={playlist.length === 1} // Loop if only 1 video
                    onEnded={handleVideoEnd}
                    controls={false}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                    config={{
                      twitch: {
                        options: {
                          parent: ['localhost', '127.0.0.1', window.location.hostname]
                        }
                      },
                      file: {
                        forceVideo: true
                      }
                    } as any}
                  />
                )}
          </div>

          {/* Overlay Branding */}
          <div className="absolute top-4 right-6 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5 z-20 pointer-events-none opacity-50">
            <h1 className="text-xl font-bold text-white tracking-widest">{(config.salonName || 'Barber' || '').toUpperCase()}</h1>
          </div>

          {/* Shuffle Toggle Button (Left of Playlist) */}
          {playlist.length > 1 && (
            <button
              onClick={toggleShuffle}
              className={`absolute top-16 right-20 z-30 p-3 rounded-full backdrop-blur-md transition-all border shadow-lg ${isShuffle
                ? 'bg-green-600 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-700/80 hover:text-white'
                }`}
              title={isShuffle ? "Modo Aleatorio: ACTIVADO" : "Modo Aleatorio: DESACTIVADO"}
            >
              <Shuffle size={24} />
            </button>
          )}

          {/* Playlist Toggle Button */}
          {playlist.length > 1 && (
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="absolute top-16 right-6 z-30 bg-blue-600/30 hover:bg-blue-600/60 text-white p-3 rounded-full backdrop-blur-md transition-all border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              title="Ver Lista de Reproducción"
            >
              <ListVideo size={24} />
            </button>
          )}

          {/* Playlist Overlay Menu */}
          {playlist.length > 1 && showPlaylist && (
            <div className="absolute top-36 right-6 w-64 bg-black/90 backdrop-blur-md border border-zinc-700 rounded-xl p-4 transition-all duration-300 z-30 shadow-2xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-3 border-b border-zinc-700 pb-2">
                <ListVideo size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">En Reproducción</span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {playlist.map((vid: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowPlaylist(false);
                    }}
                    className={`w-full text-left p-2 rounded text-xs flex items-center gap-2 transition-colors ${i === currentVideoIndex ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                  >
                    {i === currentVideoIndex && <Play size={10} fill="currentColor" />}
                    <span className="truncate">{vid.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Ticker (Marquee) */}

      <div className="h-24 bg-red-700 flex items-center border-t-8 border-red-900 relative z-20 shrink-0 shadow-[0_-10px_50px_rgba(220,38,38,0.5)]">
        <div className="bg-red-900 h-full px-8 flex items-center justify-center font-black text-white text-xl z-30 shadow-[10px_0_30px_rgba(0,0,0,0.2)] gap-3 border-r-4 border-red-950">
          <Info size={32} className="text-red-200" />
          <span className="tracking-widest hidden md:inline">INFORMACIÓN</span>
        </div>

        <div className="marquee-container flex-1 h-full flex items-center overflow-hidden bg-red-800/50">
          <div
            className="marquee-content flex items-center"
            style={{ animationDuration: animationDuration }}
          >
            {/* Duplicate content for seamless loop */}
            <span className="text-5xl font-black italic text-white uppercase tracking-tighter whitespace-nowrap px-12 drop-shadow-md">
              {fullText}
            </span>
            <span className="text-5xl font-black italic text-white uppercase tracking-tighter whitespace-nowrap px-12 drop-shadow-md">
              {fullText}
            </span>
            <span className="text-5xl font-black italic text-white uppercase tracking-tighter whitespace-nowrap px-12 drop-shadow-md">
              {fullText}
            </span>
          </div>
        </div>

        {/* NEW: Date & Time Section */}
        <div className="bg-red-900 h-full px-10 flex flex-col items-end justify-center text-white z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.2)] border-l-8 border-red-950 min-w-[200px]">
          <span className="font-black text-5xl italic leading-none tracking-tighter drop-shadow-sm">{timeStr}</span>
          <span className="text-sm font-black text-red-200 uppercase tracking-widest leading-none mt-2">{dateStr}</span>
        </div>
      </div>
    </div>
  );
};
