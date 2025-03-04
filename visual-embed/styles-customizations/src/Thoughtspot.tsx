import React from 'react';
import { Page, init, AuthType } from '@thoughtspot/visual-embed-sdk';
import { AppEmbed } from '@thoughtspot/visual-embed-sdk/react';
import "./App.css";

interface ThoughtSpotEmbedProps {
    customizations: string;
    thoughtSpotHost: string;
    setError: (error: string) => void;
}

export const Thoughtspot: React.FC<ThoughtSpotEmbedProps> = ({
    customizations,
    thoughtSpotHost,
    setError
}) => {
    const initializeThoughtSpot = async () => {
        try {
            init({
                thoughtSpotHost,
                authType: AuthType.None,
                customizations: JSON.parse(customizations),
            });
        } catch (error) {
            setError('Error parsing customizations');
            console.error('Error initializing ThoughtSpot', error);
            
        }
    };

    initializeThoughtSpot();
    
    return (
        <div className={'container'}>
            <div className={'content_wrapper'}>
            <AppEmbed pageId={Page.Home} showPrimaryNavbar={true} className={'embed_content'} />;
            </div>
        </div>
    );
};