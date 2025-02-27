import {  useState } from 'react';
import './App.css'
import { SideBar } from './components/SideBar'
import { Embed } from './components/Embed'
import styles from './App.module.css'
import { initialState } from './store';
import { thoughtSpotHost, dataSourceId, vizId, LiveboardId } from './constants';
import { EmbedType } from './types';

function App() {
  const [embedType, setEmbedType] = useState<EmbedType>(EmbedType.FullApp);
  const [customizations, setCustomizations] = useState<string>(JSON.stringify(initialState, null, 2));
  const [dataSource, setDataSourceId] = useState(dataSourceId);
  const [answerId, setVizId] = useState(vizId);
  const [liveboard, setLiveboardId] = useState(LiveboardId);
  const [error, setError] = useState<string | null>(null);
  

  return (
    <div className={styles.app}>
      <SideBar 
        embedType={embedType} 
        setEmbedType={setEmbedType}
        setCustomizations={setCustomizations}
        dataSource={dataSource}
        answerId={answerId}
        liveboard={liveboard}
        setDataSource={setDataSourceId}
        setAnswerId={setVizId}
        setLiveboard={setLiveboardId}
        error={error}
        setError={setError}
      />
      <main className={styles.main}>
        <div className="embed-container">
            <Embed 
              key={customizations}
              customizations={customizations}
              thoughtSpotHost={thoughtSpotHost}
              embedType={embedType}
              dataSource={dataSource}
              answerId={answerId}
              liveboard={liveboard}
              setError={setError}

            />
        </div>
      </main>
    </div>
  )
}

export default App
