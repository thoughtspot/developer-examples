# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

# Full Height Liveboard with Lazy Loading

This example demonstrates the difference between embedding a ThoughtSpot liveboard with full height using the new `lazyLoadFullHeight` flag versus the default behavior.

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/full-height)

## 🚀 Features

- **Interactive Comparison**: Switch between lazy loading enabled/disabled modes
- **Performance Metrics**: Real-time load time tracking
- **Modern UI**: Beautiful, responsive design with glassmorphism effects
- **Code Examples**: Live configuration display showing the exact differences

## 📖 What is `lazyLoadFullHeight`?

The `lazyLoadFullHeight` flag is a performance optimization feature for embedding ThoughtSpot liveboards with full height. When enabled, it implements lazy loading for visualizations, loading them only when they become visible in the viewport.

### Configuration

```javascript
const embed = new LiveboardEmbed("#your-embed-div", {
  liveboardId: "your-liveboard-id",
  fullHeight: true,
  lazyLoadFullHeight: true, // Enable lazy loading for full height
});
```

## 🔄 Behavior Differences

### Without Lazy Loading (`lazyLoadFullHeight: false` or not set)

- **Default behavior**: All visualizations load immediately when the liveboard is embedded
- **Higher initial load time**: All data is fetched upfront
- **More network requests** at startup
- **Better for small liveboards** with few visualizations
- **Immediate availability** of all visualizations

### With Lazy Loading (`lazyLoadFullHeight: true`)

- **Optimized performance**: Visualizations load as they come into view
- **Faster initial load time**: Only visible content loads initially
- **Reduced network requests** at startup
- **Better for large liveboards** with many visualizations
- **Progressive loading** as user scrolls

## 🛠 Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/thoughtspot/developer-examples.git
   cd developer-examples/visual-embed/full-height
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the environment variables and update with your ThoughtSpot instance details:

   ```bash
   # Add these to your .env file
   VITE_TS_HOST=https://your-thoughtspot-instance.thoughtspot.cloud
   VITE_TS_USERNAME=your-username
   VITE_TS_PASSWORD=your-password
   VITE_LIVEBOARD_ID=your-liveboard-id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 📋 Configuration Options

| Property             | Type    | Default | Description                                  |
| -------------------- | ------- | ------- | -------------------------------------------- |
| `fullHeight`         | boolean | false   | Enables full height mode for the liveboard   |
| `lazyLoadFullHeight` | boolean | false   | Enables lazy loading when fullHeight is true |

## 🎯 Use Cases

### When to Use Lazy Loading ✅

- Large liveboards with many visualizations
- Performance-critical applications
- Mobile or low-bandwidth environments
- Liveboards with complex visualizations that take time to render

### When NOT to Use Lazy Loading ❌

- Small liveboards with few visualizations
- Applications where all data needs to be immediately available
- When you need to capture or export the entire liveboard immediately

## 🌟 Performance Benefits

1. **Faster Initial Load**: Only above-the-fold content loads initially
2. **Reduced Memory Usage**: Visualizations are loaded on demand
3. **Better User Experience**: Users can interact with visible content immediately
4. **Network Optimization**: Fewer concurrent requests at startup

## 🔗 Related Documentation

- [ThoughtSpot Developer Docs](https://developers.thoughtspot.com/)
- [Visual Embed SDK](https://www.npmjs.com/package/@thoughtspot/visual-embed-sdk)
- [Embed Liveboard Guide](https://developers.thoughtspot.com/docs/embed-liveboard)

## 🆕 Version Requirements

- Visual Embed SDK: Latest version
- Node.js: 18.x or higher
- Modern browsers with Intersection Observer API support

---

💡 **Tip**: Use the interactive demo to see the performance difference firsthand and copy the exact configuration for your implementation!
