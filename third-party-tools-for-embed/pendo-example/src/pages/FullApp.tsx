import Header from "../components/Header";
import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react";

function FullApp() {

    return (
        <>
            <Header title="FullApp Embed with Modular Home Experience" />
            <div className="content-container">
                <p>Pendo is successfully enabled for this ThoughtSpot embed instance. You should see an info icon next to the Watchlist, this has been enabled through pendo dashboard.</p>
            </div>
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