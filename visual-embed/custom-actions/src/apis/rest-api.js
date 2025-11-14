/**
 * This file contains Javascript wrappers for common API calls that are used with embedding scenarios.
 */

/*---------------------------------------------- Helper functions ----------------------------------------------------*/

/**
 * If the value isn't an array, convert it to an array.
 * @param valueOrArray a value or an array.
 */
const arrayify = (valueOrArray) => {
  if (!Array.isArray(valueOrArray)) {
    return [valueOrArray];
  }
  return valueOrArray.slice();
}

/**
 * Cleans up the URL for the API.
 * @param url The url to clean.
 * @returns {string|*}  The cleaned URL.
 */
const cleanURL = (url) => {
  return (url.endsWith("/")) ? url.substr(0, url.length - 1) : url
}

/*-------------------------------------------------- API wrappers ----------------------------------------------------*/

/**
 * Performs basic login.  If using the the SDK, use the init() function instead.  This is mostly used for testing.
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param username The username to log into the system.
 * @param password The password for the user.
 * @param rememberme Causes the login to be remembered if true. Defaults to false.
 * @returns {Promise<void>} A promise for the login.  Await to make sure the user is logged in.
 */
export const tsLogin = async (tsurl, username, password, rememberme=false) => {
  console.log(`Logging into ThoughtSpot as ${username}`);
  const loginURL = cleanURL(tsurl) + "/callosum/v1/tspublic/v1/session/login";

  // TODO this is common.  Extract as a helper function.
  const apiData = {
    "username": username,
    "password": password
  };

  let formBody = [];
  for (const k of Object.keys(apiData)) {
    const key = encodeURIComponent(k);
    const value = encodeURIComponent(apiData[k]);
    formBody.push(`${k}=${value}`);
  }
  formBody = formBody.join("&");

  await fetch(loginURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'X-Requested-By': 'ThoughtSpot'
    },
    credentials: 'include',
    body: formBody
  })
    .then(response => console.log("Logged into ThoughtSpot"))
    .catch(error => console.error(error));
}

/**
 * Returns the session info, which includes information about the user and the cluster.
 * @param tsurl The URL for the TS cluster.
 * @param username The username to authenticate for.
 * @param auth_token The token generated for the username.
 * @param redirect_url The URL to redirect to.  If left empty, will redirect to home.
 * @returns {Promise<any>}  A promise with JSON that has the info.
 * loginWithToken.then(info => {
 *   doWhatever
 * }
 */
export const loginWithToken = async (tsurl, username, auth_token, redirect_url = null) => {
  console.log(`Logging ${username} into ${tsurl} with token.`);
  const loginURL = cleanURL(tsurl) + '/callosum/v1/tspublic/v1/session/login/token';

  if (! redirect_url) {
    redirect_url = tsurl;
  }

  const apiData = {
    "username": username,
    "auth_token": auth_token,
    "redirect_url": redirect_url
  };

  let formBody = [];
  for (const k of Object.keys(apiData)) {
    const key = encodeURIComponent(k);
    const value = encodeURIComponent(apiData[k]);
    formBody.push(`${k}=${value}`);
  }
  formBody = formBody.join("&");

  await fetch(loginURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/plain',
      'X-Requested-By': 'ThoughtSpot'
    },
    credentials: 'include',
    body: formBody
  })
  .then(response => {
    console.log("Logged into ThoughtSpot using token");
    return response;
  })
  .catch(error => {
    console.error('got an error logging in with token');
    throw(error);
  });
}


/**
 * Calls the ThoughtSpot logout service.
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @returns {Promise<void>} The call to complete the logout.  Can usually be ignored.
 */
export const tsLogout = async (tsurl) => {
  console.log("Logging out from ThoughtSpot");
  const logoutURL = cleanURL(tsurl) + "/callosum/v1/tspublic/v1/session/logout";

  await fetch(logoutURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-By': 'ThoughtSpot'
    },
    credentials: 'include'
  })
    .then(response => console.log("Logged out from ThoughtSpot"))
    .catch(error => console.error(error));
}

/**
 * Returns the session info, which includes information about the user and the cluster.
 * @param tsurl The URL for the TS cluster.
 * @returns {Promise<any>}  A promise with JSON that has the info.
 * getSessionInfo.then(info => {
 *   const releaseVersion = info.releaseVersion;
 * }
 */
export const getSessionInfo = async (tsurl) => {
  const sessionInfoURL = cleanURL(tsurl) + "/callosum/v1/tspublic/v1/session/info";  // oct.cl 2021 and later

  return await fetch(
    sessionInfoURL, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include"
    })
    .then(response =>  response.json())
    .catch(error => {
      console.error("Unable to get the session info: " + error)
    });
}

/**
 * Returns a list of liveboards that the user has access to.
 * Example:
   getLiveboardList(tsurl).then(json, {
     // do something with the list.
   });
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @returns {Promise<any>}  A promise with the list.
 */
export const getLiveboardList = async (tsurl) => {
  // Returns the list of liveboards so the user can display them.
  const liveboardMetadataListURL = cleanURL(tsurl) + "/callosum/v1/tspublic/v1/metadata/listobjectheaders?" +
    "type=PINBOARD_ANSWER_BOOK" +
    "&batchsize=-1";

  return await fetch(
    liveboardMetadataListURL, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include"
    })
    .then(response =>  response.json())
    .then(data => data)
    .catch(error => {
      console.error("Unable to get the liveboard list: " + error)
    });
}

/**
 * Returns a list of GUIDs for a liveboard with a given name or an empty list if not found.
 * Example:
 * getLiveboardGUIDs('<tsurl>', '<liveboard-name>').then (liveboardGUIDs => {
 *     // use the list.
 * });
 * @param tsurl URL for the ThoughtSpot cluster.
 * @param liveboardName Name of the liveboard to match.
 * @returns str[] A list of GUIDs (or empty list).
 */
export const getLiveboardGUIDs = async (tsurl, liveboardName) => {

    console.log(`Getting liveboard GUIDs from ${tsurl}`)
    const liveboardGUIDs = [];
    await getLiveboardList(tsurl).then(liveboards => {
        for (let idx = 0; idx < liveboards.length; idx++) {
          if (liveboards[idx].name === liveboardName) {
            liveboardGUIDs.push(liveboards[idx].id);
          }
        }
    });
    console.log(`got liveboard IDs [${liveboardGUIDs}]`)
    return liveboardGUIDs;
}

/**
 * Returns a promise with the list of visualizations for the given liveboard.
 * Example:
    getVisualizationList(tsurl, liveboardId).then(vizzes => {
      // do something with the list of visualizations.
    });
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param liveboardId The GUID for the liveboard to get visualizations for.
 * @returns {Promise<any>}
 */
export const getVisualizationList = async (tsurl, liveboardId) => {
  const vizMetadataListURL = cleanURL(tsurl) + "/callosum/v1/tspublic/v1/metadata/listvizheaders?id=" + liveboardId;

  return await fetch(
    vizMetadataListURL, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include"
    })
    .then(response =>  response.json())
    .then(data => data)
    .catch(error => {
      console.error("Unable to get the visualization list for liveboard " + liveboardId + ": " + error)
    });
}

/**
 * Returns a list of GUIDs for a liveboard visualization with a given name or an empty list if not found.
 * Example:
 * getLiveboardVizGUIDs('<tsurl>', '<liveboardGUID>', '<vizName>').then (vizGUIDs => {
 *     // use the list.
 * });
 * @param tsurl URL for the ThoughtSpot cluster.
 * @param liveboardGUID The GUID for the liveboard.
 * @param vizName Name of the visualization to match.
 * @returns str[] A list of GUIDs (or empty list).
 */
export const getLiveboardVizGUIDs = async (tsurl, liveboardGUID, vizName) => {

  console.log(`Getting viz GUIDs from ${tsurl} for viz ${liveboardGUID}::${vizName}`);
  const vizGUIDs = [];
  await getVisualizationList(tsurl, liveboardGUID).then(vizList => {
    for (let idx = 0; idx < vizList.length; idx++) {
      if (vizList[idx].name === vizName) {
        vizGUIDs.push(vizList[idx].id);
      }
    }
  });
  console.log(`got viz IDs [${vizGUIDs}]`)
  return vizGUIDs;
}

/**
 * Returns an array of worksheet metadata objects.
 * Example:
 * getLiveboardVizGUIDs('<tsurl>').then (worksheets => {
 *     // use the list.
 * });
 * @param tsurl URL to ThoughtSpot.
 * @returns {Promise<any>}
 */
export const getWorksheetList = async (tsurl) => {
  const worksheetMetadataListURL = encodeURI(cleanURL(tsurl) + "/callosum/v1/tspublic/v1/metadata/listobjectheaders?" +
    "type=LOGICAL_TABLE&" +
    "subtypes=[WORKSHEET]" +
    "&batchsize=-1"
  );

  return await fetch(
    worksheetMetadataListURL, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include"
    })
    .then(response =>  response.json())
    .then(data => data)
    .catch(error => {
      console.error("Unable to get the list of worksheets: " + error);
    });
}

/**
 * Returns a list of GUIDs for a liveboard visualization with a given name or an empty list if not found.
 * Example:
 * getLiveboardVizGUIDs('<tsurl>', '<liveboardGUID>', '<vizName>').then (vizGUIDs => {
 *     // use the list.
 * });
 * @param tsurl URL for the ThoughtSpot cluster.
 * @param worksheetName Name of the worksheet to match.
 * @returns str[] A list of GUIDs (or empty list).
 */
export const getWorksheetGUIDs = async (tsurl, worksheetName) => {

  console.log(`Getting viz GUIDs from ${tsurl} for worksheet ${worksheetName}`);
  const worksheetGUIDs = [];
  await getWorksheetList(tsurl).then(worksheetList => {
    for (let idx = 0; idx < worksheetList.length; idx++) {
      if (worksheetList[idx].name === worksheetName) {
        worksheetGUIDs.push(worksheetList[idx].id);
      }
    }
  });
  console.log(`got worksheet IDs [${worksheetGUIDs}]`)
  return worksheetGUIDs;
}

/**
 * Returns the data object for the liveboard and all of the vizualizations specified, or all if not specified.
 * Currently returns a JSON object as defined in
 * https://docs.thoughtspot.com/latest/app-integrate/reference/pinboarddata.html
 * Example:
     getLiveboardData(tsurl, liveboardId, vizId).then((response) => {
       const liveboardData = LiveboardData.createFromJSON(response);
       const firstVizId = Object.keys(liveboardData.vizData)[0];
       const html = tabularDataToHTML(liveboardData.vizData[firstVizId]);
       // display the table in the application.
     });
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param liveboardId The GUID for the liveboard to get data for.
 * @param vizIds Optional GUIDs to only get certain visualizations.  String or array.
 * @param filters Optional runtime filters.  This is an array of objects like
 * [ { columnName: "colname", operator: "eq", values: "values" }, ...] the values can be a string or array.
 * @returns {Promise<any|void>} A promise that will return the data in JSON form.
 */
export const getLiveboardData = async (tsurl, liveboardId, vizIds, filters) => {
  console.log(`Getting data from liveboard ${liveboardId} and visualization(s) ${vizIds}`)
  let getLiveboardDataURL = `${cleanURL(tsurl)}/callosum/v1/tspublic/v1/pinboarddata?batchSize=-1&id=${liveboardId}`;

  if (vizIds) { // if vizIds were specified, they are optional
    if (! (Array.isArray(vizIds))) { // assume is a string and convert to an array.
      vizIds = [vizIds];
    }

    // TODO add handling for invalid types.  Currently only support string and array.
    const formattedVizIds = `["${vizIds.join('","')}"]`;
    getLiveboardDataURL += '&vizid=' + formattedVizIds;
  }

  if (filters) {
    let count = 1;
    for (const f of filters) { // { columnName, operator, values }
      getLiveboardDataURL += `&col${count}=${f.columnName}&op${count}=${f.operator}`;
      if (Array.isArray(f.values)) {
        for (const v of f.values) {
          getLiveboardDataURL += `&val${count}=${v}`;
        }
      }
      else {
        getLiveboardDataURL += `&val${count}=${f.values}`;
      }
      count++;
    }
  }

  return await fetch(
    encodeURI(getLiveboardDataURL), {
      method: 'POST',
      headers: {
        "Accept": "application/json",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include"
    })
    .then(response =>  response.json())
    .then(data => data)
    .catch(error => {
      console.error(`Unable to get the visualization list for liveboard ${liveboardId}: ${error}`);
    });
}

/**
 * Calls the search data API and returns a promise that can be used to get the search data JSON object.
 * Example:
      getSearchData(tsurl, worksheetId, search).then((response) => {
          const searchData = SearchData.createFromJSON(response);
          const html = tabularDataToHTML(searchData);
          // display the table in the application.
      });
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param worksheetId The GUID for the worksheet to search against.
 * @param search The search using the proper format (see TS documentation).
 * @returns {Promise<any|void>} A promise that will return the data in JSON form.
 */
export const getSearchData = async (tsurl, worksheetId, search) => {
  console.log(`Getting data from the SearchAPI from worksheet ${worksheetId} with search ${search}`);
  let getSearchDataURL = `${cleanURL(tsurl)}/callosum/v1/tspublic/v1/searchdata?`;
  getSearchDataURL += `batchSize=-1&data_source_guid=${worksheetId}&query_string=${search}`;
  //  + `&pagenumber=-1&offset=-1&formattype=FULL`;

  console.log(getSearchDataURL);

  return await fetch(
    encodeURI(getSearchDataURL), {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "en-US",
        "X-Requested-By": "ThoughtSpot"
      },
      credentials: "include",
    })
    .then(response => response.json())
    .then(data => data)
    .catch(error => {
      console.error(`Error getting search data: ${error}`);
      console.error(error);
    });
}

/**
 * Downloads a list of liveboard visualizations as PDF.  If the vizIDs aren't provided, then downloads the
 * liveboard.
 * Example:
 * TODO - add an example of the call.
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param liveboard The GUID for the liveboard to download or the transient content.
 * @param options Object with additional properties:
 *   - visualization_ids: if provided will only download specific visualizations.
 *   - layout_type: PINBOARD (default) or VISUALISATION.  If visualization IDs are provided, will only do VISUALISATION.
 *   - orientation: LANDSCAPE (default) or PORTRAIT
 *   - truncate_tables: true or false (default).  If true only what will fit on a page is shown.
 *   - include_logo: true (default) or false.  If true, the logo will be included on the first page.
 *   - footer_text: additional text that can be displayed on the page.
 *   - include_page_number: true (default) or false.  If true, includes page numbers.
 *   - include_cover_page: true (default) or false.  If true, the cover page is shown.
 *   - include_filter_page true (default) or false.  If true, a page of current filters is shown.
 * @returns {Promise<any|void>} A promise that will return the data in JSON form.
 */
 export const downloadLiveboardPDF = async (tsurl, liveboard, options ) => {
  let downloadURL = `${cleanURL(tsurl)}/callosum/v1/tspublic/v1/export/pinboard/pdf`;

  // Create a new FormData object with the passed in options.
  const apiData = new FormData();
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      apiData.set(k, v);
    }
  }

  // TODO - figure out how to distinguish between transient data and a GUID.  Length?
  console.log(liveboard);
  if (liveboard.length < 40) {
    apiData.set("id", liveboard);
  }
  else {
    apiData.set("transient_data", liveboard);  // TODO test with transient data and see if there is a better option.
  }

  let layout_type = options.layout_type;
  const vizIDs = options.visualization_ids;
  if (layout_type) {
    if (vizIDs) { // must be visualization for vizzes.
      apiData.set("layout_type", "VISUALIZATION"); // must be viz mode for specific visualizations.
      if (Array.isArray(vizIDs)) {
        apiData.set("visualization_ids", JSON.stringify(vizIDs));  // make sure this is stringified.
      }
    }
    if (! ['PINBOARD', 'VISUALIZATION'].includes(layout_type)) {
      throw (`Invalid layout type of ${layout_type}`);
    }
  }

  return await fetch(
    downloadURL, {
      method: 'POST',
      headers: {
        "Accept": "application/octet-stream",
        "Accept-Encoding": "gzip, deflate",
        "X-Requested-By": "ThoughtSpot",
        // don't set: https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
        //"Content-Type": "multipart/form-data",
      },
      credentials: "include",
      body: apiData,
    })
    .then(response => {
      response.blob().then(blob => {
        downloadBlobToFile(blob, liveboard + ".pdf");
      })
    })
    .catch(error => console.error(error));
}

/**
 * Downloads the TML for the given object(s) to a file.  The filename is provided by the API.
 * @param tsurl The URL for the ThoughtSpot cluster.
 * @param objectIDs The GUIDs for the objects to download.
 * @param formattype Either YAML (default) or JSON.
 * @param export_associated If true, gets associated content.
 * @returns {Promise<void>}
 */
export const downloadTML = async (tsurl, objectIDs,
                                          formattype = 'YAML',
                                          export_associated=false) => {

  console.log(`Downloading TML for ${objectIDs}`);
  let downloadURL = `${cleanURL(tsurl)}/callosum/v1/tspublic/v1/metadata/tml/export`;

  const getObjectIDs = arrayify(objectIDs);
  const apiData = {
    "export_ids": JSON.stringify(getObjectIDs),
    "formattype": formattype,
    "export_associated": export_associated,
  };

  let formBody = [];
  for (const k of Object.keys(apiData)) {
    const key = encodeURIComponent(k);
    const value = encodeURIComponent(apiData[k]);
    formBody.push(`${k}=${value}`);
  }
  formBody = formBody.join("&");

  console.log(`calling ${encodeURI(downloadURL)}`);

  return await fetch(
    downloadURL, {
      method: 'POST',
      headers: {
        "Accept": "text/plain",
        "X-Requested-By": "ThoughtSpot",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      credentials: "include",
      body: formBody,
    })
    .then (response => response.json().then(tmlResponse => {
        for (const tml of tmlResponse.object) {  // if you get related, then there are a bunch of files downloaded.
          const edoc = tml.edoc;
          const filename = tml.info.filename;
          console.log(`${filename}: ${edoc}`);

          downloadTextToFile(edoc, filename);
        }
      })
    )
    .catch(error => console.error(`Error getting object TML ${error}`));
}

/**
 * Downloads text to a file.
 * @param text  text/plain content to be downloaded.
 * @param filename Filename to download to.
 */
export const downloadTextToFile = (text, filename) => {
  const blob = new Blob([text], {type: "text/plain"});
  downloadBlobToFile(blob, filename);
}

/**
 * Downloads the blob to a file.  This is assumed to be called from a web document since it modifies the DOM document.
 * @param blob A blob to write.
 * @param filename The name of the file to write to.
 */
export const downloadBlobToFile = (blob, filename) => {

  const link = document.createElement("a");
  link.setAttribute("href", window.URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for Firefox
  link.click(); // This will download the PDF with the given name.

  window.URL.revokeObjectURL(link);  // cleanup.
}
