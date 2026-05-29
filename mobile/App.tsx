import 'react-native-gesture-handler'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Provider as AntProvider } from '@ant-design/react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { IconOutline } from '@ant-design/icons-react-native'
import type { OutlineGlyphMapType } from '@ant-design/icons-react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import ConversationsScreen from './src/screens/ConversationsScreen'
import ContactsScreen from './src/screens/ContactsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import ChatScreen from './src/screens/ChatScreen'
import AddContactScreen from './src/screens/AddContactScreen'
import NewGroupScreen from './src/screens/NewGroupScreen'
import type { AuthStackParamList, RootStackParamList } from './src/navigation/types'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const Tab = createBottomTabNavigator()

function tabIcon(name: OutlineGlyphMapType) {
  return ({ color, size }: { color: string; size: number }) => (
    <IconOutline name={name} color={color} size={size} />
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#1677ff',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ConversationsScreen}
        options={{ title: '消息', tabBarIcon: tabIcon('message') }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: '通讯录', tabBarIcon: tabIcon('contacts') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '我的', tabBarIcon: tabIcon('user') }}
      />
    </Tab.Navigator>
  )
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: '登录' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: '注册' }} />
    </AuthStack.Navigator>
  )
}

function Routes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user ? (
        <RootStack.Navigator>
          <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <RootStack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
          <RootStack.Screen name="AddContact" component={AddContactScreen} options={{ title: '添加好友' }} />
          <RootStack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: '发起群聊' }} />
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AntProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </AntProvider>
    </SafeAreaProvider>
  )
}
