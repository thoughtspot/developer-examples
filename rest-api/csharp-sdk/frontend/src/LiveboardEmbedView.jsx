import { useEffect, useRef, useState } from "react";
import { init, AuthType, LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import { api } from "./api.js";

// Embeds a live Liveboard using the Visual Embed SDK, authenticated via a
// token minted by the backend's /api/embed-token endpoint (trusted-auth,
// cookieless — no ThoughtSpot login page shown to the end user).
export default function LiveboardEmbedView({ liveboardId }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const initedHostRef = useRef(null);

  useEffect(() => {
    if (!liveboardId) return;
    let cancelled = false;

    async function mount() {
      try {
        const { token, host, username } = await api.embedToken();
        if (cancelled) return;

        if (initedHostRef.current !== host) {
          init({
            thoughtSpotHost: host,
            authType: AuthType.TrustedAuthTokenCookieless,
            username,
            getAuthToken: async () => {
              // Re-fetch on every call so re-renders/refresh use a fresh token.
              const t = await api.embedToken();
              return t.token;
            },
          });
          initedHostRef.current = host;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        const embed = new LiveboardEmbed(containerRef.current, {
          liveboardId,
          frameParams: { width: "100%", height: "600" },
        });
        embed.render();
      } catch (e) {
        setError(e.message);
      }
    }

    mount();
    return () => {
      cancelled = true;
    };
  }, [liveboardId]);

  if (!liveboardId) return <p>Search for a liveboard above and pick one to embed it here.</p>;
  if (error) return <p style={{ color: "crimson" }}>Embed error: {error}</p>;

  return <div ref={containerRef} style={{ width: "100%", minHeight: 600, border: "1px solid #ddd" }} />;
}
