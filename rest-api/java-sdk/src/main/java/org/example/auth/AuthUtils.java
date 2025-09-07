package org.example.auth;

import static org.example.util.ApiClientUtils.logApiException;
import static org.example.util.Constants.*;

import com.thoughtspot.client.ApiClientConfiguration;
import com.thoughtspot.client.ApiException;
import com.thoughtspot.client.api.ThoughtSpotRestApi;
import com.thoughtspot.client.model.GetFullAccessTokenRequest;
import com.thoughtspot.client.model.Token;

public class AuthUtils {
    public static String getNewBearerToken() {
        try {
            // get a new client to make request with
            ThoughtSpotRestApi apiClient = new ThoughtSpotRestApi(
                    new ApiClientConfiguration(BASE_PATH));

            // fetch new token
            GetFullAccessTokenRequest getFullAccessTokenRequest = new GetFullAccessTokenRequest()
                    .username(USERNAME)
                    .password(PASSWORD);
            Token response = apiClient.getFullAccessToken(getFullAccessTokenRequest);
            return response.getToken();
        }
        catch (ApiException e) {
            logApiException(e);
        }
        return null;
    }
}
