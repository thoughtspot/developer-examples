import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/use-auth'
import './App.css'
import { SignInBtn } from './components/sign-in-btn'
import { Home } from './components/home/home';
import { OAuthCallback } from './components/oauth';

function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <SignInBtn />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App
