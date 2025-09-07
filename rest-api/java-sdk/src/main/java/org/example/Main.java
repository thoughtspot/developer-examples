package org.example;

// Import classes
import static org.example.auth.AuthUtils.getNewBearerToken;
import static org.example.util.ApiClientUtils.logApiException;
import static org.example.util.ApiClientUtils.updateApiClientWithNewBearerToken;
import static org.example.util.ApiPayload.FETCH_ALL_LIVEBOARD_DATA;

import java.io.IOException;
import java.util.List;

import org.example.util.Constants;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.thoughtspot.client.ApiClientConfiguration;
import com.thoughtspot.client.ApiException;
import com.thoughtspot.client.ApiResponse;
import com.thoughtspot.client.api.ThoughtSpotRestApi;
import com.thoughtspot.client.model.MetadataSearchResponse;
import com.thoughtspot.client.model.SearchMetadataRequest;
import com.thoughtspot.client.model.SearchUsersRequest;
import com.thoughtspot.client.model.User;

public class Main {
    private static Gson gson = new GsonBuilder()
            .setPrettyPrinting()
            .create();

    public static void main(String[] args) throws IOException {
        try {
            // create configuration for the ThoughtSpot API client
            ApiClientConfiguration apiClientConfiguration = new ApiClientConfiguration.Builder()
                    .basePath(Constants.BASE_PATH)
                    .verifyingSsl(false)  // Disable SSL verification for testing purposes
                    .readTimeoutMillis(600000)  // Extend read timeout to 10 minutes
                    .downloadPath(Constants.DOWNLOAD_PATH)  // Defaults to system download path if not specified
                    .build();

            // create an instance of the ThoughtSpot API client
            ThoughtSpotRestApi apiClient = new ThoughtSpotRestApi(apiClientConfiguration);

            // fetch new bearer token
            String token = getNewBearerToken();

            // update the API client with the new bearer token
            updateApiClientWithNewBearerToken(apiClient, token);

            // get current user information
            getCurrentUserInfo(apiClient);

            // search for all admin users
            fetchAdminUsers(apiClient);

            // fetch all Liveboards by loading apiPayload from JSON
            useJsonPayloadToFetchLiveboards(apiClient);
        } catch (ApiException e) {
            logApiException(e);
        }
    }

    private static void getCurrentUserInfo(ThoughtSpotRestApi tsRestApi) throws ApiException {
        // get current user information
        User currentUser = tsRestApi.getCurrentUserInfo();
        System.out.println("Current User: " + currentUser.toJson());

        // optionally, use .{REQUEST}WithHttpInfo() to get response details
        ApiResponse<User> currentUserResponse = tsRestApi.getCurrentUserInfoWithHttpInfo();
        System.out.println("Current User: " + currentUserResponse.getData().toString());
        System.out.println("Status code: " + currentUserResponse.getStatusCode());
        System.out.println("Response headers: " + currentUserResponse.getHeaders().toString());
    }

    private static void fetchAdminUsers(ThoughtSpotRestApi tsRestApi) throws ApiException {
        // search for all admin users
        SearchUsersRequest searchUsersRequest = new SearchUsersRequest()
                .recordSize(-1)
                .addPrivilegesItem(SearchUsersRequest.PrivilegesEnum.ADMINISTRATION);
        List<User> users = tsRestApi.searchUsers(searchUsersRequest);
        System.out.println("Fetched Admin Users: " + users.size());
        for (User user : users) {
            System.out.println("User: " + user.toJson());
        }
    }

    private static void useJsonPayloadToFetchLiveboards(
            ThoughtSpotRestApi tsRestApi) throws ApiException, IOException {
        // fetch all Liveboards by loading apiPayload from JSON
        String apiPayload = FETCH_ALL_LIVEBOARD_DATA.loadJson();

        // parse the JSON payload to SearchMetadataRequest
        SearchMetadataRequest searchMetadataRequest =
                gson.fromJson(apiPayload, SearchMetadataRequest.class);

        List<MetadataSearchResponse> response = tsRestApi.searchMetadata(searchMetadataRequest);
        System.out.println("Fetched Liveboards: " + response.size());
        for (MetadataSearchResponse liveboard : response) {
            System.out.println("Liveboard: " + liveboard.toJson());
        }
    }
}