import ChatDrawer  from './components/ChatDrawer';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function ChatBotWrapper() {
  const [botId, setBotId] = useState('');
  const [user, setUserId] = useState(null);

  const params = useParams();

  useEffect(() => {
    setBotId(params.botId || 'cop28_gpt');

    let user_id = user || sessionStorage.getItem('user_id');

    if (user_id) {
      setUserId(user_id);
      return;
    }

    user_id = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('user_id', user_id);
    setUserId(user_id);
  }, [user, params.botId]);

  return (
    <ChatDrawer
      apiKey={process.env.REACT_APP_API_KEY}
      userId={user}
      botId={botId}
      showClose={false}
      thumbsDownMessage={
        "We are sorry we've not been able to answer your question.<br/> However, our dedicated support team is happy to help. <span class='feedback-link' style='cursor: pointer; text-decoration: underline; font-weight: 700; color: #17235B;'>Please click here</span> and a human agent will assist you as soon as possible"
      }
      thumbsUpMessage={`Glad I was able to help.

Please reach me again if you need further assistance.`}
      useOpenAi={true}
    ></ChatDrawer>
  );
}

export default ChatBotWrapper;
