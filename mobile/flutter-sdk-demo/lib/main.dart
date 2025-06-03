import 'dart:convert';
import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_embed_sdk/flutter_embed_sdk.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const MyApp());
}

class ThoughtSpotConst {
  // static const String host = 'http://172.32.101.197:8088';
  // static const String username = 'tsadmin';
  // static const String password = '4Xyc1f%[H^3L';
  // static const String liveboardId = '8c8a3b2f-2c02-42ed-82ac-274b1302ff1a';
  // static const String tabId = 'cef75199-e86c-4615-981e-087c5e8791b7';
  // static const String tokenApiEndpoint = '$host/api/rest/2.0/auth/token/full';

  static const String host = 'https://embed-1-do-not-delete.thoughtspotstaging.cloud';
  static const String username = 'sandbox-test-user';
  static const String password = 'GraphqlUser1!';
  static const String liveboardId = '8c8a3b2f-2c02-42ed-82ac-274b1302ff1a';
  static const String tabId = 'cef75199-e86c-4615-981e-087c5e8791b7';
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
      thoughtSpotHost: ThoughtSpotConst.host,
      getAuthToken: GetAuthToken(),
      logLevel: LogLevel.DEBUG,
      additionalFlags: {
        'shell_debug_mode': true,
        'mobile_shell_url': 'http://localhost:8080',
        'shell_debug_flags': '{"helo": "http://localhost:8080"}',
      },
    );

    liveboardViewConfig = LiveboardViewConfig(
      liveboardId: ThoughtSpotConst.liveboardId,
      // visibleVizs: ["ae4c5ea3-8009-40a8-a14f-be2dcd241ae9"],
      customizations: CustomisationsInterface(
        style: CustomStyles(
          customCSS: customCssInterface(
            variables: {
              "--ts-var-root-background": "#f6f641",
              "--ts-var-root-color": "#041a45",
              "--ts-var-viz-background": "#38f193",
              "--ts-var-viz-border-radius": "20px",
              "--ts-var-liveboard-single-column-breakpoint": "100px", 
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
                          {'tabId': ThoughtSpotConst.tabId},
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
