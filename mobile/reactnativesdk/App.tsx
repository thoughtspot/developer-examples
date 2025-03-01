/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Home } from './src/Home';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LiveboardView } from './src/Liveboard/LiveboardView';

const Stack = createNativeStackNavigator();

export default function App() {

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Liveboard" component={LiveboardView} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
