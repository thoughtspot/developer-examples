// @ts-nocheck
import * as React from 'react';
import { useState, useRef } from 'react';
import { 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  View,
  Alert
} from 'react-native';
import { init, AuthType } from '@thoughtspot/react-native-embed-sdk';
import { STYLE_VARS } from './utils';
import { getAuthToken } from './Auth';
import { Ionicons } from '@expo/vector-icons';


export default function Home({navigation}: {navigation: any}) {
  const [credentials, setCredentials] = useState({
    tsHost: '',
    username: '',
    password: '',
    secretKey: ''
  });
  const [viewConfig, setViewConfig] = useState({
    liveboardId: ''
  });

  const handleAuthentication = async () => {
    try {
      init({
        thoughtSpotHost: credentials.tsHost,
        authType: AuthType.TrustedAuthTokenCookieless,
        getAuthToken: async () => {
            return await getAuthToken(credentials);
        },
        loginFailedMessage: "Login Failed",
        customizations: {
          style: {
            customCSS: {
              variables: STYLE_VARS,
            },
          },
        }, 
      });
      navigation.navigate('Liveboard', { viewConfig });
    } catch (error) {
      console.error('Authentication failed:', error);
      Alert.alert(
        "Error",
        `Authentication failed: ${error as string}`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.appTitle}>ThoughtSpot Embedded SDK Showcase</Text>
          <Text style={styles.appSubtitle}>React Native SDK Integration Example</Text>
          <TextInput
            style={styles.input}
            placeholder="ThoughtSpot Host"
            value={credentials.tsHost}
            onChangeText={(text) => setCredentials(prev => ({ ...prev, tsHost: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={credentials.username}
            onChangeText={(text) => setCredentials(prev => ({ ...prev, username: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password (Optional)"
            value={credentials.password}
            secureTextEntry
            onChangeText={(text) => setCredentials(prev => ({ ...prev, password: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Secret Key (Optional)"
            value={credentials.secretKey}
            secureTextEntry
            onChangeText={(text) => setCredentials(prev => ({ ...prev, secretKey: text }))}
          />

          <TextInput 
            style={styles.input}
            placeholder="Liveboard-ID"
            value={viewConfig.liveboardId}
            onChangeText={(text) => setViewConfig(prev => ({...prev, liveboardId: text}))}
          />
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleAuthentication}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
          <View style={styles.iconDescriptionContainer}>
            <Text style={styles.descriptionHeader}>Icon Guide:</Text>
            <View style={styles.iconDescription}>
              <Ionicons name="sync" size={20} color="#2770EF" />
              <Text style={styles.descriptionText}>State Change Demo - Tests updating state without reloading the webview</Text>
            </View>
            <View style={styles.iconDescription}>
              <Ionicons name="reload" size={20} color="#2770EF" />
              <Text style={styles.descriptionText}>Reload - Refreshes the embedded content</Text>
            </View>
            <View style={styles.iconDescription}>
              <Ionicons name="share" size={20} color="#2770EF" />
              <Text style={styles.descriptionText}>Share - Shares the current content</Text>
            </View>
          </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  formContainer: {
    padding: 20,
    justifyContent: 'center',
    flex: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#2770EF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  embedContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
   headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E2E2E', 
    paddingHorizontal: 10,
    height: 50,
  },
  headerText: {
    color: '#FFFFFF', 
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F39C12',
    borderRadius: 5,
  },
  actionButtonText: {
    color: '#FFFFFF', 
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  embed: {
    flex: 1,
  },
  footer: {
    height: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 16,
  },
  iconDescriptionContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'scroll',
  },
  descriptionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  iconDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  descriptionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2770EF',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
});
