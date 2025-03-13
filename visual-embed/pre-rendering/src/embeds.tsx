import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react"

/**
 * This will re-render the thoughtspot instance every time user visits this.
 */
const NormalEmbed = () => {
  return <AppEmbed className="embed-div" />
}

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
  return <AppEmbed preRenderId={"pre-render"} className="embed-div" />
}

/**
 * This will start loading the thoughtspot embed as soon as  
 * this components is rendered and users may see a loader
 * But all the subsequent visit to this will show the already loaded instance.
 */
const PreRenderEmbedOnDemand = () => {
  return <AppEmbed preRenderId={"pre-render-on-demand"} className="embed-div" />
}

export { NormalEmbed, PreRenderEmbed, PreRenderEmbedOnDemand }

