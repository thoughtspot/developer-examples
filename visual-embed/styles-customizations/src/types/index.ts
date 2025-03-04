interface CssRule {
    [selector: string]: {
        [property: string]: string;
    };
}

// Main store interface
interface CustomizationStore {
    style: {
        customCSSUrl: string;
        customCSS: {
            variables: { [key: string]: string };
            rules_UNSTABLE: CssRule;
        };
    };
    iconSpriteUrl: string;
    content: {
        strings: { [key: string]: string };
    };
}

export enum EmbedType {
    FullApp = 'fullApp',
    Liveboard = 'liveboard',
    Viz = 'viz',
    Search = 'search',
}

export type {
    CustomizationStore,
    CssRule,
};