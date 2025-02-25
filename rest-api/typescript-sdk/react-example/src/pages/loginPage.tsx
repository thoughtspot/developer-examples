/**
 * Login page component that handles user authentication.
 * On successful login, redirects to the dashboard page.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  TextField,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Stack,
  Button,
} from "@mui/material";
import { getThoughtspotBasicClient } from "../thoughtspot-clients/basicClient";
import { 
  destroyThoughtSpotAuthenticatedClient,
  getThoughtSpotAuthenticatedClient,
  initializeThoughtSpotAuthenticatedClient,
} from "../thoughtspot-clients/authenticatedClient";
import { Layout } from "../components/Layout";

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleLogin = async (useCookie: boolean) => {
    try {
      setIsLoading(true);
      setError(null);

      if (useCookie) {
        await getThoughtspotBasicClient().login(credentials);
      } else {
        initializeThoughtSpotAuthenticatedClient(credentials);
        const client = getThoughtSpotAuthenticatedClient();
        await client?.getCurrentUserInfo();
      }

      navigate(useCookie ? "/cookie/dashboard" : "/cookieless/dashboard");
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
      console.error("Login error:", err);
      destroyThoughtSpotAuthenticatedClient();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Card sx={{ width: "100%" }}>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center">
            Welcome to ThoughtSpot
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={credentials.username}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              margin="normal"
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              name="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              margin="normal"
              disabled={isLoading}
            />

            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 3 }}
              justifyContent="center"
            >
              <Button
                variant="contained"
                onClick={() => handleLogin(false)}
                disabled={isLoading}
              >
                Token Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleLogin(true)}
                disabled={isLoading}
              >
                Cookie Login
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Layout>
  );
};
