import { useEffect, useRef, useState } from 'react';
import { 
  SearchEmbed, 
  EmbedEvent,
  AnswerService
} from '@thoughtspot/visual-embed-sdk';
import './ThoughtSpotEmbed.css';

interface ThoughtSpotEmbedProps {
  thoughtspotHost: string;
  datasourceId: string;
  onAnswerServiceAvailable: (service: AnswerService) => void;
}

const ThoughtSpotEmbed = ({ 
  thoughtspotHost,
  datasourceId,
  onAnswerServiceAvailable
}: ThoughtSpotEmbedProps) => {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<SearchEmbed | null>(null);

  useEffect(() => {
    
    try {
      const embed = new SearchEmbed(embedContainerRef.current, {
        frameParams: {
          width: '100%',
          height: '600px',
        },
        dataSources: [datasourceId],
        hideDataSources: true
      });

      embed.on(EmbedEvent.Data, (payload: any) => {
        console.log('Data event received:', payload);
      });

      embed.on(EmbedEvent.QueryChanged, async (payload: any) => {
        console.log('Query changed:', payload);
        try {
          const service = await embed.getAnswerService();
          if (service) {
            onAnswerServiceAvailable(service);
            console.log('AnswerService available');
          }
        } catch (err) {
          console.log('AnswerService not yet available');
        }
      });

      embed.on(EmbedEvent.VizPointClick, (payload: any) => {
        console.log('Viz point clicked:', payload);
      });

      // Render the embed
      embed.render();
      
      // Store the embed reference
      embedRef.current = embed;
    } catch (error) {
      console.error('Error initializing SearchEmbed:', error);
    }

  }, [datasourceId, onAnswerServiceAvailable]);

  return (
    <div 
      ref={embedContainerRef} 
      className="embed-wrapper"
    ></div>
  );
};

export default ThoughtSpotEmbed; 