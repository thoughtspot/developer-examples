# Pendo Integration with ThoughtSpot Embed

## 🧩 Overview

This project contains the code example for Embedded ThoughtSpot developers who are trying to integrating Pendo with Thoughtspot embed's instance through the feature Third-Party-Tools-For-Embed.


## 📦 Prerequisites

This project uses the feature Third-Party-Tools-For-Embed and it is not enabled by default for your ThoughtSpot cluster.
To enable this feature, please contact ThoughtSpot Support and provide them with the necessary details.

Enablement Steps :
- Host your integration script (For Pendo - pendoIntegrationScript.js) on a publicly accessible URL which serves the javaScript.
- Share the hosted script URL with ThoughtSpot Support so they can configure it for your cluster.
- Next a user with AdminPrivileges need to go to "developTab/Security-Settings.
  Toggle the feature by editing the CSPScriptSrc field. Also make sure to white the domain where your script is hosted.

📘 Refer to the documentation for step-by-step instructions on enablement: https://developers.thoughtspot.com/docs/external-tool-script-integration

Once the feature is enabled and your script is configured, you can embed your ThoughtSpot instance as usual. The hosted script will automatically execute inside the ThoughtSpot ecosystem after the authentication flow. Make sure to pass the correct variables in the init config for the script to execute.

You can then configure your Pendo guides via the Pendo dashboard, and they will appear in the embedded ThoughtSpot instance.

## 🚀 Getting Started


```bash
# 1. Clone the repo
git clone https://github.com/your-org/your-repo.git

# 2. Navigate to the example
cd your-repo/examples/my-example

# 3. Install dependencies
npm install

# 4. update init
If you are using your own cluster. Make sure to update the init block in the App.tsx according to your cluster details along with the pendoKey.

# 4. Start the project
npm run dev

Preview :-

<img src="https://i.postimg.cc/J0HcZz0q/preview-App-Embed-With-Pendo.png" alt="Preview App Embed With Pendo">

```


## 📚 Documentation 

Developer Docs: https://developers.thoughtspot.com/docs/introduction
Third-Party-Tools-For-Embed: https://developers.thoughtspot.com/docs/external-tool-script-integration
Quick start Guide for Embed: https://developers.thoughtspot.com/docs/getting-started