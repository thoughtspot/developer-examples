/*
 * Contains classes for handing API data.
 * This file supports and is tested against v2 (new experience) objects.  Last version tested was 9.3.0.cl.
 * Other version may work, but have not been tested.
 */

/**
 * combines and inverts arrays, so a = [1, 2, 3], b = [4, 5, 6] becomes [[1,4], [2,5], [3,6]]
 * this function is used to convert column-based representations of the data to a table for display
 * @param arrays the arrays to combined and invert.
 */
const zip = (arrays) => {
  if (!arrays.length) return [];

  return arrays[0].map(function (_, i) {
    return arrays.map(function (array) {
      return array[i];
    });
  });
};

/**
 * Sorts an array of objects (changinge the array) based on some attribute in the array.
 * @param arrayOfObjs The array of objects to sort.
 * @param attr The attribute to use for sorting.  Always sorts ascending.
 */
export const sortObjects = (arrayOfObjs, attr) => {
  arrayOfObjs.sort((first, second) => {
    if (first[attr] < second[attr]) return -1;
    if (first[attr] > second[attr]) return 1;
    return 0;
  });
};

/**
 * Returns values from an object.  JS offers no direct method to do so.
 * @param obj The object to get the values from.
 * @returns {*[]} The values from the object.
 */
const getValues = (obj) => {
  return Object.keys(obj).map(function (key) {
    return obj[key];
  });
};

/**
 * Holds the data in a tabular format for easy use and retrieval.  Base class of all data classes.
 */
export class TabularData {
  /**
   * Creates a new TabularData object.
   * @param originalData The original data from the API.
   */
  constructor(originalData = null) {
    // Creates a tabular object from data.  The columns are the names of the columns.
    // The data can either be row oriented, i.e. one entry per row, or columns oriented.
    this.data = {}; // The data is narmalized to be stored by column with the key being the column name.  This
    // makes it easy to just get a subset of columns in any order.
    this.originalData = originalData; // The original data from the API.
    this._cns = []; // column names
    this._nbrRows = 0; // Number of rows of data.
  }

  /**
   * Sets the column names to use.  This also dictates the number of columns and should match the data.
   * @param cns The names of the columns in the same order as the data.
   */
  set columnNames(cns) {
    this._cns = Array.from(cns);
  }

  /**
   * Returns the column names.
   * @returns {[]} An array containing the column names.
   */
  get columnNames() {
    return Array.from(this._cns); // avoid manipulation.
  }

  /**
   * Returns the number of columns in the tabular data.
   * @returns {number} The number of columns.
   */
  get nbrColumns() {
    return this._cns.length;
  }

  /**
   * Returns the number of rows of data.
   * @returns {number} The number of rows of data.
   */
  get nbrRows() {
    return this._nbrRows;
  }

  /**
   * Populates the data by row.  This means the data is an array of arrays of the form:
   * [0]: [a|b|1]
   * [1]: [c|d|2]
   * etc
   * The order of the columns is assumed to be the same as the order of the column names and that there are the
   * same number of column headers and values.  In the example above, that would imply three columns/column names.
   * @param data The data to populate.
   */
  populateDataByRow(data) {
    try {
      // Create the columns to populate with data.
      for (const name of this._cns) {
        this.data[name] = [];
      }

      // Assumes the columns are all filled and the same size.
      this._nbrRows = data.length;
      for (let rowCnt = 0; rowCnt < this._nbrRows; rowCnt++) {
        for (let colCnt = 0; colCnt < this.columnNames.length; colCnt++) {
          this.data[this._cns[colCnt]].push(data[rowCnt][colCnt]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Populates the data by column.   In this case, the data is of the form:
   * {
   * col_name_1: [a|b|1]
   * col_name_2: [c|d|2]
   * etc
   * }
   * The order of the columns is assumed to be the same as the order of the column names and that there are the
   * same number of column headers and values.  In the example above, that would imply three columns/column names.
   * @param data The data to populate.
   */
  populateDataByColumn(data) {
    this._nbrRows = data.length ? data[0].length : 0; // doesn't matter which column.
    for (let colCnt = 0; colCnt < this.nbrColumns; colCnt++) {
      const colName = this._cns[colCnt];
      this.data[colName] = Array.from(data[colCnt]); // shallow copy the data
    }
  }

  /**
   * Returns the set of columns as an array of arrays of data.
   *  The columnNames are the sub-set of columns.  There are three options:
   *    null or undefined: return all columns
   *    string: return a single column with that name
   *    array of strings: return the columns with the given name
   * @param columnNames The names of the columns to return.
   * @returns {*}  An array of arrays with the data in rows, e.g.
   * [
   * [a|b|1]
   * [c|d|2]
   * etc.
   * ]
   */
  getDataAsTable(columnNames) {
    if (!columnNames) {
      columnNames = this.columnNames;
    } else if (!(columnNames instanceof Array)) {
      columnNames = [columnNames];
    }

    let arrays = [];
    for (let cname of columnNames) {
      arrays.push(this.data[cname]);
    }

    const results = zip(arrays);
    return results; // returns a two dimensional data array for the columns requested.
  }
}

/**
 * This class handles data from Search and Answers where the action was from the main menu or primary action.
 * This class also works for the EventType.Data events.
 * It does not work for liveboard visualizations or context menus.
 */
export class ActionData extends TabularData {
  /**
   * @param {JSON} jsonData The payload data from the actions.
   * @returns a new ActionData object populated from the jsonData
   */
  static createFromJSON(jsonData) {
    const actionData = new ActionData(jsonData);

    try {
      const dataRoot = jsonData.data.embedAnswerData; // 8.3+

      // Note that you can get more column names than data and that the data column are aligned by column ID.
      let originalColumnNames = [];
      let columnIds = [];
      // Get the column meta information.
      const nbrCols = dataRoot.columns.length;
      for (let colCnt = 0; colCnt < nbrCols; colCnt += 1) {
        originalColumnNames.push(dataRoot.columns[colCnt].column.name);
        columnIds.push(dataRoot.columns[colCnt].column.id);
      }

      // can come in two flavors, so need to get the right data
      const dataSet = Array.isArray(dataRoot.data)
        ? dataRoot.data[0].columnDataLite
        : dataRoot.data.columnDataLite;

      const data = [];
      let columnNames = [];
      for (let cnt = 0; cnt < dataSet.length; cnt++) {
        const columnIdx = columnIds.indexOf(dataSet[cnt].columnId); // find the right column.
        if (columnIdx < 0) {
          console.error(
            `Data error: ${dataSet[cnt].columnId} not found in the columns names.`
          );
        } else {
          columnNames.push(originalColumnNames[columnIdx]);
          data.push(dataSet[cnt].dataValue); // should be an array of columns values.
        }
      }

      actionData.columnNames = columnNames;
      actionData.populateDataByColumn(data);
    } catch (error) {
      console.error(`Error creating action data: ${error}`);
      console.error(jsonData);
    }

    return actionData;
  }
}

/*
 * This function will return the name of a column given the column ID.
 * The data looks like:
 * [column: {id: <value>, name: <value>}, column: {id: <value>, name: <value>}]
 */
const get_column_name_for_id = (columns, id) => {
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].column.id === id) {
      return columns[i].column.name;
    }
  }
  return null;
};

/*
 * This class handles data from Liveboard visualizations where the action was from the main menu or main action.
 * It does not work for Search/Answer visualizations or context menus.
 */
export class LiveboardActionData extends TabularData {
  /**
   * Creates a new LiveboardActionData object from JSON.  Liveboard actions pass the JSON as a string, so it has to be
   * converted first.
   * @param jsonData the JSON payload.
   * @returns {LiveboardActionData} A new instance of the LiveboardActionData
   */
  static createFromJSON(jsonData) {
    const liveboardActionData = new LiveboardActionData(jsonData);

    try {
      const embedAnswerData = jsonData.data.embedAnswerData;
      const columnNames = [];

      // Get the data and column names.
      const columns = embedAnswerData.columns;
      const data = [];

      const columnDataLite =
        // eslint-disable-next-line valid-typeof
        typeof embedAnswerData.data === "array" || Array.isArray(embedAnswerData.data)
          ? embedAnswerData.data[0].columnDataLite
          : embedAnswerData.data.columnDataLite;

      for (let cnt = 0; cnt < columnDataLite.length; cnt++) {
        data.push(columnDataLite[cnt].dataValue); // should be an array of columns values.
        const columnId = columnDataLite[cnt].columnId;
        const columnName = get_column_name_for_id(columns, columnId);
        columnNames.push(columnName ? columnName : columnId); // if the column name is null, use the column ID.
      }

      liveboardActionData.columnNames = columnNames;
      liveboardActionData.populateDataByColumn(data);
    } catch (error) {
      console.error(`Error creating liveboard action data: ${error}`);
      console.error(jsonData);
    }

    return liveboardActionData;
  }
}

/**
 * This class handles data from context actions as well as point clicks.
 * It doesn't work with Answer V1 (classic), but works for both Search and Liveboards.
 */
export class ContextActionData extends TabularData {
  /**
   * Creates a new context action class from teh payload.
   * @param {JSON} jsonData The payload data from the actions.
   * @returns a new ContextActionData object populated from the jsonData
   */
  static createFromJSON(jsonData) {
    const contextActionData = new ContextActionData(jsonData);

    try {
      const columnNames = [];
      const columnValues = [];

      // The actual data is stored in
      // jsonData.data.contextMenuPoints.clickedPoint.[deselectedAttributes|deselectedMeasures|selectedAttributes|selectedMeasures]
      // This approach means attributes will always come first and then measures.  This gets all values in the row.
      let contextMenuPoints = jsonData.data.contextMenuPoints
        ? jsonData.data.contextMenuPoints // custom actions
        : jsonData.data; // click points.

      for (let section of [
        "selectedAttributes",
        "deselectedAttributes",
        "selectedMeasures",
        "deselectedMeasures",
      ]) {
        for (let column of contextMenuPoints.clickedPoint[section]) {
          const columnName = column.column.name;
          columnNames.push(columnName);
          columnValues.push([column.value]);
        }
      }

      contextActionData.columnNames = columnNames;
      contextActionData.populateDataByColumn(columnValues);
    } catch (error) {
      console.error(`Error creating context action data: ${error}`);
      console.error(jsonData);
    }

    return contextActionData;
  }
}

/**
 * Represents the data from liveboard context actions.  Does not work with Search/Answer context actions.
 */
export class LiveboardContextActionData extends TabularData {
  /**
   * Creates a new LiveboardContextActionData from the payload.
   * @param jsonData  A string from payload.data
   * @returns {LiveboardContextActionData}
   */
  static createFromJSON(jsonData) {
    const contextActionData = new LiveboardContextActionData();

    try {
      const columnNames = [];
      const columnValues = [];

      let contextMenuPoints = jsonData.data.contextMenuPoints
        ? jsonData.data.contextMenuPoints // custom actions
        : jsonData.data; // click points.

      // The actual data is stored in
      // This approach means attributes will always come first and then measures.  This gets all values in the row.
      for (let section of [
        "selectedAttributes",
        "deselectedAttributes",
        "selectedMeasures",
        "deselectedMeasures",
      ]) {
        for (let column of contextMenuPoints.clickedPoint[section]) {
          const columnName = column.column.name;
          columnNames.push(columnName);
          columnValues.push([column.value]);
        }
      }

      contextActionData.columnNames = columnNames;
      contextActionData.populateDataByColumn(columnValues);
    } catch (error) {
      console.error(`Error creating liveboard context action data: ${error}`);
      console.error(jsonData);
    }

    return contextActionData;
  }
}

/**
 * Represents the individual visualizations in a liveboard.
 */
class VizData extends TabularData {
  constructor(ID, jsonData) {
    super(jsonData);
    this.ID = ID; // ID for the visualization.
  }
}

/**
 * Represents the liveboard data class.  This is returned when calling the liveboard data API.
 * This class only works with V2 liveboards.
 */
export class LiveboardData {
  /**
   * Creates a new liveboard data class, which is just a collection of VizData.
   */
  constructor() {
    this.vizData = {}; // Set of VizData objects keyed by the viz ID.
  }

  /**
   * Creates the liveboard data object from payload.
   * @param jsonData The data from the liveboard data API.
   * @returns {LiveboardData} The new LiveboardData object.
   */
  static createFromJSON(jsonData) {
    const liveboardData = new LiveboardData();
    try {
      for (const viz of jsonData.contents) {
        // results have an array of visualizations.
        const vizData = new VizData(viz);
        vizData.columnNames = viz.column_names;
        vizData.populateDataByRow(viz.data_rows);

        liveboardData.vizData[viz.visualization_id] = vizData;
      }
    } catch (error) {
      console.error(`Error creating liveboard data: ${error}`);
      console.error(jsonData);
    }

    return liveboardData;
  }
}

/**
 * Creates a new search data object with the results of the Search Data and Fetch Answer Data v2.0 API calls.
 */
export class SearchData extends TabularData {
  /**
   * Create a new search data object.
   * @param jsonData The data returned from the API call.
   * @returns {SearchData}
   */
  static createFromJSON(jsonData) {
    const searchData = new SearchData(jsonData);
    try {
      searchData.columnNames = jsonData.columnNames;
      searchData.populateDataByRow(jsonData.data);
    } catch (error) {
      console.error(`Error creating search data: ${error}`);
      console.error(jsonData);
      throw error;
    }

    return searchData;
  }
}

/**
 * Creates a new get answer data object.
 * This data format comes from the payload.answerService.fetchData(offset, batchSize) call from custom actions.
 */
export class GetAnswerData extends TabularData {
  /**
   * Creats a new get answer data object.
   * @param jsonData The response  from a payload.answerService.fetchData(offset, batchSize)
   */
  static createFromJSON(jsonData) {
    const getAnswerData = new GetAnswerData(jsonData);
    try {
      let viz;
      for (const v of jsonData.getAnswer.answer.visualizations) {
        // visualizations is an array
        console.log(v);
        // Assuming that the fist visualization with data is the one we want.
         // eslint-disable-next-line no-prototype-builtins
        if (v.hasOwnProperty("data")) {
          // get the column name.s
          const colNames = [];
          for (const c of v.columns) {
            colNames.push(c.column.name);
          }
          getAnswerData.columnNames = colNames;

          // get the data values.
          const columnValues = [];
          for (const d of v.data[0].columnDataLite) {
            const columnData = JSON.parse(d.dataValue);
            columnValues.push(columnData);
          }
          getAnswerData.populateDataByColumn(columnValues);
        }
      }
    } catch (error) {
      console.error(`Error creating get answer data: ${error}`);
      console.error(jsonData);
    }

    return getAnswerData;
  }
}

/**
 * Converts a tabular data object to an HTML table for display.
 * @param tabularData
 * @returns {string}
 */
export const tabularDataToHTML = (tabularData) => {
  // Converts TabularData to HTML.
  let table = '<table class="tabular-data">';

  // Add a header
  table += "<tr>";
  for (const columnName of tabularData.columnNames) {
    table += `<th class="tabular-data-th">${columnName}</th>`;
  }
  table += "</tr>";

  const data = tabularData.getDataAsTable();
  for (let rnbr = 0; rnbr < tabularData.nbrRows; rnbr++) {
    table += "<tr>";
    for (let cnbr = 0; cnbr < tabularData.columnNames.length; cnbr++) {
      table += `<td class="tabular-data">${data[rnbr][cnbr]}</td>`;
    }
    table += "</tr>";
  }
  table += "</table>";

  return table;
};

/**
 * Converts tabular data to CSV format that can be displayed or downloaded.
 * @param tabularData A TabularData object.
 */
export const tabularDataToCSV = (tabularData) => {
  let csv = "data:text/csv;charset=utf-8,";

  // Get the column names as header values.
  const columnNames = tabularData.columnNames.map((cn) =>
    cn.replaceAll('"', '""')
  ); // convert quotes for embedding.
  csv += '"' + columnNames.join('","') + '"\n';

  // get the data as a table and add it to the CSV.
  const data = tabularData.getDataAsTable();
  for (let rnbr = 0; rnbr < tabularData.nbrRows; rnbr++) {
    const row = data[rnbr].map((d) => d.replaceAll('"', '""')); // convert quotes for embedding
    csv += '"' + row.join('","') + '"\n';
  }

  return csv;
};
