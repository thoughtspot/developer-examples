import { CustomizationStore } from '../types';
// Initial state with default values
const initialState: CustomizationStore = {
    style: {
        customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
        customCSS: {
          variables: {
            "--ts-var-button--secondary-background": "#F0EBFF",
            "--ts-var-button--secondary--hover-background": "#E3D9FC",
            "--ts-var-root-background": "#F7F5FF",
          },
          rules_UNSTABLE: {
            '{selector1}' : {
              "{css-property-name}" : "{value}!important",
              "{css-property-name2}" : "{value}!important"
            },
          }
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

export {
    initialState,
};