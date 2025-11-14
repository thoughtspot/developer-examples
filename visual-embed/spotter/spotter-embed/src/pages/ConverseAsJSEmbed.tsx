import { createRef, useEffect } from 'react';
import { ConversationEmbed } from '@thoughtspot/visual-embed-sdk';

function ConverseAsJSEmbed() {
  const ref = createRef<HTMLDivElement>();

  useEffect(() => {
    if (ref.current) {
      const convEmbed = new ConversationEmbed(ref.current, {
        worksheetId: import.meta.env.VITE_TS_DATASOURCE_ID,
      });
      convEmbed.render();
    }
  }, [ref.current]);
  return (
    <>
      <a href="/">Home</a>
      <div className="spotter-container">
        <div className='spotter-embed' ref={ref} />
      </div>
    </>
  );
}

export default ConverseAsJSEmbed
