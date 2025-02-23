import { RequestHandler } from "express";
import { SearchMetadataRequest, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";

/**
 * This will get the current user info from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).authenticatedClient;

    const userInfo = await client.getCurrentUserInfo();
    res.send(userInfo).status(200);
  } catch (error: any) {
    console.error(error.body.error);
    res.status(500).send(error.body.error);
  }
}

/**
 * This will get the metadata from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getMetadata: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).authenticatedClient;

    const userInput: SearchMetadataRequest = {
      metadata: [{
        type: "LIVEBOARD",
      },
      {
        type: "ANSWER",
      }
      ],
      record_offset: 0,
      record_size: 50
    }

    const metadata = await client.searchMetadata(userInput);

    res.send(metadata).status(200);
  } catch (error: any ) {
    console.error(error.body.error);
    res.status(500).send(error.body.error);
  }
}

/**
 * This will get the answer data from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getAnswerData: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).authenticatedClient;

    const userInput = {
      metadata_identifier: req.params.answerId as string,
      record_offset: Number(req.query.offset) || 0,
      record_size: Number(req.query.size) || 100
    }

    const answerData = await client.fetchAnswerData(userInput);

    res.status(200).send(answerData);
  } catch (error: any ) {
    console.error(error.body.error);
    res.status(500).send(error.body.error);
  }
}

/**
 * This will get the liveboard data from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getLiveboardData: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).authenticatedClient;

    const userInput = {
      metadata_identifier: req.params.liveboardId as string,
      visualization_identifiers: req.query.vizIds ? [req.query.vizIds as string] : undefined,
      record_offset: Number(req.query.offset) || 0,
      record_size: Number(req.query.size) || 100
    }

    const liveboardData = await client.fetchLiveboardData(userInput);

    res.status(200).send(liveboardData);
  } catch (error: any) {
    console.error(error.body.error);
    res.status(500).send(error.body.error);
  }
}

/**
 * This will get the search data from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getSearchData: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).authenticatedClient;

    const userInput = {
      query_string: req.query.query as string,
      logical_table_identifier: req.query.tableId as string,
      offset: Number(req.query.offset) || 0,
      size: Number(req.query.size) || 100
    }

    const searchData = await client.searchData(userInput);
    
    res.status(200).send(searchData);
  } catch (error: any) {
    console.error(error.body.error);
    res.status(500).send(error.body.error);
  }
}

