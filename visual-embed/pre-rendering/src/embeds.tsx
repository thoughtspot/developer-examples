import { AppEmbed } from "@thoughtspot/visual-embed-sdk/react"

const NormalEmbed = () => {
  return <AppEmbed className="embed-div" />
}

const PreRenderEmbed = () => {
  return <AppEmbed preRenderId={"pre-render"} className="embed-div" />
}

const PreRenderEmbedOnDemand = () => {
  return <AppEmbed preRenderId={"pre-render-on-demand"} className="embed-div" />
}

export { NormalEmbed, PreRenderEmbed, PreRenderEmbedOnDemand }

