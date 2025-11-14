import { CustomisationsInterface } from "@thoughtspot/visual-embed-sdk";

// Global style customization for ThoughtSpot
const globalCustomizationConfig: CustomisationsInterface = {
  style: {
    // URL to the saved stylesheet with ThoughtSpot variable declarations and rules using CSS selectors
    customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
    
    // Direct CSS overrides within the Visual Embed SDK
    customCSS: {
      // ThoughtSpot variables declared inline (Reference: https://developers.thoughtspot.com/docs/css-variables-reference)
      variables: {
        "--ts-var-button--secondary-background": "#F0EBFF",
        "--ts-var-button--secondary--hover-background": "#E3D9FC",
        "--ts-var-root-background": "#F7F5FF",
      },
    },
  },
  
  // Override the icon sprite used in ThoughtSpot (Reference: https://developers.thoughtspot.com/docs/customize-icons)
  iconSpriteUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/icon-override1.svg",
  
  // Override the default text strings used in ThoughtSpot (Reference: https://developers.thoughtspot.com/docs/customize-text)
  content: {
    strings: {
      "Liveboard": "Dashboard",
      "Edit": "Modify",
      "Show underlying data": "Show source data",
      "SpotIQ": "Insights",
      "Monitor": "Alerts",
      "Worksheets": "Data model"
    },
  },
};

const appCustomizationConfig: CustomisationsInterface = {
  style: {
    // URL to the saved stylesheet with ThoughtSpot variable declarations and rules using CSS selectors
    customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
    
    // Inline CSS overrides with specific selectors and multiple properties
    customCSS: {
      rules_UNSTABLE: {
        '[data-testid="select-dropdown-header"]': {
          "background-color": "#ABC7F9"
        },
      },
    },
  },
  
  // Override the default text strings for the application (App-specific)
  content: {
    strings: {
      "Liveboard": "Dashboard - App",
    },
  },
};

export {
  globalCustomizationConfig,
  appCustomizationConfig
};
