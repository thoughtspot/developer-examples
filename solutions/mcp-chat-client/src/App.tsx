import { useState } from 'react'
import { useAuth } from './hooks/use-auth'
import './App.css'
import { SignInBtn } from './components/sign-in-btn'

function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <SignInBtn />;
  }

  return <div>Hello {user?.email}</div>;
}

export default App
