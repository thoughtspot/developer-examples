import { init } from '@thoughtspot/visual-embed-sdk/react';
import { AuthType } from '@thoughtspot/visual-embed-sdk';
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Converse from './pages/Converse';
import ConverseWithDisable from './pages/ConverseWithDisable';
import ConverseWithSearch from './pages/ConverseWithSearch';
import ConverseWithHidden from './pages/ConverseWithHidden';
import ConverseAsJSEmbed from './pages/ConverseAsJSEmbed';

init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.None,
});
  
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/converse" element={<Converse />} />
          <Route path="/converseWithSearch" element={<ConverseWithSearch />} />
          <Route path="/converseWithDisable" element={<ConverseWithDisable />} />
          <Route path="/converseWithHidden" element={<ConverseWithHidden />} />
          <Route path="/converseAsJSEmbed" element={<ConverseAsJSEmbed />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App
