import 'dart:convert';
import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_embed_sdk/flutter_embed_sdk.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const MyApp());
}

class ThoughtSpotConst {
  static const String host = 'https://training.thoughtspot.cloud';
  static const String username = 'code-sandbox';
  static const String password = '3mbed+#3xplz';
  static const String liveboardId = 'b7074f85-4a5c-499e-b2b1-2435f08f5d9a';
  static const String tabIdOne = 'bf5f7a54-c76c-43c7-9415-a94ed67f79a6';
  static const String tabIdTwo = '023ac83e-6c59-4328-8f48-945fd472e742';
  static const String tokenApiEndpoint = '$host/api/rest/2.0/auth/token/full';
}

class GetAuthToken extends EmbedConfigGetAuthToken {
  @override
  Future<String> operate() async {
    final response = await http.post(
      Uri.parse(ThoughtSpotConst.tokenApiEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': ThoughtSpotConst.username,
        'password': ThoughtSpotConst.password,
      }),
    );

    if (response.statusCode != 200) {
      print('Token api response: ${response.body}');
      throw Exception('Failed to load token');
    }

    final tokenResponse = jsonDecode(response.body);
    final token = tokenResponse['token'];
    print('Got token: $token');
    return token;
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  late LiveboardController liveboardEmbedController;
  late EmbedConfig embedConfig;
  late LiveboardViewConfig liveboardViewConfig;

  @override
  void initState() {
    super.initState();

    embedConfig = EmbedConfig(
      // Currently only TrustedAuthTokenCookieless is supported
      authType: AuthType.TrustedAuthTokenCookieless,
      thoughtSpotHost: ThoughtSpotConst.host,
      getAuthToken: GetAuthToken(),
      logLevel: LogLevel.DEBUG,
    );

    liveboardViewConfig = LiveboardViewConfig(
      liveboardId: ThoughtSpotConst.liveboardId,
      customizations: CustomisationsInterface(
        style: CustomStyles(
          // Use custom CSS to change the colors of the app
          // Visit https://developers.thoughtspot.com/docs/Interface_CustomCssVariables#_ts_var_root_background for more details
          customCSS: customCssInterface(
            variables: {
              "--ts-var-root-background": "#f6f641",
              "--ts-var-root-color": "#041a45",
              "--ts-var-viz-background": "#38f193",
              "--ts-var-viz-border-radius": "20px",
            },
          ),
        ),
      ),
    );

    liveboardEmbedController = LiveboardController(
      embedConfig: embedConfig,
      viewConfig: liveboardViewConfig,
    );

    liveboardEmbedController.on(EmbedEvent.Data, (payload) {
      print('Data: ${payload['displayMode']}');
    });

    liveboardEmbedController.on(EmbedEvent.RouteChange, (payload) {
      print('Route Change: ${payload['currentPath']}');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: LiveboardEmbed(controller: liveboardEmbedController),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton(
                    onPressed:
                        () =>
                            liveboardEmbedController.trigger(HostEvent.Reload),
                    child: const Text('Refresh'),
                  ),
                  ElevatedButton(
                    onPressed:
                        () => liveboardEmbedController.trigger(
                          HostEvent.SetActiveTab,
                          {'tabId': ThoughtSpotConst.tabIdTwo},
                        ),
                    child: const Text('Set Tab One'),
                  ),
                  ElevatedButton(
                    onPressed:
                        () => liveboardEmbedController.trigger(
                          HostEvent.SetActiveTab,
                          {'tabId': ThoughtSpotConst.tabIdOne},
                        ),
                    child: const Text('Set Tab Two'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
