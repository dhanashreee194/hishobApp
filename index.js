/**
 * @format
 */

import 'regenerator-runtime/runtime';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import {enableScreens} from 'react-native-screens';
import App from './App';
import {name as appName} from './app.json';

enableScreens();

AppRegistry.registerComponent(appName, () => App);
