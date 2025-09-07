import SwiftUI

struct RootView: View {
    @State private var isLoggedIn: Bool = false

    // We lift these up to RootView so we can pass them easily
    @State private var username: String = ""
    @State private var tsHost: String = ""
    @State private var liveboardId: String = ""
    @State private var secretKey: String = ""

    var body: some View {
        if isLoggedIn {
            HomeViewWrapper(
                isLoggedIn: $isLoggedIn,
                username: username,
                thoughtSpotHost: tsHost,
                liveboardId: liveboardId,
                secretKey: secretKey
            )
        } else {
            LoginView(
                isLoggedIn: $isLoggedIn,
                username: $username,
                tsHost: $tsHost,
                liveboardId: $liveboardId,
                secretKey: $secretKey
            )
        }
    }
}

struct LoginView: View {
    @Binding var isLoggedIn: Bool
    @Binding var username: String
    @Binding var tsHost: String
    @Binding var liveboardId: String
    @Binding var secretKey: String

    @State private var password: String = ""
    @State private var errorMessage: String?
    @State private var isShowingAlert: Bool = false
    @State private var authMethod: AuthMethod = .secretKey

    enum AuthMethod {
        case secretKey
        case password
    }

    var body: some View {
        NavigationStack {
            Form {
                Text("Welcome to DemoApp")
                    .font(.system(size: 30, design: .default))
                    .fontWeight(.bold)
                Section {
                    TextField("Username", text: $username)
                    TextField("ThoughtSpot Host", text: $tsHost)
                } header: {
                    Text("Authentication Details")
                }
                Picker("Authentication Method", selection: $authMethod) {
                    Text("Secret Key").tag(AuthMethod.secretKey)
                    Text("Password").tag(AuthMethod.password)
                }
                if authMethod == .secretKey {
                    SecureField("Secret Key", text: $secretKey)
                } else {
                    SecureField("Password", text: $password)
                }
                Section {
                    TextField("Liveboard ID", text: $liveboardId)
                } header: {
                    Text("Embed Details")
                }
                Section {
                    Button("Login into App") {
                        login()
                    }
                    .tint(.indigo)
                    .frame(maxWidth: .infinity)
                }
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            .alert(isPresented: $isShowingAlert) {
                Alert(
                    title: Text("Error"),
                    message: Text(errorMessage ?? "An unknown error occurred."),
                    dismissButton: .default(Text("OK")) {
                        isShowingAlert = false
                        errorMessage = nil
                    }
                )
            }
        }
    }

    private func login() {
        if username.isEmpty || tsHost.isEmpty || liveboardId.isEmpty {
            errorMessage = "Username, Host, and Liveboard ID are required."
            isShowingAlert = true
            return
        }
        if (authMethod == .secretKey && secretKey.isEmpty) || (authMethod == .password && password.isEmpty) {
            errorMessage = "Please provide either a Password or a Secret Key."
            isShowingAlert = true
            return
        }
        if !tsHost.hasPrefix("https://") && !tsHost.hasPrefix("http://") {
            errorMessage = "ThoughtSpot Host must start with 'http://' or 'https://'."
            isShowingAlert = true
            return
        }

        tsHost = tsHost.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        if !username.isEmpty && !tsHost.isEmpty && !liveboardId.isEmpty &&
            ((authMethod == .password && !password.isEmpty) || (authMethod == .secretKey && !secretKey.isEmpty)) {
            errorMessage = nil
            isLoggedIn = true
        } else {
            errorMessage = "Invalid credentials. Please check your input."
            isShowingAlert = true
        }
    }
}


// A wrapper for HomeView
struct HomeViewWrapper: View {
    @Binding var isLoggedIn: Bool

    var username: String
    var thoughtSpotHost: String
    var liveboardId: String
    var secretKey: String

    var body: some View {
        NavigationStack {
            HomeView(
                username: username,
                thoughtSpotHost: thoughtSpotHost,
                liveboardId: liveboardId,
                secretKey: secretKey
            )
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") {
                        isLoggedIn = false
                    }
                }
            }
        }
    }
}

