<!-- search-meta
tags: [custom-styles, CSS, React, TypeScript, customization, branding, css-variables, AppEmbed]
apis: [CustomisationsInterface, customCSSUrl, customCSS, rules_UNSTABLE, cssVariables, AppEmbed, init]
questions:
  - How do I apply custom CSS to ThoughtSpot embed?
  - How do I customize colors and fonts in embedded ThoughtSpot?
  - How do I apply a custom theme to ThoughtSpot embed?
  - How do I rename UI labels like Liveboard to Dashboard in ThoughtSpot?
  - How do I use CSS variables to style ThoughtSpot embed?
-->

# ThoughtSpot Visual Embed SDK Customization Demo

This is a small example of how to customize the default styles, color schemes, design elements, and typography of ThoughtSpot elements.

## Key Usage

```typescript
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react";
import { CustomisationsInterface } from "@thoughtspot/visual-embed-sdk";

const customizations: CustomisationsInterface = {
  style: {
    customCSSUrl: "https://your-cdn.com/custom-styles.css",
    customCSS: {
      variables: {
        "--ts-var-button--secondary-background": "#F0EBFF",
        "--ts-var-root-background": "#F7F5FF",
      },
    },
  },
  content: {
    strings: {
      Liveboard: "Dashboard",
      Edit: "Modify",
    },
  },
};

init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.Basic,
  username: "your-username",
  password: "your-password",
  customizations, // global customizations applied to all embeds
});

// Per-embed customizations override global ones
<AppEmbed customizations={perEmbedCustomizations} />
```

## Demo
Open in [Codesandbox](https://codesandbox.io/p/sandbox/github/thoughtspot/developer-examples/tree/main/visual-embed/style-customizations)

## Documentation

- [API Reference](https://developers.thoughtspot.com/docs/customize-style) for the Custom CSS.
- Full [tutorial](https://developers.thoughtspot.com/docs/tutorials/style-customization/tutorial) on how to customize the styles of ThoughtSpot.

## Environment

The `.env` file contains some default values. Change the value of `VITE_THOUGHTSPOT_HOST` and `VITE_TS_USERNAME` and `VITE_TS_PASSWORD` to use on your own instance.

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/style-customizations
```
```
$ npm i
```
```
$ npm start
```

## Structure

- `src/` React code for the customizations.


### Technology labels

- React
- Typescript
- Web