import React, { useState } from 'react';
import { initialState } from '../../store';
import { thoughtSpotHost } from '../../constants';
import styles from './styles.module.css';
import { EmbedType } from '../../types';

interface NavbarProps {
    embedType: EmbedType;
    setEmbedType: (embedType: EmbedType) => void;
    setCustomizations: (customizations: string) => void;
    dataSource: string;
    answerId: string;
    liveboard: string;
    setDataSource: (dataSource: string) => void;
    setAnswerId: (answerId: string) => void;
    setLiveboard: (liveboard: string) => void;
    error: string | null;
    setError: (error: string) => void;
}

export const SideBar: React.FC<NavbarProps> = ({
    embedType,
    setEmbedType,
    setCustomizations,
    dataSource,
    answerId,
    liveboard,
    setDataSource,
    setAnswerId,
    setLiveboard,
    error,
    setError
}) => {
    const [customStyles, setCustomStyles] = useState(JSON.stringify(initialState, null, 2));

    const handleReset = () => {
        setCustomStyles(JSON.stringify(initialState, null, 2));
    };

    const handleApply = () => {
        setCustomizations(customStyles);
        setError('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCustomStyles(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            const newValue = customStyles.substring(0, start) + '  ' + customStyles.substring(end);
            setCustomStyles(newValue);

            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 2;
            }, 0);
        }
    };

    const pageTitle = () => {
        return (
            <div className="content-container">
                <h3 style={{ margin: 0 }}>Style Customizations</h3>
            </div>
        );
    };

    const hostContainer = () => {
        return (
            <div className={styles.host_container}>
                <label>ThoughtSpot host</label>
                <input type="text" value={thoughtSpotHost} disabled />
            </div>
        );
    };

    const embedTypeSelector = () => {
        return (
            <div className={styles.select_container}>
                <select onChange={(e) => setEmbedType(e.target.value as EmbedType)} value={embedType}>
                    <option value={EmbedType.FullApp}>Full App</option>
                    <option value={EmbedType.Liveboard}>Liveboard</option>
                    <option value={EmbedType.Viz}>Answers</option>
                    <option value={EmbedType.Search}>Search</option>
                </select>
            </div>
        )
    }

    const customizationInputs = () => {
        return (
            <div className={styles.textarea_container}>
            <textarea
                className={styles.textarea}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                value={customStyles}
                spellCheck={false}
            />
        </div>
        )
    }

    const actionButtons = () => {
        return (
            <div className={styles.button_container}>
                <button className={styles.button} onClick={handleApply}>Apply</button>
                <button className={styles.button} onClick={handleReset}>Reset</button>
            </div>
        )
    }


    const getSelectedEmbedTypeMetadata = () => {
        switch (embedType) {
            case EmbedType.Liveboard:
                return <div className={styles.options_container}>
                <label>Liveboard ID</label>
                <input
                    type="text"
                    value={liveboard}
                    onChange={(e) => setLiveboard(e.target.value)}
                    />
                </div>
            case EmbedType.Search:
                return <div className={styles.options_container}>
                    <label>Data Source ID</label>
                    <input
                        type="text"
                        value={dataSource}
                        onChange={(e) => setDataSource(e.target.value)}
                    />
                </div>
            case EmbedType.Viz:
                return <div className={styles.options_container}>
                    <label>Liveboard ID</label>
                    <input
                        type="text"
                        value={liveboard}
                        onChange={(e) => setLiveboard(e.target.value)}
                    />
                    <label>Visualization ID</label>
                    <input
                        type="text"
                        value={answerId}
                        onChange={(e) => setAnswerId(e.target.value)}
                    />
                </div>
            default:
                return null;
        }
    }

    return (
        <nav className={styles.navbar}>
            {pageTitle()}
            {hostContainer()}
            {embedTypeSelector()}
            {getSelectedEmbedTypeMetadata()}
            {customizationInputs()}
            {actionButtons()}
            {error && <div className={styles.error}>{error}</div>}
        </nav>
    );
}; 
