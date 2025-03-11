import { ConversationEmbed } from '@thoughtspot/visual-embed-sdk/react';

function Converse() {
  return (
    <>
      <a href="/">Home</a>
      <div className="spotter-container">
        <ConversationEmbed
          className='spotter-embed'
          worksheetId={import.meta.env.VITE_TS_DATASOURCE_ID}
          frameParams={{ width: '100%', height: '100%' }}
        />
      </div>
    </>
  );
}

export default Converse
