# ThoughtSpot Visual Embed SDK Customization Demo

This application demonstrates how to customize the default styles, color schemes, design elements, and typography of ThoughtSpot elements.

## Features

- Live preview of ThoughtSpot customizations
- Support for multiple embed types:
  - Full Application
  - Liveboard
  - Visualization
  - Search
- JSON editor for customization configuration
- Real-time validation and error handling
- Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A ThoughtSpot cloud instance

### Installation

1. Clone the repository:

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/styles-customizations
```

2. Install dependencies:

```
$ npm install
```

3. Create a `.env` file in the root directory and set the ThoughtSpot host:

```
REACT_APP_THOUGHT_SPOT_HOST=https://your-thoughtspot-host.com
```

4. Start the development server:

```
$ npm run dev
```

5. Open your browser and navigate to `http://localhost:5173` to see the application in action.

### Usage

1. Select the embed type from the dropdown menu.
2. Configure the customization options.
3. Click the "Apply" button to see the live preview.
4. Click the "Reset" button to reset the customization options to the default values.

### Customization Options

- CSS Variables:
    - CSS variables and rule overrides are defined using the style property of the customizations property.
    - Modify CSS variables to change the look and feel of the ThoughtSpot application.
    - Example:
    ```json
    {
      customizations: {
        style: {
        // location of a saved stylesheet with ThoughtSpot variable declarations and rules using CSS selectors
            customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
            // direct overrides declared within the Visual Embed SDK code
            customCSS: {
                // ThoughtSpot variables declared inline
                variables: {
                    "--ts-var-button--secondary-background": "#F0EBFF",
                    "--ts-var-button--secondary--hover-background": "#E3D9FC",
                    "--ts-var-root-background": "#F7F5FF",
                },
            // CSS selectors declared inline, with syntax for declaring multiple CSS properties
            
        }
      },
    },   
    ```

- Custom CSS Rules:
  - Add custom CSS rules to the ThoughtSpot application.
  Example:
    ```json 
    {
      "style": {
        "customCSS": {
          "rules_UNSTABLE": {
                '{selector1}' : {
                    "{css-property-name}" : "{value}!important",
                    "{css-property-name2}" : "{value}!important"
                },
                }
            }
        }
      }
    }
    ```
- String Overrides:
  - Customize text strings on the ThoughtSpot application interface via customizations object in the SDK.
  Example:
    ```json
    {
      "content": {  
        "strings": {
          "Liveboard": "Dashboard",
          "Edit": "Modify",
          "Show underlying data": "Show source data",
          "SpotIQ": "Insights",
          "Monitor": "Alerts",
          "Worksheets": "Data model"
        }
      }
    }
    ```

- Icon Sprite:
  - Customize the icons on a ThoughtSpot page using an icon sprite SVG file and load it from a Web server or CDN.        
  Example:
    ```json
    {
      "iconSpriteUrl": "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/icon-sprite.svg"
    }
    ``` 
## Project Structure

    src/
    ├── components/
    │ ├── Embed/
    │ ├── SideBar/
    │ └── ...
    ├── constants/
    ├── store/
    └── types/



## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/styles-customizations)

## Documentation

- [Custom CSS](https://developers.thoughtspot.com/docs/custom-css)


### Technology labels

- React
- Typescript
- Web
