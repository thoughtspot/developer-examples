import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import type { RequestContext, ResponseContext } from "@thoughtspot/rest-api-sdk"
import { Observable, of } from "rxjs";
import YAML from "yaml";

const TOKEN_SERVER = process.env.VITE_TOKEN_SERVER;
const USERNAME = process.env.VITE_USERNAME;
const THOUGHTSPOT_HOST: string = process.env.VITE_THOUGHTSPOT_HOST || "";
const TOKEN_ENDPOINT = `${TOKEN_SERVER}/api/gettoken/${USERNAME}`;
const BEARER_TOKEN = process.env.VITE_TS_BEARER_TOKEN;

let token = BEARER_TOKEN;


const config = createBearerAuthenticationConfig(
  THOUGHTSPOT_HOST,
  async () => {
    if (BEARER_TOKEN) {
      return BEARER_TOKEN;
    }
    const response = await fetch(TOKEN_ENDPOINT);
    token = await response.text();
    return token;
  },
);

config.middleware.push({
  pre: (context: RequestContext): Observable<RequestContext> => {
    const headers = context.getHeaders();
    if (!headers || !headers["Accept-Language"]) {
      context.setHeaderParam('Accept-Language', 'en-US');
    }
    return of(context);
  },
  post: (context: ResponseContext): Observable<ResponseContext> => {
    return of(context);
  }
});
export const thoughtSpotClient = new ThoughtSpotRestApi(config);


const getAnswerTML = `
mutation GetUnsavedAnswerTML($session: BachSessionIdInput!, $exportDependencies: Boolean, $formatType:  EDocFormatType, $exportPermissions: Boolean, $exportFqn: Boolean) {
  UnsavedAnswer_getTML(
    session: $session
    exportDependencies: $exportDependencies
    formatType: $formatType
    exportPermissions: $exportPermissions
    exportFqn: $exportFqn
  ) {
    zipFile
    object {
      edoc
      name
      type
      __typename
    }
    __typename
  }
}`;


// This is a workaround until we get the public API for this
(thoughtSpotClient as any).exportUnsavedAnswerTML = async ({ session_identifier, generation_number }) => {
  // make a graphql request to `ThoughtspotHost/prism endpoint.
  const response = await fetch(THOUGHTSPOT_HOST + "/prism/?op=GetUnsavedAnswerTML", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      operationName: "GetUnsavedAnswerTML",
      query: getAnswerTML,
      variables: {
        session: {
          sessionId: session_identifier,
          genNo: generation_number,
        }
      }
    }),
  });

  const data = await response.json();
  const edoc = data.data.UnsavedAnswer_getTML.object[0].edoc;
  return YAML.parse(edoc);
}