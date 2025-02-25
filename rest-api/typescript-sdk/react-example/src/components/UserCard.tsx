import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
} from "@mui/material";
import { UserDetails, MetadataInfo } from "../types/thoughtspot";

interface UserCardProps {
  userDetails: UserDetails | null;
  metadata: MetadataInfo | null;
  cookieless: boolean;
  isLoading: boolean;
  onLogout: () => void;
}

export const UserCard = ({
  userDetails,
  metadata,
  cookieless,
  isLoading,
  onLogout,
}: UserCardProps) => (
  <Card sx={{ width: "100%" }}>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Dashboard
        </Typography>
        <Chip
          label={cookieless ? "Token Auth" : "Cookie Auth"}
          color={cookieless ? "primary" : "secondary"}
          variant="outlined"
        />
      </Box>

      <Typography variant="h5" gutterBottom>
        Welcome, {userDetails?.name}
      </Typography>

      <Box sx={{ my: 3 }}>
        {Object.entries(userDetails || {}).map(([key, value]) => (
          <Box key={key} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Typography>
            <Typography variant="body1">{value}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        ThoughtSpot Overview
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Box
            sx={{
              textAlign: "center",
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
            }}
          >
            <Typography variant="h4" color="primary">
              {metadata?.totalLiveboards || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Liveboards
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              textAlign: "center",
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
            }}
          >
            <Typography variant="h4" color="primary">
              {metadata?.totalAnswers || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Answers
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        Recent Items
      </Typography>
      <List>
        {metadata?.recentItems.map((item) => (
          <ListItem key={item.id} sx={{ px: 0 }}>
            <ListItemText
              primary={item.name}
              secondary={
                <>
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    {item.type.toLowerCase()}
                  </Typography>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.description}
                    </Typography>
                  )}
                </>
              }
            />
          </ListItem>
        ))}
      </List>

      <Button
        variant="contained"
        color="secondary"
        fullWidth
        onClick={onLogout}
        disabled={isLoading}
        sx={{ mt: 3 }}
      >
        {isLoading ? "Logging out..." : "Logout"}
      </Button>
    </CardContent>
  </Card>
);
