import React, { useState } from 'react';
import { initialState } from './defaultStore';
import "./App.css"

interface StyleCustomizerProps {
    setCustomizations: (customizations: string) => void;
    error: string | null;
    setError: (error: string) => void;
}

export const Customize: React.FC<StyleCustomizerProps> = ({
    setCustomizations,
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

    const customizationInputs = () => {
        return (
            <div className={"textarea_container"}>
            <textarea
                className={"textarea"}
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
            <div className={"button_container"}>
                <button className={"button"} onClick={handleApply}>Apply</button>
                <button className={"button"} onClick={handleReset}>Reset</button>
            </div>
        )
    }

    return (
        <nav className={"navbar"}>
            {pageTitle()}
            {customizationInputs()}
            {actionButtons()}
            {error && <div className={error}>{error}</div>}
        </nav>
    );
}; 
