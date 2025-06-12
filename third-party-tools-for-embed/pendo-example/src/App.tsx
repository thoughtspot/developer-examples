import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from './pages/Home'
import { init, AuthType } from '@thoughtspot/visual-embed-sdk'
import FullApp from './pages/FullApp';

console.log(import.meta.env.VITE_THOUGHTSPOT_HOST, "host")
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.None,
  customVariablesForThirdPartyTools: {
    pendoKey: import.meta.env.VITE_PENDO_KEY,
    hostName: import.meta.env.VITE_THOUGHTSPOT_HOST,
  },
})
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/fullapp" element={<FullApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
