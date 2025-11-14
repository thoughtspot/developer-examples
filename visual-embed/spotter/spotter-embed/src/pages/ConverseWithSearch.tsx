import { ConversationEmbed } from '@thoughtspot/visual-embed-sdk/react';

function ConverseWithSearch() {
  return (
    <>
      <a href="/">Home</a>
      <h1>Start conversation with search</h1>
      <div className="spotter-container">
        <ConversationEmbed
          className='spotter-embed'
          worksheetId={import.meta.env.VITE_TS_DATASOURCE_ID}
          searchOptions={{
            searchQuery: 'Display sales by region'
          }}
          frameParams={{ width: '100%', height: '100%' }}
        />
      </div>
    </>
  );
}

export default ConverseWithSearch;
