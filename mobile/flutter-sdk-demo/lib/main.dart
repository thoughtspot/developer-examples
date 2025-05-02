import 'dart:convert';
import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_embed_sdk/flutter_embed_sdk.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const MyApp());
}

class GetAuthToken extends EmbedConfigGetAuthToken {
  @override
  Future<String> operate() async {
    String thoughtspotHost = 'https://embed-1-do-not-delete.thoughtspotstaging.cloud';
    String demoUsername = 'sandbox-test-user';
    String demoUserPassword = 'GraphqlUser1!';

    String tokenApiUrl = '$thoughtspotHost/api/rest/2.0/auth/token/full';

    final response = await http.post(
      Uri.parse(tokenApiUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': demoUsername,
        'password': demoUserPassword,
      }),
    );

    if (response.statusCode != 200) {
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
      authType: AuthType.TrustedAuthTokenCookieless,
      thoughtSpotHost: 'https://embed-1-do-not-delete.thoughtspotstaging.cloud',
      getAuthToken: GetAuthToken(),
      logLevel: LogLevel.DEBUG
    );

    liveboardViewConfig = LiveboardViewConfig(
      liveboardId: '8c8a3b2f-2c02-42ed-82ac-274b1302ff1a',
      visibleVizs: ["ae4c5ea3-8009-40a8-a14f-be2dcd241ae9"],
      customizations: CustomisationsInterface(
        style: CustomStyles(
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
                        () =>
                            liveboardEmbedController.trigger(HostEvent.Filter),
                    child: const Text('Filter'),
                  ),
                  ElevatedButton(
                    onPressed:
                        () => liveboardEmbedController.trigger(
                          HostEvent.SetActiveTab,
                          {'tabId': 'cef75199-e86c-4615-981e-087c5e8791b7'},
                        ),
                    child: const Text('Set Active Tab'),
                  ),
                  ElevatedButton(
                    onPressed:
                        () => liveboardEmbedController.trigger(
                          HostEvent.DrillDown,
                        ),
                    child: const Text('Drill Down'),
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
