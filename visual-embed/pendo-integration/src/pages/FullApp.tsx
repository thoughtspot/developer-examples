import Header from "../components/Header";
import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react";

// here we are embedding the fullApp with modular home experience enabled
function FullApp() {

    return (
        <>
            <Header title="FullApp Embed with Modular Home Experience" />
            {/* For our cluster we have put a guide near the watchlist in modular home experience. If you are using your own cluster, you can play around with any other type of embed with a different config creating your own guides. */}
            <div className="content-container">
                <p>Pendo is successfully enabled for this ThoughtSpot embed instance. You should see an info icon next to the Watchlist, this has been enabled through pendo dashboard.</p>
            </div>

            {/* we are embedding the fullApp with modular home experience enabled */}
            <div className="embed-container">
                <AppEmbed 
                    frameParams={{width:"1280px", height:"75vh"}}
                    modularHomeExperience={true}
                />
            </div>
        </>
    )
}

export default FullApp;