import {  useState } from 'react';
import './App.css'
import { Customize } from './Customize' 
import { Thoughtspot } from './Thoughtspot';
import { initialState } from './defaultStore';

function App() {
  const [customizations, setCustomizations] = useState<string>(JSON.stringify(initialState, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={"app"}>
      <Customize 
        setCustomizations={setCustomizations}
        error={error}
        setError={setError}
      />
      <main className={"main"}>
        <div className="embed-container">
            <Thoughtspot 
              key={customizations}
              customizations={customizations}
              setError={setError}
              thoughtSpotHost={import.meta.env.VITE_THOUGHTSPOT_HOST}
            />
        </div>
      </main>
    </div>
  )
}

export default App
