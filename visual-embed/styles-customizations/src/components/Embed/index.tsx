import React from 'react';
import { Page, init, AuthType } from '@thoughtspot/visual-embed-sdk';
import { AppEmbed, LiveboardEmbed, SearchEmbed } from '@thoughtspot/visual-embed-sdk/react';
import styles from './styles.module.css';
import { EmbedType } from '../../types';

interface ThoughtSpotEmbedProps {
    customizations: string;
    thoughtSpotHost: string;
    embedType: EmbedType;
    dataSource: string;
    answerId: string;
    liveboard: string;
    setError: (error: string) => void;
}

export const Embed: React.FC<ThoughtSpotEmbedProps> = ({
    customizations,
    thoughtSpotHost,
    embedType,
    dataSource,
    answerId,
    liveboard,
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

    const renderEmbed = () => {
        switch (embedType) {
            case EmbedType.FullApp:
                return <AppEmbed pageId={Page.Home} showPrimaryNavbar={true} className={styles.embed_content} />;
            case EmbedType.Liveboard:
                return <LiveboardEmbed liveboardId={liveboard} className={styles.embed_content} />;
            case EmbedType.Viz:
                return <LiveboardEmbed liveboardId={liveboard} vizId={answerId} className={styles.embed_content} />;
            case EmbedType.Search:
                return <SearchEmbed dataSource={dataSource} className={styles.embed_content} />;
            default:
                return <SearchEmbed dataSource={dataSource} className={styles.embed_content} />;
        }
    };
    

    return (
        <div className={styles.container}>
            <div className={styles.content_wrapper}>
                {renderEmbed()}
            </div>
        </div>
    );
};