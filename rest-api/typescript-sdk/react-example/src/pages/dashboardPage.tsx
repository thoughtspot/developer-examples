import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  destroyThoughtSpotCookielessClient,
  getThoughtSpotCookielessClient,
} from "../thoughtspot-clients/cookielessClient";
import { getThoughtspotBasicClient } from "../thoughtspot-clients/basicClient";
import { UserCard } from "../components/UserCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Layout } from "../components/Layout";
import { UserDetails, MetadataInfo } from "../types/thoughtspot";

export const DashboardPage = ({ cookieless = false }) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const client = cookieless
    ? getThoughtSpotCookielessClient()
    : getThoughtspotBasicClient();

  if (!client) {
    navigate("/login");
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!client) return;
        const user = await client.getCurrentUserInfo();
        setUserDetails({
          name: user.name,
          email: user.email || "No email set",
          userStatus: user.account_status || "No status set",
        });

        // Fetch metadata
        const [liveboardsResponse, answersResponse] = await Promise.all([
          client.searchMetadata({
            metadata: [
              {
                type: "LIVEBOARD",
              },
            ],
            record_size: -1,
          }),
          client.searchMetadata({
            metadata: [
              {
                type: "ANSWER",
              },
            ],
            record_size: -1,
          }),
        ]);

        // Get recent items
        const recentItems = await client.searchMetadata({
          metadata: [
            {
              type: "LIVEBOARD",
            },
            {
              type: "ANSWER",
            },
          ],
          sort_options: {
            field_name: "MODIFIED",
          },
          record_size: 5,
        });

        setMetadata({
          totalLiveboards: liveboardsResponse.length || 0,
          totalAnswers: answersResponse.length || 0,
          recentItems:
            recentItems?.map((item) => ({
              id: item.metadata_id || "",
              name: item.metadata_name || "",
              type: item.metadata_type || "",
              description: item.metadata_detail || undefined,
            })) || [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [client, navigate]);

  const handleLogout = async () => {
    if (cookieless) {
      destroyThoughtSpotCookielessClient();
    } else {
      await client?.logout();
    }
    navigate("/login");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Layout>
      <UserCard
        userDetails={userDetails}
        metadata={metadata}
        cookieless={cookieless}
        isLoading={isLoading}
        onLogout={handleLogout}
      />
    </Layout>
  );
};
