/**
 * Copyright: ThoughtSpot Inc. 2025
 * Author: Priyanshu Kumar(priyanshu.kumar@thoughtspot.com)
 * Description: This is the script that is used to initialise pendo in the embed instance.
 * You need to host this script on the internet and the url to be shared with the ThoughtSpot support team for us to enable for your embed instance.
 * Refer the documentation for more details: 
 *  https://developers.thoughtspot.com/docs/external-tool-script-integration
 *  https://developers.thoughtspot.com/docs/Interface_EmbedConfig#_customvariablesforthirdpartytools
 */

/*
Inside window.tsEmbed object, we can access all the variables that 
had passed in the customVariablesForThirdPartyTools in ThoughtSpot Embed init call.
*/
const pendoKey = window.tsEmbed.pendoKey; 
const thoughtspotHost = window.tsEmbed.hostName;

/*
This is the response from the /callosum/v1/tspublic/v1/session/info call.
*/
let infoResponse;

/*
This returns the config for the Pendo visitor.
*/
function getPendoVisitorConfig() {
    const visitorConfig = {
        id: `${infoResponse?.userGUID}|${infoResponse?.configInfo?.selfClusterId}`,
    };
    return visitorConfig; 
}

/*
This returns the config for the Pendo account.
*/
function getPendoAccountConfig() {
    const accountConfig = {
        id: infoResponse?.configInfo?.selfClusterId,
        name: infoResponse?.configInfo?.selfClusterName,
    };
    return accountConfig;
}

/*
The install script is a short JavaScript function that retrieves and loads the Pendo agent code (pendo.js), allowing you to track usage, collect feedback, and deliver messages and guides. To do this, the install script includes:

The request for the Pendo agent.
A customer-specific app key that maps the data that the agent collects to the product in your Pendo subscription.
The initialize method needed to activate the Pendo agent.
The install script and the initialize method must be present on all pages of your website for the Pendo agent to work, unless your application has child frames that come from the same domain as the top frame. In this case, you can configure the install script to automatically install Pendo on child frames by adding the install script to the top frame of your application. Changes to visitor identity or metadata in any of these frames are then applied to all frames.

Pendo Reference: https://support.pendo.io/hc/en-us/articles/21362607464987-Components-of-the-install-script#01H6S2EXET8C9FGSHP08XZAE4F
*/
pendoInitScript = (apiKey) => {
    (function(apiKey){
        (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=[];
        v=['initialize','identify','updateOptions','pageLoad','track'];
        for(w=0,x=v.length;w<x;++w)(function(m){
            o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};
        })(v[w]);
        y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
        z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);
    })(window,document,'script','pendo');
    })(apiKey);
}


async function insertPendoScript() {

    pendoInitScript(pendoKey);

    // Pendo script is loaded, and initialized at the top of the document. We will use the same script tag's onLoad event to initialize Pendo.
    const pendoElement = document.getElementsByTagName('script')[0];
    console.log("pendoElement", pendoElement)

    // Pendo agent code is loaded, now we can initialize Pendo
    pendoElement.onload = async () => {
        await window.pendo.initialize({
            apiKey: pendoKey,
            visitor: getPendoVisitorConfig(),
            account: getPendoAccountConfig(),
        });
        // Validate the environment to ensure Pendo is properly initialized
        await window.pendo.validateEnvironment();
    };

    // If Pendo agent code is not loaded, we can log the error
    pendoElement.onerror = err => {
        console.warn('Unable to load Pendo', err);
    };

    
}

/*
This is the function that fetches the infoResponse from the v1 public api /callosum/v1/tspublic/v1/session/info call.
*/
fetch(`${thoughtspotHost}/callosum/v1/tspublic/v1/session/info`, {
    headers: {
        Accept: 'application/json',
    },
    credentials: 'include',
    method: 'GET',
}).then(async response => {
    infoResponse = await response.json();
    console.log("infoResponse", infoResponse);
    await insertPendoScript();
});