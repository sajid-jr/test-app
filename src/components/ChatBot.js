import React, { useState } from "react";
import ChatDrawer from "./ChatDrawer";

function ChatBot({
  apiKey,
  bgBubbleAi,
  bgBubbleUser,
  bgGradient,
  botId,
  closeButtonColor,
  dateTimeColor,
  eventName,
  formFieldBgColor,
  formFieldTextColor,
  gradientColors,
  messageTextColorAi,
  messageTextColorUser,
  onClickEvent,
  sendButtonColor,
  sendButtonTextColor,
  showClose,
  thumbsDownMessage,
  thumbsUpMessage,
  timezone,
  useOpenAi,
  user,
  userId,
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChatButtonClick = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  return (
    <>
      <button className="chat-button" onClick={handleChatButtonClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="white"
            d="M6 14h8v-2H6v2Zm0-3h12V9H6v2Zm0-3h12V6H6v2ZM2 22V4q0-.825.588-1.413T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.588 1.413T20 18H6l-4 4Zm3.15-6H20V4H4v13.125L5.15 16ZM4 16V4v12Z"
          />
        </svg>
      </button>
      {isDrawerOpen && (
        <ChatDrawer
          apiKey={apiKey}
          bgBubbleAi={bgBubbleAi}
          bgBubbleUser={bgBubbleUser}
          bgGradient={bgGradient}
          botId={botId}
          closeButtonColor={closeButtonColor}
          dateTimeColor={dateTimeColor}
          eventName={eventName}
          formFieldBgColor={formFieldBgColor}
          formFieldTextColor={formFieldTextColor}
          gradientColors={gradientColors}
          messageTextColorAi={messageTextColorAi}
          messageTextColorUser={messageTextColorUser}
          onClickEvent={onClickEvent}
          sendButtonColor={sendButtonColor}
          sendButtonTextColor={sendButtonTextColor}
          showClose={showClose}
          thumbsDownMessage={thumbsDownMessage}
          thumbsUpMessage={thumbsUpMessage}
          timezone={timezone}
          toggleDrawer={handleChatButtonClick}
          useOpenAi={useOpenAi}
          user={user}
          userId={userId}
        />
      )}
    </>
  );
}

export default ChatBot;
