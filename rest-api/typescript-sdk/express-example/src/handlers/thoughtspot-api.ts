import { RequestHandler } from "express";
import { SearchMetadataRequest, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";

/**
 * This will get the current user info from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).thoughtSpotClient;

    const userInfo = await client.getCurrentUserInfo();
    res.send(userInfo).status(200);
  } catch (error: any) {
    console.error(error);
    res.status(500).send(error);
  }
}

/**
 * This will get the metadata from the thoughtspot api
 * 
 * We will use the authenticated client to make the request
 */
export const getMetadata: RequestHandler = async (req, res, next) => {
  try {
    const client: ThoughtSpotRestApi = (req as any).thoughtSpotClient;

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
    res.status(500).send(error);
  }
}