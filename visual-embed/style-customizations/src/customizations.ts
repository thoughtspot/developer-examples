interface CssRule {
  [selector: string]: {
      [property: string]: string;
  };
}

export interface CustomizationStore {
  style?: {
      customCSSUrl?: string;
      customCSS?: {
          variables?: { [key: string]: string };
          rules_UNSTABLE?: CssRule;
      };
  };
  iconSpriteUrl?: string;
  content?: {
      strings: { [key: string]: string };
  };
}


const globalCustomizationConfig: CustomizationStore = {
    style: {
        customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
        customCSS: {
          variables: {
            "--ts-var-button--secondary-background": "#F0EBFF",
            "--ts-var-button--secondary--hover-background": "#E3D9FC",
            "--ts-var-root-background": "#F7F5FF",
          },
        },
    },
    "iconSpriteUrl": "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/icon-sprite.svg",
    content: {
        strings: {
            "Liveboard": "Dashboard",
            "Edit": "Modify",
            "Show underlying data": "Show source data",
            "SpotIQ": "Insights",
            "Monitor": "Alerts",
            "Worksheets": "Data model"
        }
    }
    
};

const appCustomizationConfig: CustomizationStore = {
  style: {
      customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
      customCSS: {
        rules_UNSTABLE: {
          '[data-testid="select-dropdown-header"]':{
            "background-color":"#ABC7F9"
          }
        }
      },
  },
  content: {
    strings: {
        "Liveboard": "Dashboard - App",
    }
}
};

export {
    globalCustomizationConfig,
    appCustomizationConfig
};