package org.example.util;

import com.thoughtspot.client.ApiClientConfiguration;
import com.thoughtspot.client.ApiException;
import com.thoughtspot.client.api.ThoughtSpotRestApi;
import com.thoughtspot.client.model.GetFullAccessTokenRequest;
import com.thoughtspot.client.model.Token;

public class ApiClientUtils {
    public static void updateApiClientWithNewBearerToken(
            ThoughtSpotRestApi apiClient, String token) {
        // validate the input parameters
        if (apiClient == null || token == null || token.isEmpty()) {
            throw new IllegalArgumentException("ApiClient and token must not be null or empty");
        }

        try {
            // fetch new token
            GetFullAccessTokenRequest getFullAccessTokenRequest = new GetFullAccessTokenRequest()
                    .username(Constants.USERNAME)
                    .password(Constants.PASSWORD);
            Token response = apiClient.getFullAccessToken(getFullAccessTokenRequest);

            // update existing apiClientConfiguration
            ApiClientConfiguration apiClientConfiguration = apiClient.getApiClientConfiguration()
                    .toBuilder()
                    .bearerToken(response.getToken())
                    .build();

            // apply new configuration to the apiClient
            apiClient.applyApiClientConfiguration(apiClientConfiguration);
        } catch (ApiException e) {
            logApiException(e);
        }
    }

    public static void logApiException(ApiException e) {
        System.err.println("Exception when calling ThoughtSpot API");
        System.err.println("Status code: " + e.getCode());
        System.err.println("Reason: " + e.getResponseBody());
        System.err.println("Response headers: " + e.getResponseHeaders());
        e.printStackTrace();
    }
}
