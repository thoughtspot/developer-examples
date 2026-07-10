import "./App.css";
import tsLogo from "/ts-logo.svg";
import SearchUsersCard from "./components/SearchUsersCard.jsx";
import LiveboardsCard from "./components/LiveboardsCard.jsx";
import SpotterCard from "./components/SpotterCard.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-badge">
          <img src={tsLogo} alt="ThoughtSpot logo" className="app-logo" />
        </div>
        <div>
          <h1 className="app-title">ThoughtSpot C# SDK — Full-Stack Demo</h1>
          <p className="app-subtitle">ASP.NET Core backend + React frontend, wrapping thoughtspot_rest_api_sdk</p>
          <div className="app-pills">
            <span className="pill">C#</span>
            <span className="pill">ASP.NET Core</span>
            <span className="pill">React</span>
            <span className="pill">Server-Sent Events</span>
          </div>
        </div>
      </header>

      <SearchUsersCard />
      <LiveboardsCard />
      <SpotterCard />

      <footer className="app-footer">Built on thoughtspot_rest_api_sdk — see backend/Program.cs for the REST calls behind each card.</footer>
    </div>
  );
}
