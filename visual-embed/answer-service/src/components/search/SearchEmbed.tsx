import { SearchEmbed, useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";


export const SearchEmbedComponent = () => {
    const embedRef = useEmbedRef();
    const getSourceDetails = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const sourceDetails = await service.getSourceDetail();
            console.log(sourceDetails);
        }
    }
    
    const fetchData = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const data = await service.fetchData();
            console.log('data', data);
        }
    }
    const getTML = async () => {
        if (embedRef.current) {
            const service = await embedRef.current.getAnswerService();
            const tml = await service.getTML();
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
            <button onClick={getSourceDetails}>Get Source Details</button>
            <button onClick={fetchData}>Fetch Data</button>
            <button onClick={getTML}>Get TML</button>
        </div>
    )
}