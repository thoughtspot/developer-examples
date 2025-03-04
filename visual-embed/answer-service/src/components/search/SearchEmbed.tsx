import { SearchEmbed, useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";
import { useState } from 'react';

export const SearchEmbedComponent = () => {
    const embedRef = useEmbedRef();
    const [lastFetched, setLastFetched] = useState<{ type: string; data: any } | null>(null);

    const getSourceDetails = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const details = await service.getSourceDetail();
            setLastFetched({ type: 'Source Details', data: details });
            console.log(details);
        }
    }
    
    const fetchData = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const data = await service.fetchData();
            setLastFetched({ type: 'Fetched Data', data });
            console.log('data', data);
        }
    }

    const getTML = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const tml = await service.getTML();
            setLastFetched({ type: 'TML Data', data: tml });
            console.log('tml', tml);
        }
    }

    return (
        <div>
            <SearchEmbed
                frameParams={{
                    height: '90vh',
                    width: '100%',
                }}
                ref={embedRef}
                dataSource={import.meta.env.VITE_DATASOURCE_ID}
            />
            <div style={{ padding: '20px' }}>
                <button onClick={getSourceDetails}>Get Source Details</button>
                <button onClick={fetchData}>Fetch Data</button>
                <button onClick={getTML}>Get TML</button>

                {lastFetched && (
                    <div>
                        <h3>{lastFetched.type}:</h3>
                        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', color: '#000000' }}>
                            {JSON.stringify(lastFetched.data, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}