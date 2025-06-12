# Pendo Integration with ThoughtSpot Embed

## 🧩 Overview

This project contains the code example for Embedded ThoughtSpot developers who are trying to integrating Pendo with Thoughtspot embed's instance through the feature Third-Party-Tools-For-Embed.


## 📦 Prerequisites

This project uses the feature Third-Party-Tools-For-Embed and it is not enabled by default.
To enable this feature, please contact ThoughtSpot Support and provide them with the necessary details.

Enablement Steps:
- Host your integration script (e.g., the one for Pendo) on a publicly accessible URL.
- Share the hosted script URL with ThoughtSpot Support so they can configure it for your cluster.
- Once the script is set by Support, enable the feature from the Frontend for your cluster.

📘 Refer to the documentation for step-by-step instructions on enablement: https://developers.thoughtspot.com/docs/external-tool-script-integration

Once the feature is enabled and your script is configured, you can embed your ThoughtSpot instance as usual. The hosted script will automatically execute inside the ThoughtSpot ecosystem after the authentication flow.

You can then configure your Pendo guides via the Pendo dashboard, and they will appear in the embedded ThoughtSpot instance.

## 🚀 Getting Started


Make sure you have a Third-Party-Tools-For-Embed enabled cluster.
Once done follow the Step-by-step guide to run locally:

```bash
# 1. Clone the repo
git clone https://github.com/your-org/your-repo.git

# 2. Navigate to the example
cd your-repo/examples/my-example

# 3. Install dependencies
npm install

# 4. update init
Make sure to update the init block in the App.tsx with the Pendo secret key and the ThoughtSpotHost for your script along with your other cluster details.

# 4. Start the project
npm run dev

You should have a fullAppEmbed with your cluster and would be able to see the guides you set.
Preview :-

![Pendo Integration Preview](https://i.postimg.cc/J0HcZz0q/preview-App-Embed-With-Pendo.png)

```


## 📚 Documentation 

Developer Docs: https://developers.thoughtspot.com/docs/introduction
Third-Party-Tools-For-Embed: https://developers.thoughtspot.com/docs/external-tool-script-integration
Quick start Guide for Embed: https://developers.thoughtspot.com/docs/getting-started