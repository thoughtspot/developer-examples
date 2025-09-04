# Spotter Agent Embed

This is a small example of how embed spotter into your own agent if you have one. The example creates a simple agent using Gemini-flash model's function calling capability.

The simple agent makes the decision whether a user's message has analytical intent and should be handled by ThoughtSpot. The decision is passed down to the client which makes
the actual API call to run the query on ThoughtSpot and return the ThoughtSpot visual using the ThoughtSpot Visual embed SDK.

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/spotter/spotter-agent-embed)

## 🚀 **Run Locally**

```bash
# Get repo locally
git clone https://github.com/thoughtspot/developer-examples
cd visual-embed/spotter/spotter-agent-embed
# Install dependencies
npm install

# Start both services (Gemini agent + React app)
npm start
```

## 📋 **Environment Variables**

```bash
# ThoughtSpot Configuration
VITE_THOUGHTSPOT_HOST=your-thoughtspot-host
VITE_TOKEN_SERVER=your-token-server  
VITE_USERNAME=your-username
VITE_TS_DATASOURCE_ID=your-worksheet-id

# Gemini Configuration  
GEMINI_API_KEY=your-gemini-api-key
AGENT_PORT=4000
```

## 🔄 **How It Works**

```
User: "Sales per year"
      ↓
Gemini AI decides to call analyzeData function
      ↓  
ThoughtSpot Spotter generates visualization
      ↓
SpotterMessage displays the chart
```

## 📁 **Simple File Structure**

- **`src/App.tsx`** - Main chat interface (everything in one file!)
- **`api/simple-agent.ts`** - Gemini agent with function calling
- **`src/service.ts`** - Simple API calls to Gemini agent

## 💬 **Try These Queries**

**Text Responses:**
- "Hello"
- "What can you help me with?"

**Data Visualization:**  
- "sales per year"
- "taxes this year"
- "Analyze revenue trends"

## 📚 **Learn More**

- [ThoughtSpot Visual Embed SDK](https://developers.thoughtspot.com/docs/visual-embed-sdk)
- [Google Gemini Function Calling](https://ai.google.dev/docs/function_calling)
- [ProChat Documentation](https://pro-chat.antdigital.dev/)

---

### Technology labels

- React
- Typescript
- Web
