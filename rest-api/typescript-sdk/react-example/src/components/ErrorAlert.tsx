import { Container, Alert, Button } from "@mui/material";

interface ErrorAlertProps {
  error: string;
  onBackToLogin: () => void;
}

export const ErrorAlert = ({ error, onBackToLogin }: ErrorAlertProps) => (
  <Container maxWidth="sm" sx={{ mt: 4 }}>
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
    <Button variant="contained" onClick={onBackToLogin}>
      Back to Login
    </Button>
  </Container>
);
