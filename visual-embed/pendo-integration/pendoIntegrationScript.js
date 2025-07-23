/**
 * Copyright: ThoughtSpot Inc. 2025
 * Author: Priyanshu Kumar(priyanshu.kumar@thoughtspot.com)
 * Description: This is the script that is used to initialize pendo in the embed instance.
 * You need to host this script on the internet and the URL must be shared with the ThoughtSpot support team for us to enable for your embed instance.
 * Refer to the documentation for more details: 
 *  External Tool Script Integration - https://developers.thoughtspot.com/docs/external-tool-script-integration
 *  CustomVariablesForThirdPartyTools - https://developers.thoughtspot.com/docs/Interface_EmbedConfig#_customvariablesforthirdpartytools
 *  Developer's guide to implementing Pendo using the install script - https://support.pendo.io/hc/en-us/articles/360046272771-Developer-s-guide-to-implementing-Pendo-using-the-install-script
 *  Choose IDs and metadata - https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
 */

/*
    Inside window.tsEmbed object, we can access all the variables that 
    were passed	 in the customVariablesForThirdPartyTools in ThoughtSpot Embed init call.
*/
const pendoKey = window.tsEmbed?.pendoKey;
const pendoVisitorConfig = window.tsEmbed?.pendoVisitorConfig; // Make sure to pass atleast id and name in the customVariablesForThirdPartyTools
const pendoAccountConfig = window?.tsEmbed?.pendoAccountConfig; // Make sure to pass atleast id and name in the customVariablesForThirdPartyTools

/*
    Step 1. Define the Visitor and Account IDs
    Visitor and Account IDs are how you describe and label your users and are case-sensitive.
    Choose IDs and metadata: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata (see step 1)
*/

/*
    Visitors represent individual end users of your application that you can identify based on how they signed up or signed in to your product.
    A Visitor ID is typically an email or a unique number.
    Pendo Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
*/

function getPendoVisitorConfig() {
    if (pendoVisitorConfig && pendoVisitorConfig.id) { // check if the visitor ID is present
        return pendoVisitorConfig;
    }
    return {
        id: 'guest-visitor',
        name: 'Guest Visitor',
    };
}

/*
    Accounts represent groups of visitors, typically the company they belong to. An Account ID is typically a business name or a unique number.
    Account IDs are required if you use classic Feedback.
    Pendo Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
*/
function getPendoAccountConfig() {
    if (pendoAccountConfig && pendoAccountConfig.id) { // check if the account ID is present
        return pendoAccountConfig;
    }
    return {
        id: 'guest-account',
        name: 'Guest Account',
    };
}

/*
    The install script is a short JavaScript function that retrieves and loads the Pendo agent code (pendo.js), allowing you to track usage, collect feedback, and deliver messages and guides. To do this, the install script includes:

    - The request for the Pendo agent.
    - A customer-specific app key that maps the data that the agent collects to the product in your Pendo subscription.
    - The initialize method needed to activate the Pendo agent.

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
    // checking if pendo is already initialized
    if (window.pendo && typeof window.pendo.initialize === 'function') {
        console.log("Pendo is already initialized, skipping initialization");
        return;
    }

    // checking if the pendo key is present
    if (!pendoKey) {
        console.warn('pendoClientKey not found!');
        return;
    }


    /*
        Step 2. Install and initialize Pendo on your application
        Pendo recommends that you place the code in a common area of your HTML so that it's automatically included on all pages of your app.
        Typically, this is the Head tag of your HTML template, which is present on all pages of your application.
        You must also ensure that the code is included in any iframes you might have so that Pendo can properly collect feedback, track analytics, and serve guides. 
        Pendo Reference: https://support.pendo.io/hc/en-us/articles/360046272771-Developer-s-guide-to-implementing-Pendo-using-the-install-script (see step 2)
    */
    pendoInitScript(pendoKey);


    const pendoElement = document.getElementsByTagName('script')[0];
    console.log("pendoElement", pendoElement)

    // Pendo agent code is loaded, now we can initialize Pendo
    pendoElement.onload = async () => {
        await window.pendo.initialize({
            apiKey: pendoKey,
            visitor: getPendoVisitorConfig(),
            account: getPendoAccountConfig(),
        });

        /*
            Step 3. Verify the installation (Optional unless you want to verify it)
            Verification is carried out where the code was installed and where the end-user is authenticated (unless anonymous visitors are used).
            Pendo Reference: https://support.pendo.io/hc/en-us/articles/360046272771-Developer-s-guide-to-implementing-Pendo-using-the-install-script (see step 3)
        */
        await window.pendo.validateEnvironment();
    };

    // If Pendo agent code is not loaded, log the error	
    pendoElement.onerror = err => {
        console.warn('Unable to load Pendo', err);
    };
}

insertPendoScript();