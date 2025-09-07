package org.example.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

public enum ApiPayload {
    FETCH_ALL_LIVEBOARD_DATA("org/example/payloads/FetchAllLiveboardsDetails.json");

    private final String resourcePath;

    ApiPayload(String resourcePath) {
        this.resourcePath = resourcePath;
    }

    public String loadJson() throws IOException {
        try (InputStream inputStream =
                getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                throw new IOException("Resource not found: " + resourcePath);
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                return reader.lines().collect(Collectors.joining(System.lineSeparator()));
            }
        }
    }
}
