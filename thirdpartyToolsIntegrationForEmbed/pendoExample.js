/**
 * Copyright: ThoughtSpot Inc. 2025
 * Author: Priyanshu Kumar (priyanshu.kumar@thoughtspot.com)
 */

/**
 * Make sure you pass your pendoKey and TsHost in the init block :-
 *   init({ 
 *        ... ,
 *        customVariablesForThirdPartyTools: {
 *            pendoKey: <PENDO_KEY>,
 *            hostName: <THOUGHTSPOT_HOST>,
 *        }
 *    })
 */

let windowObj = window;

console.log("CustomVariablesFor3rdPartyTools", window.tsEmbed);
let infoResponse = {
    userGUID: '',
    clusterId: '',
    clusterName:''
};
let pendoKey = windowObj.tsEmbed.pendoKey;
let thoughtspotHost = windowObj.tsEmbed.TsHost;
let LOADED_SCRIPTS_NUMBER = 0;

function getPendoVisitorConfig() {
    const config = {
        id: `${infoResponse?.userGUID}|${infoResponse?.clusterId}`,
    };
    console.log("visitor config", config);
    return config;
}

function getPendoAccountConfig() {
    const config = {
        id: infoResponse?.clusterId,
        name: infoResponse?.clusterName,
    };
    console.log("account config", config);
    return config;
}

async function initializePendo() {
    await windowObj.pendo.initialize({
        apiKey: pendoKey,
        visitor: getPendoVisitorConfig(),
        account: getPendoAccountConfig(),
    });
    console.log("Pendo is initialized !!");
}

/**
 * The function is triggered whenever a script onLoad is complete
 */
function shouldTriggerInitializePendo() {
    LOADED_SCRIPTS_NUMBER += 1;

    if (LOADED_SCRIPTS_NUMBER === 4) {
        initializePendo();
    }
}

function onPendoLoadError(err) {
    console.warn('Unable to load Pendo', err);
}

/*
 * Inserts some <script> elements onto the page to load Pendo.
 */
async function insertPendoScript() {
    // defer pendo script addition by 1 second
    return setTimeout(() => {
        let w;
        let x;
        let y;
        let z;
        let didReportPendoError = false;

        const o = (windowObj.pendo = windowObj.pendo || {});
        o.q = [];
        const v = ['initialize', 'identify', 'updateOptions', 'pageLoad'];

        for (w = 0, x = v.length; w < x; ++w) {
            const m = v[w];
            const func = function () {
                o.q[m === v[0] ? 'unshift' : 'push'](
                    [m].concat([].slice.call(arguments, 0))
                );
            };
            o[m] = o[m] || func();

            y = document.createElement('script');
            y.defer = true;
            y.src = `https://cdn.pendo.io/agent/static/${pendoKey}/pendo.js`;
            y.onload = () => {
                shouldTriggerInitializePendo();
            };
            y.onerror = err => {
                if (!didReportPendoError) {
                    didReportPendoError = true;
                    onPendoLoadError(err);
                }
            };
            z = document.getElementsByTagName('script')[0];
            z.parentNode.insertBefore(y, z);
        }
    }, 1000);
}

async function fetchUserAndClusterInfo() {
    const commonOptions = {
        headers: {
            'Accept': 'application/json',
        },
        credentials: 'include',
    };

    try {
        const [userRes, systemRes] = await Promise.all([
            fetch(`${thoughtspotHost}/api/rest/2.0/auth/session/user`, commonOptions),
            fetch(`${thoughtspotHost}/api/rest/2.0/system`, commonOptions),
        ]);



        const userData = await userRes.json();
        const systemData = await systemRes.json();

        infoResponse.userGUID = userData?.id || '';
        infoResponse.clusterId = systemData?.id || '';
        infoResponse.clusterName = systemData?.id || '';

        console.log('Fetched infoResponse:', infoResponse);
    } catch (err) {
        console.error('Error fetching user or cluster info:', err);
    }
}

// Bootstrapping
fetchUserAndClusterInfo().then(() => {
    insertPendoScript();
});
