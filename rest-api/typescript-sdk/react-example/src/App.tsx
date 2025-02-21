import { BrowserRouter as Router, Routes, Route } from "react-router";
import { LoginPage } from "./pages/loginPage";
import { DashboardPage } from "./pages/dashboardPage";
import { Navigate } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

// needed for material-ui
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/cookie/dashboard"
            element={
              <ProtectedRoute cookieless={false}>
                <DashboardPage cookieless={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cookieless/dashboard"
            element={
              <ProtectedRoute cookieless={true}>
                <DashboardPage cookieless={true} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
