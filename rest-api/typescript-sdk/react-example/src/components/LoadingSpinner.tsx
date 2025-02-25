import { Container, CircularProgress, Typography } from "@mui/material";

export const LoadingSpinner = () => (
  <Container maxWidth="sm" sx={{ mt: 4, textAlign: "center" }}>
    <CircularProgress />
    <Typography variant="h6" sx={{ mt: 2 }}>
      Loading...
    </Typography>
  </Container>
);
