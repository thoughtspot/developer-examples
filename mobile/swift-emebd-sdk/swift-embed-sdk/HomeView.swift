import SwiftUI
import SwiftEmbedSDK
import Combine
import Foundation

struct AuthTokenResponse: Codable {
    let token: String
}

struct APIError: Codable {
    let message: String
}

struct APIErrorResponse: Codable {
    let error: APIError
}

func fetchAuthToken(username: String, secretKey: String, host: String) async -> String? {
    print("Fetching auth token...")
    
    let urlString = "\(host)/api/rest/2.0/auth/token/full"
    guard let url = URL(string: urlString) else {
        print("Error: Invalid URL: \(urlString)")
        return nil
    }
    
    let headers: [String: String] = [
        "Accept": "application/json",
        "Content-Type": "application/json"
    ]
    
    let body: [String: Any] = [
        "username": username,
        "validity_time_in_sec": 30,
        "auto_create": false,
        "secret_key": secretKey
    ]
    
    do {
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.allHTTPHeaderFields = headers
        request.httpBody = jsonData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let errorDescription = (response as? HTTPURLResponse)?.description ?? "Unknown server error"
            print("Error: HTTP request failed. Status code: \((response as? HTTPURLResponse)?.statusCode ?? -1), Description: \(errorDescription)")
            
            if let errorData = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                print("Server Error Message: \(errorData.error.message)")
            }
            return nil
        }
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("Full API Response: \(responseString)")
        }
        
        let decodedResponse = try JSONDecoder().decode(AuthTokenResponse.self, from: data)
        return decodedResponse.token
        
    } catch {
        print("Error fetching auth token: \(error)")
        return nil
    }
}


// MARK: - Helper: Auth Token Fetching if you want to quick test.
func fetchMyAuthToken(username: String) async -> String? {
    print("Fetching auth token...")
    do {
        if username == "validuser" {
            // here provide your token directly.
            return "your_token"
        } else {
            return "invalid_token"
        }
    } catch {
        print("Error fetching auth token: \(error)")
        return nil
    }
}

// MARK: - Helper: Customer's Auth Token Provider Implementation
// Customers need to create a class like this conforming to the SDK protocol

// MARK: - SwiftUI View: HomeView
struct HomeView: View {
    
    var username: String
    var thoughtSpotHost: String
    var liveboardId: String
    var secretKey: String
    
    @StateObject var liveboardController: LiveboardEmbedController
    
    init(username: String, thoughtSpotHost: String, liveboardId: String, secretKey: String) {
        self.username = username
        self.thoughtSpotHost = thoughtSpotHost
        self.liveboardId = liveboardId
        self.secretKey = secretKey
        
        let cssVariablesDict: [String: String] = [
            "--ts-var-root-background": "#fef4dd",
            "--ts-var-root-color": "#4a4a4a",
            "--ts-var-viz-title-color": "#8e6b23",
            "--ts-var-viz-title-font-family": "'Georgia', 'Times New Roman', serif",
            "--ts-var-viz-title-text-transform": "capitalize",
            "--ts-var-viz-description-color": "#6b705c",
            "--ts-var-viz-description-font-family": "'Verdana', 'Helvetica', sans-serif",
            "--ts-var-viz-description-text-transform": "none",
            "--ts-var-viz-border-radius": "6px",
            "--ts-var-viz-box-shadow": "0 3px 6px rgba(0, 0, 0, 0.15)",
            "--ts-var-viz-background": "#fffbf0",
            "--ts-var-viz-legend-hover-background": "#ffe4b5",
        ]
        
        let customCSSObject = customCssInterface(variables: cssVariablesDict)
        let styleObject = CustomStyles(
            customCSSUrl: "https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/css-variables.css",
            customCSS: customCSSObject
        )
        let customizationsObject = CustomisationsInterface(
            style: styleObject
        )
        
        let staticEmbedConfig = EmbedConfig(
            thoughtSpotHost: thoughtSpotHost,
            authType: .TrustedAuthTokenCookieless,
            customizations: customizationsObject
        )
        
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
        
        let tsEmbedConfig = TSEmbedConfig(
            embedConfig: staticEmbedConfig,
            getAuthToken: getAuthToken,
            initializationCompletion: {
                result in
                switch result {
                case .success:
                    print(">>>> Customer: Liveboard Embed doing good!!")
                case .failure(let error):
                    print(">>> Customer: Livboeard Embed failed, error: \(error)")
                }
            }
        )
        
        let liveboardViewConfig = LiveboardViewConfig(
            liveboardId: liveboardId
        )
        
        
        _liveboardController = StateObject(wrappedValue: LiveboardEmbedController(
            tsEmbedConfig: tsEmbedConfig,
            viewConfig: liveboardViewConfig
        ))
    }
    
    // MARK: - Body
    var body: some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: 20) {
                // Embed the Liveboard
                LiveboardEmbed(controller: liveboardController)
                    .frame(height: 600)
                    .border(Color.gray)
                    .cornerRadius(12)
                    .shadow(radius: 8)
                    .onAppear {
                        registerSDKListeners()
                    }
                
                Text("Welcome, \(username)!")
                    .font(.title)
                    .foregroundColor(.blue)
                
                HStack {
                    Button {
                        liveboardController.trigger(event: HostEvent.Reload)
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.white)
                    }
                    .buttonStyle(StyledButton())
                    
                    Button {
                        liveboardController.trigger(event: HostEvent.Share)
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.white)
                    }
                    .buttonStyle(StyledButton())
                }
                .padding(.top, 10)
                .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(15)
            .background(Color.white.opacity(0.9))
            .cornerRadius(15)
            HStack(spacing: 4) {
                Circle()
                    .fill(Color.green)
                    .frame(width: 8, height: 8)
                Text("Online")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            .padding(.bottom)
        }
        .navigationTitle("Liveboard")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Event Listener Registration
    func registerSDKListeners() {
        print("HomeView: Registering SDK listeners...")
        
        liveboardController.on(event: EmbedEvent.AuthInit) { payload in
            print(">>> HomeView: Received AuthInit. Payload: \(payload ?? "nil")")
        }
        
        liveboardController.on(event: EmbedEvent.LiveboardRendered) { payload in
            print(">>> HomeView: Received LiveboardLoad. Payload: \(payload ?? "nil")")
        }
        
        liveboardController.on(event: EmbedEvent.Error) { payload in
            print(">>> HomeView: Received Error. Payload: \(payload ?? "nil")")
        }
        
        // Example: Removing a listener (though current 'off' removes all for the event)
        // liveboardController.off(event: EmbedEvent.authInit)
    }
}

struct StyledButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .font(.system(size: 14))
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [gold, orangeGold]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(6)
            .shadow(color: Color.black.opacity(0.2), radius: 3, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .animation(.easeInOut, value: configuration.isPressed)
    }
    
    private var gold: Color {
        return Color(red: 255 / 255, green: 215 / 255, blue: 0 / 255)
    }
    
    private var orangeGold: Color {
        return Color(red: 255 / 255, green: 165 / 255, blue: 0 / 255)
    }
    
    init() {}
}

//struct HomeView_Previews: PreviewProvider {
//    static var previews: some View {
//        NavigationView {
//            HomeView(username: "Preview User", thoughtSpotHost: "https://example.com", liveboardId: "1234", secretKey: "test" )
//        }
//    }
//}

