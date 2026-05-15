import { useState, useEffect, useRef } from "react";
import { PreRenderedLiveboardEmbed, EmbedEvent } from "@thoughtspot/visual-embed-sdk/react";

type EmbedEventEntry = { type: string; ts: string };

const PreRenderHome = ({ preRenderId, liveboardId }: { preRenderId: string; liveboardId?: string }) => {
  const [rendered, setRendered] = useState(false);
  const [events, setEvents] = useState<EmbedEventEntry[]>([]);
  const embedRef = useRef<any>(null);

  useEffect(() => {
    embedRef.current?.on(EmbedEvent.ALL, (payload: any) => {
      const type = payload?.type;
      if (!type) return;
      setEvents((prev) => [{ type, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    });
  }, []);

  return (
    <div className="pre-render-home">
      <PreRenderedLiveboardEmbed
        ref={embedRef}
        liveboardId={liveboardId}
        preRenderId={preRenderId}
        onLiveboardRendered={() => setRendered(true)}
      />
      <div className="pre-render-row">
        <div className="pre-render-status">
          <div className={`status-badge ${rendered ? "loaded" : "loading"}`}>
            <span className="status-dot" />
            {rendered ? "Liveboard loaded in the background" : "Pre-rendering liveboard in the background..."}
          </div>
        </div>
        <div className="event-log">
          <span className="event-log-title">Embed Events</span>
          {events.length === 0 ? (
            <p className="event-log-empty">Waiting for events...</p>
          ) : (
            <ul className="event-list">
              {events.map((e, i) => (
                <li key={i} className="event-item">
                  <span className="event-type">{e.type}</span>
                  <span className="event-ts">{e.ts}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="status-hint">
        {rendered
          ? "Navigate to View Liveboard for an instant load experience."
          : "The liveboard will open instantly once pre-rendering is done."}
      </p>
    </div>
  );
};

export default PreRenderHome;
