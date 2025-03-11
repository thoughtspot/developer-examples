import { Action, ConversationEmbed } from '@thoughtspot/visual-embed-sdk/react';

function ConverseWithDisable() {
  return (
    <>
      <a href="/">Home</a>
      <h1>Disable action</h1>
      <div className="spotter-container">
        <ConversationEmbed
          className='spotter-embed'
          worksheetId={import.meta.env.VITE_TS_DATASOURCE_ID}
          frameParams={{ width: '100%', height: '100%' }}
          disableSourceSelection
          disabledActions={[
            Action.PreviewDataSpotter,
            Action.ResetSpotterChat,
            Action.EditPreviousPrompt,
            Action.DeletePreviousPrompt,
            Action.Edit,
            Action.Share,
            Action.AnswerChartSwitcher,
            Action.Pin,
            Action.Save,
            Action.Download,
            Action.SpotterFeedback,
          ]}
          disabledActionReason="Pay the example's contributer to enable :P"
        />
      </div>
    </>
  );
}

export default ConverseWithDisable
