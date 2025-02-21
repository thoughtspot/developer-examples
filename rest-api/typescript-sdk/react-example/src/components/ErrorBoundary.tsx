import React from "react";
import { Button, Container, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

const ErrorFallback = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Something went wrong
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{ mt: 2 }}
        >
          Back to Login
        </Button>
      </Box>
    </Container>
  );
};
