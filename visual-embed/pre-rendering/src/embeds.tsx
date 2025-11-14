import { AppEmbed, LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

/**
 * This will re-render the thoughtspot instance every time user visits this.
 */
const NormalEmbed = () => {
  return <AppEmbed className="embed-div" />;
};

/**
 * This will start loading the thoughtspot embed as soon as
 * <PreRenderedAppEmbed preRenderId={"pre-render"} /> is rendered
 *
 * The actual embed will only show up when <AppEmbed preRenderId={"pre-render"} /> is rendered
 *
 * The will ensure when user views this its already loaded, and all the subsequent visit to this
 * will show the already loaded instance.
 *
 */
const PreRenderEmbed = () => {
  return <AppEmbed preRenderId={"pre-render"} className="embed-div" />;
};

/**
 * This will start loading the thoughtspot embed as soon as
 * this components is rendered and users may see a loader
 * But all the subsequent visit to this will show the already loaded instance.
 */
const PreRenderEmbedOnDemand = () => {
  return (
    <AppEmbed preRenderId={"pre-render-on-demand"} className="embed-div" />
  );
};


const PreRenderLiveboardWithLiveboardId = () => {
  return (
    <LiveboardEmbed
      preRenderId={"pre-render-with-liveboard-id"}
      liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
      className="embed-div"
    />
  );
};

/**
 * Pre-Renders a generic Embed when the
 * <PreRenderedLiveboardEmbed preRenderId='pre-render-without-liveboard-id' /> 
 * is rendered. 
 * The liveboardId is passed when the Embed is rendered and we navigate to the liveboard. 
 * Since this is a generic pre-render we just load the basic assets needed for rendering the app, 
 * this might not be as fast as pre-rendering with liveboardId but it is faster than normal rendering.
 */
const PreRenderLiveboardWithoutLiveboardId_1 = () => {
  return (
    <LiveboardEmbed
      preRenderId={"pre-render-without-liveboard-id"}
      liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
      className="embed-div"
    />
  );
};

/**
 * This is same as above but we can reuse the same pre-render shell here.
 */
const PreRenderLiveboardWithoutLiveboardId_2 = () => {
  return (
    <LiveboardEmbed
      preRenderId={"pre-render-without-liveboard-id"}
      liveboardId="b504e160-3025-4508-a76a-1beb1f4b5eed"
      className="embed-div"
    />
  );
};


/**
 *  Normal Render is the default behavior of the ThoughtSpot SDK. 
 * Loads the ThoughtSpot app when the component is rendered.
 */
const NormalLiveboardEmbed = () => {
  return (
    <LiveboardEmbed
      className="embed-div"
      liveboardId="b504e160-3025-4508-a76a-1beb1f4b5eed"
    />
  );
};

export {
  NormalEmbed,
  PreRenderEmbed,
  PreRenderEmbedOnDemand,
  PreRenderLiveboardWithLiveboardId,
  PreRenderLiveboardWithoutLiveboardId_1,
  PreRenderLiveboardWithoutLiveboardId_2,
  NormalLiveboardEmbed
};
