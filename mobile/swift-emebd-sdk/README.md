# ThoughtSpot Swift Embed SDK Demo

This repository contains a demo application showcasing how to integrate the ThoughtSpot Swift Embed SDK into an iOS application. Use this sandbox project to quickly get started with embedding ThoughtSpot Liveboards in your iOS apps.

![Demo App Screenshot](https://via.placeholder.com/300x600)

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Implementation Details](#implementation-details)
- [Features](#features)
- [Authentication Flow](#authentication-flow)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Overview

The Swift Embed SDK Demo App demonstrates how to:

- Authenticate with a ThoughtSpot instance
- Embed a ThoughtSpot Liveboard in a SwiftUI application
- Handle events from the embedded content
- Customize the appearance of the embedded content
- Trigger actions on the embedded content

This sandbox provides a complete, working example that you can use as a reference or starting point for your own implementations.

## Prerequisites

- Xcode 13.0+
- iOS 14.0+
- Swift 5.5+
- A ThoughtSpot account with:
  - Access to a ThoughtSpot instance
  - A Liveboard to embed
  - Valid user credentials or secret key

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/thoughtspot/developer-examples.git
cd developer-examples/swift-embed-sdk-demo
```

### Open the Project in Xcode

```bash
open Swift-Embed-SDK-Demo.xcodeproj
```

If the above command doesn't work, you can manually open Xcode and select "Open..." from the File menu, then navigate to the cloned repository and select the project file.

### Configure the Demo App

1. No configuration is needed to run the demo app as-is. Simply build and run the project in the iOS Simulator or on a physical device.

2. When the app starts, you'll see a login screen where you'll need to provide:
   - Username: Your ThoughtSpot username
   - ThoughtSpot Host: The URL of your ThoughtSpot instance (e.g., `https://your-instance.thoughtspot.cloud`)
   - Secret Key or Password: Your authentication credentials
   - Liveboard ID: The ID of the Liveboard you want to embed

### Run the Demo App

1. Select an iOS Simulator or connect an iOS device to your Mac
2. Click the Run button in Xcode or press ⌘R

## Implementation Details

### Setting Up the Embed Configuration

The demo app showcases the proper way to configure and initialize the SDK:

```swift
// 1. Create custom styling (optional)
let cssVariablesDict: [String: String] = [
    "--ts-var-root-background": "#fef4dd",
    "--ts-var-root-color": "#4a4a4a",
    "--ts-var-viz-title-color": "#8e6b23",
    // More custom styles...
]

let customCSSObject = customCssInterface(variables: cssVariablesDict)
let styleObject = CustomStyles(customCSS: customCSSObject)
let customizationsObject = CustomisationsInterface(style: styleObject)

// 2. Create the static embed configuration
let staticEmbedConfig = EmbedConfig(
    thoughtSpotHost: thoughtSpotHost,
    authType: AuthType.TrustedAuthTokenCookieless,
    customizations: customizationsObject
)

// 3. Create a token provider function using Combine
func getAuthToken() -> Future<String, Error> {
    Future { promise in
        Task {
            if let token = await fetchAuthToken(username: username, secretKey: secretKey, host: thoughtSpotHost) {
                promise(.success(token))
            } else {
                promise(.failure(NSError(
                    domain: "AuthError", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to fetch auth token"]
                )))
            }
        }
    }
}

// 4. Create the TSEmbedConfig with the token provider
let tsEmbedConfig = TSEmbedConfig(
    embedConfig: staticEmbedConfig,
    getAuthToken: getAuthToken
)

// 5. Create the Liveboard view configuration
let liveboardViewConfig = LiveboardViewConfig(
    liveboardId: liveboardId
)

// 6. Create the LiveboardEmbedController
let liveboardController = LiveboardEmbedController(
    tsEmbedConfig: tsEmbedConfig,
    viewConfig: liveboardViewConfig
)
```

### Using the LiveboardEmbed SwiftUI Component

The demo shows how to use the LiveboardEmbed component with the controller:

```swift
struct ContentView: View {
    @StateObject var liveboardController: LiveboardEmbedController
    
    var body: some View {
        VStack {
            // Embed the Liveboard using the LiveboardEmbed component
            LiveboardEmbed(controller: liveboardController)
                .frame(height: 600)
                .cornerRadius(12)
                .onAppear {
                    // Register event listeners when the component appears
                    registerEventListeners()
                }
            
            // Add custom UI controls
            HStack {
                Button {
                    // Trigger a host event on the embedded content
                    liveboardController.trigger(event: HostEvent.Reload)
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
    }
    
    // Register for events from the embedded content
    func registerEventListeners() {
        liveboardController.on(event: EmbedEvent.AuthInit) { payload in
            print("Authentication initialized")
        }
        
        liveboardController.on(event: EmbedEvent.LiveboardRendered) { payload in
            print("Liveboard rendered")
        }
    }
}
```

## Features

### Authentication

The demo app supports two authentication methods:
- Secret Key authentication (recommended)
- Username/password authentication

### Liveboard Embedding

The app demonstrates how to:
- Initialize the SDK with proper configuration
- Create and configure a LiveboardEmbedController
- Embed a ThoughtSpot Liveboard using the LiveboardEmbed SwiftUI component

### Event Handling

The demo shows how to:
- Register for events from the embedded content
- Handle events such as authentication initialization, Liveboard rendering, and errors
- Respond to user interactions with the embedded content

### Host Actions

The demo demonstrates how to trigger actions on the embedded content:
- Reload the Liveboard
- Open the Share dialog

### Custom Styling

The demo shows how to customize the appearance of the embedded content using:
- Custom CSS variables
- Custom fonts and colors
- Custom styles for UI elements

## Authentication Flow

The demo app implements a complete authentication flow:

1. User enters credentials on the login screen
2. Credentials are validated
3. A token is fetched from the ThoughtSpot API
4. The token is used to authenticate the embedded content
5. The user is shown the embedded Liveboard upon successful authentication

## Customization

### Styling the Embedded Content

The demo shows how to customize the appearance of the embedded ThoughtSpot content:

```swift
let cssVariablesDict: [String: String] = [
    "--ts-var-root-background": "#fef4dd",
    "--ts-var-root-color": "#4a4a4a",
    "--ts-var-viz-title-color": "#8e6b23",
    // More customizations...
]

let customCSSObject = customCssInterface(variables: cssVariablesDict)
let styleObject = CustomStyles(customCSS: customCSSObject)
let customizationsObject = CustomisationsInterface(style: styleObject)
```

### Custom UI Elements

The demo includes custom styled buttons and UI elements:

```swift
Button {
    liveboardController.trigger(event: HostEvent.Reload)
} label: {
    Image(systemName: "arrow.clockwise")
        .foregroundColor(.white)
}
.buttonStyle(StyledButton())
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure your ThoughtSpot host URL includes the protocol (https://)
   - Verify that your credentials are correct
   - Check that your secret key is valid and active

2. **Liveboard Not Loading**
   - Ensure the Liveboard ID is correct
   - Check that your user has access to the Liveboard
   - Look for errors in the Xcode console using the Error event listener

3. **Network Issues**
   - Check your internet connection
   - Ensure your ThoughtSpot instance is accessible
   - Check that App Transport Security settings allow connection to your host

### Debugging Tips

The demo app includes comprehensive error handling and logging:

```swift
liveboardController.on(event: EmbedEvent.Error) { payload in
    print(">>> HomeView: Received Error. Payload: \(payload ?? "nil")")
}
```

## Additional Resources

- [Swift Embed SDK GitHub Repository](https://github.com/thoughtspot/swift-embed-sdk)
- [Swift Embed SDK Documentation](https://developers.thoughtspot.com/docs/)
- [ThoughtSpot Developer Portal](https://developers.thoughtspot.com)
- [ThoughtSpot Community](https://community.thoughtspot.com/)

## License

This demo application is licensed under the ThoughtSpot Development Tools End User License Agreement.
