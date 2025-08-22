# Full Height Liveboard with Lazy Loading

This example demonstrates the difference between embedding a ThoughtSpot liveboard with full height using the new `lazyLoadFullHeight` flag versus the default behavior.

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/full-height)

## What is full height?

Full height is a feature that allows you to embed a liveboard that automatically expands to the height of the embed to match the height of the Liveboard, eliminating the need for scroll bars.

## What is `lazyLoadFullHeight`?

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


## 🔗 Related Documentation

- [ThoughtSpot Developer Docs](https://developers.thoughtspot.com/)
- [Visual Embed SDK](https://www.npmjs.com/package/@thoughtspot/visual-embed-sdk)
- [Embed Liveboard Guide](https://developers.thoughtspot.com/docs/embed-liveboard)

## 🆕 Version Requirements

- Visual Embed SDK: 1.40.0 or higher
- ThoughtSpot: 10.11.0.cl or higher