import { useEffect, useRef } from "react";
import {
  init,
  EmbedEvent,
  tokenizedFetch,
  AuthType,
  Page,
} from "@thoughtspot/visual-embed-sdk";
import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Set up the ThoughtSpot host URL
// This can be configured in the .env file or defaults to the training instance
const tsHost =
  import.meta.env.VITE_THOUGHTSPOT_HOST || "https://training.thoughtspot.cloud";

// Initialize the ThoughtSpot SDK with authentication details
// This sets up the connection to your ThoughtSpot instance
init({
  thoughtSpotHost: tsHost,
  // Use basic authentication (username/password)
  authType: AuthType.Basic,
  // Get credentials from environment variables
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
});

function App() {
  // Create a reference to store the ThoughtSpot embed instance
  // This allows us to interact with the embedded ThoughtSpot instance
  const embedRef = useRef<any>(null);

  // Function to handle route changes
  const handleRouteChange = async (e: { data: { currentPath: string } }) => {
    // Get the new path the user has navigated to
    const newPath = e.data.currentPath;

    // Check if the user is viewing a liveboard
    // Liveboard URLs contain "/pinboard/" in their path
    // In a tabbed liveboard, the event is triggered twice:
    // 1. First with /pinboard/<pinboardId>
    // 2. Then with /pinboard/<pinboardId>/tab/<tabId>
    // We only want to process the first event
    if (newPath.includes("/pinboard/") && !newPath.includes("/tab/")) {
      console.log("newPath", newPath);

      // Extract the liveboard ID from the URL
      // Example URL: https://host/#/insights/pinboard/123-456
      const pathIds = newPath.split("/pinboard/")[1];
      const pinboardId = pathIds.split("/")[0];

      // Prepare the API endpoint to fetch liveboard metadata
      // This will give us information about the liveboard
      const apiLink = tsHost + "/api/rest/2.0/metadata/search";

      // Make an API call to ThoughtSpot to get liveboard details
      // We use the SDK's tokenizedFetch to handle authentication automatically
      const apiResponse = await tokenizedFetch(apiLink, {
        // Use POST method as required by the ThoughtSpot API
        method: "POST",

        // Set the content type to JSON
        // This tells the server we're sending JSON data
        headers: {
          "Content-type": "application/json",
        },

        // Convert our request data to JSON format
        // This is required for sending data to the server
        body: JSON.stringify({
          metadata: [
            {
              // Send the liveboard ID to get its details
              identifier: pinboardId,
            },
          ],
        }),
      });

      // Convert the API response from JSON to JavaScript object
      const apiResult = await apiResponse.json();

      // Extract the liveboard name from the response
      // This is what we'll show to the user
      const liveboardName = apiResult[0]?.metadata_name;

      // Show a success toast notification to the user
      // This provides feedback about which liveboard they're viewing
      toast("Opening : " + liveboardName, { type: "success" });
    }
  };

  // This effect runs when the component mounts
  useEffect(() => {
    if (!embedRef.current) return;

    // Set up a listener for when users navigate within ThoughtSpot
    // This helps us track which liveboard users are viewing
    embedRef.current.on(EmbedEvent.RouteChange, handleRouteChange);

    // Cleanup function to remove the event listener when component unmounts
    return () => {
      if (embedRef.current) {
        embedRef.current.off(EmbedEvent.RouteChange, handleRouteChange);
      }
    };
  }, []); // Empty dependency array means this effect runs only once when the component mounts

  // Render the main application UI
  return (
    <>
      {/* Container for toast notifications */}
      <ToastContainer />
      {/* The main ThoughtSpot embed component */}
      {/* This displays the ThoughtSpot interface in your application */}
      <AppEmbed
        frameParams={{ height: "100vh", width: "100%" }}
        ref={embedRef}
        pageId={Page.Liveboards}
      />
    </>
  );
}

export default App;
