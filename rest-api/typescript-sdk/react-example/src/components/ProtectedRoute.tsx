import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getThoughtspotBasicClient } from "../thoughtspot-clients/basicClient";
import { getThoughtSpotCookielessClient } from "../thoughtspot-clients/cookielessClient";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  cookieless?: boolean;
}

export const ProtectedRoute = ({
  children,
  cookieless = false,
}: ProtectedRouteProps) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const client = cookieless
          ? getThoughtSpotCookielessClient()
          : getThoughtspotBasicClient();

        if (!client) {
          navigate("/login");
          return;
        }

        await client.getCurrentUserInfo();
      } catch (error) {
        navigate("/login");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [navigate, cookieless]);

  if (isVerifying) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};
