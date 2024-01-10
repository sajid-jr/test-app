import fetchStream from "fetch-readablestream";
import React, { useEffect, useRef, useState } from "react";
import { formatNow, formatTimeStamps } from "../utils/date";
import { TbShieldCheck } from "react-icons/tb"
import ChatMessage from "./ChatMessage";
import { IoSend } from "react-icons/io5";

const decoder = new TextDecoder();

function ChatDrawer({
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
  messageTextColorAi,
  messageTextColorUser,
  onClickEvent,
  sendButtonColor,
  sendButtonTextColor,
  showClose,
  thumbsDownMessage,
  thumbsUpMessage,
  timezone,
  toggleDrawer,
  useOpenAi,
  user,
  userId,
}) {
  const bottomRef = useRef(null);
  const greeting = useRef("");
  const submitOnChange = useRef(false);

  const [input, setInput] = useState("");
  const [botName, setBotName] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [temperature, setTemperature] = useState(1);

  const changeTemperature = (newTemperature) => {
    if (loading) return;
    setTemperature(newTemperature);

    // Remove existing theme classes from body
    document.body.classList.remove('creative', 'balanced', 'precise');

    // Add appropriate theme class to body based on temperature
    switch (newTemperature) {
      case 0:
        document.body.classList.add('creative');
        break;
      case 1:
        document.body.classList.add('balanced');
        break;
      case 2:
        document.body.classList.add('precise');
        break;
      default:
        break;
    }
  };
  useEffect(() => {
    changeTemperature(temperature);
  }, []);
  const fetchData = async (command) => {
    try {
      const prompt = command || input;
      setLoading(true);

      const url =
        `${process.env.REACT_APP_API_URL}/bot/ask-kb` +
        (useOpenAi === false ? "/llm-hf" : "");

      fetchStream(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query: prompt,
          user_id: userId,
          bot_id: botId,
          temperature,
        }),
      }).then((response) => {
        readAllChunks(response.body);
      });
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchHistory = () => {
    try {
      setLoading(true);

      const url = `${process.env.REACT_APP_API_URL}/bot/history`;

      fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ user_id: userId, bot_id: botId }),
      }).then((response) => {
        setLoading(false);

        if (response.status === 200) {
          response.json().then((data) => {
            if (data && data.length) {
              const history = [];
              data.forEach((item) => {
                if (history.length > 0) {
                  history.push({
                    type: "user",
                    message: item.User,
                    time: formatTimeStamps(timezone, item.Timestamp),
                  });
                }

                history.push({
                  type: "ai",
                  message: item.AI,
                  time: formatTimeStamps(timezone, item.Timestamp),
                });
              });

              setChatLog((prev) => [...prev, ...history]);
            } else {
              fetchData("#INIT");
              // setChatLog((prev) => [
              //   ...prev,
              //   {
              //     type: 'ai',
              //     message: greeting.current || 'Hi, how can I help you today?',
              //     time: formatNow(timezone),
              //   },
              // ]);
            }
          });
        }
      });
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchSmallTalk = () => {
    setLoading(true);

    const url = `${process.env.REACT_APP_API_URL}/bot/small-talk/${botId}/${userId}`;

    fetch(url, {
      method: "GET",
      headers: {
        'x-api-key': apiKey,
      },
    })
      .then((response) => {
        if (response.status === 200) {
          response.json().then((data) => {
            if (data && data.smallTalk) {
              setChatLog((prev) => [
                ...prev,
                {
                  type: "ai",
                  message: data.smallTalk,
                  time: formatTimeStamps(timezone, new Date()),
                },
              ]);
            }
          });
        }
      })
      .catch((error) =>
        console.error("Error while fetching small talk:", error)
      )
      .finally(() => setLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    submitUserPrompt();
  };

  const readAllChunks = (stream) => {
    const reader = stream.getReader();
    const allSuggestions = []

    function pump() {
      return reader.read().then(({ value, done }) => {
        if (done) {
          if (allSuggestions.length) {
            setChatLog((prevLog) => {
              const nextLog = prevLog.map((x) => ({ ...x }));
              nextLog.push({
                type: 'suggestions',
                suggestions: allSuggestions
              })
              return nextLog;
            })
          }
          setLoading(false);
          // fetchSmallTalk();
          return;
        }

        let decodedChunk = decoder.decode(value, { stream: true });
        setChatLog((prevLog) => {
          const nextLog = prevLog.map((x) => ({ ...x }));

          const lastItem = nextLog[nextLog.length - 1];
          if (lastItem?.type === "ai") {
            const suggestionsMatch = decodedChunk.match(/<sug>(.*?)<\/sug>/g);
            if (suggestionsMatch) {
              suggestionsMatch.forEach((match) => {
                decodedChunk = decodedChunk.replace(match, "");
                allSuggestions.push(match?.replace(/<\/?sug>/g, ""));
              });
            }
            lastItem.message = `${lastItem.message}${decodedChunk}`;
          } else {
            nextLog.push({
              type: "ai",
              message: decodedChunk,
              time: formatNow(timezone),
            });
          }
          return nextLog;
        });

        return pump();
      });
    }

    return pump();
  };

  const sendPromptMessage = (prompt) => {
    submitOnChange.current = true;
    setInput(prompt);
  };

  const submitFeedback = (flag) => {
    setLoading(true);

    const url = `${process.env.REACT_APP_API_URL}/bot/feedback`;

    fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        user_id: userId,
        flag,
      }),
    })
      .then(() => {
        if (flag) {
          setChatLog((prev) => [
            ...prev,
            {
              type: "ai",
              isFeedbackMessage: true,
              message:
                thumbsUpMessage ||
                "Great. May I assist you with anything else?",
              time: formatNow(timezone),
            },
          ]);

          return;
        }

        setChatLog((prev) => [
          ...prev,
          {
            type: "ai",
            isFeedbackMessage: true,
            message:
              thumbsDownMessage ||
              "I did not understand. Would you please try asking again?",
            time: formatNow(timezone),
          },
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const submitUserPrompt = () => {
    if (loading || !input) {
      return;
    }

    setChatLog((prev) => [
      ...prev,
      {
        type: "user",
        message: input,
        time: formatNow(timezone),
      },
    ]);

    setInput("");

    fetchData();
  };

  useEffect(() => {
    if (!botId || !userId) {
      return;
    }

    fetch(`${process.env.REACT_APP_API_URL}/bot/config?bot_id=${botId}`)
      .then((response) => response.json())
      .then((data) => {
        setBotName(data.name);
        greeting.current = data.greeting;
        setQuickPrompts(data.quickPrompts);

        fetchHistory();
      })
      .catch((error) => console.error("Error:", error));
  }, [botId, userId]);

  useEffect(() => {
    if (submitOnChange.current) {
      submitUserPrompt();
      submitOnChange.current = false;
    }
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const handleChange = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else {
      setInput(e.target.value);
    }
  };


  return (
    <>
      <div className={`drawer-main active`}>
        <div className="drawer-overlay" onClick={toggleDrawer}></div>
        <div
          className="chat-wrapper"
          style={{
            background: `linear-gradient(${bgGradient ? bgGradient.join(", ") : ""
              })`,
          }}
        >
          {showClose !== false && (
            <div className="chat-header">
              <button
                className="closeIcon"
                onClick={toggleDrawer}
                style={{ background: closeButtonColor ? "" : "" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="chat-main">

            <div className="innerChat">
              <div className="title">
                <h2><span> EventsGPT  <i>

                  <svg width="30" height="30" viewBox="0 0 106 105" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M52.8578 104.318C52.8645 104.32 52.8713 104.323 52.878 104.325V104.311C74.7711 96.9781 115.49 69.0948 103.537 16.0875C79.9227 8.17267 59.9557 2.08167 52.878 0.0118542V0C52.8713 0.0019722 52.8645 0.00394726 52.8578 0.00592613C52.851 0.00394726 52.8442 0.0019722 52.8375 0V0.0118542C45.7599 2.08167 25.7928 8.17267 2.17802 16.0875C-9.77459 69.0948 30.9444 96.9781 52.8375 104.311V104.325C52.8442 104.323 52.851 104.32 52.8578 104.318Z" fill="#E2F6FA" />
                    <path d="M52.8409 95.3002V9.02441C58.6643 10.7266 75.2028 15.7706 94.7694 22.3286C104.66 66.1922 70.9382 89.2528 52.8409 95.3002Z" fill="url(#paint0_linear_174_9166)" />
                    <rect x="63.725" y="21.0347" width="2.275" height="29.6903" rx="1.1375" transform="rotate(-73.8316 63.725 21.0347)" fill="url(#paint1_linear_174_9166)" />
                    <path d="M52.8745 95.3002V9.02441C47.0511 10.7266 30.5127 15.7706 10.9461 22.3286C1.0553 66.1922 34.7772 89.2528 52.8745 95.3002Z" fill="url(#paint2_linear_174_9166)" />
                    <path d="M67.1131 34.3431L43.2493 56.165C41.5673 57.7031 41.5085 60.3337 43.1202 61.9454L68.0846 86.9097C69.4975 88.3227 71.7364 88.4762 73.3289 87.2693L89.8566 74.7444C90.8029 74.0273 91.3817 72.9269 91.4364 71.7409L91.7769 64.3639C91.8163 63.5106 91.5814 62.667 91.1067 61.9568L73.138 35.0723C71.7767 33.0355 68.9209 32.6899 67.1131 34.3431Z" fill="url(#paint3_linear_174_9166)" />
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M68.6302 31.8839C69.0923 31.6059 69.6441 31.5177 70.1698 31.6379C70.6955 31.758 71.1542 32.0771 71.4497 32.5282L73.5143 35.6772C73.7834 36.0886 73.8986 36.5818 73.8394 37.0698C73.7803 37.5579 73.5506 38.0093 73.191 38.3445L73.1848 38.3528L73.1556 38.3799L73.0367 38.4905L72.5675 38.9388C69.9711 41.4572 67.4535 44.0555 65.0183 46.7299C60.4366 51.7683 54.9958 58.3624 51.3338 64.7604C50.3119 66.5456 47.8157 66.9293 46.335 65.3882L32.8111 51.3366C32.6173 51.1352 32.466 50.8968 32.3661 50.6357C32.2663 50.3746 32.2199 50.0961 32.2298 49.8168C32.2398 49.5374 32.3057 49.2629 32.4239 49.0095C32.542 48.7562 32.7098 48.5292 32.9175 48.342L37.0049 44.6549C37.3641 44.3311 37.8247 44.1422 38.3078 44.1205C38.7909 44.0988 39.2666 44.2457 39.6534 44.5361L46.554 49.71C57.3335 39.0806 63.4459 35.0016 68.6302 31.8839Z" fill="url(#paint4_linear_174_9166)" />
                    <defs>
                      <linearGradient id="paint0_linear_174_9166" x1="74.6954" y1="9.02441" x2="74.6954" y2="95.3002" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#6EC6E3" />
                        <stop offset="1" stop-color="#5361C7" />
                      </linearGradient>
                      <linearGradient id="paint1_linear_174_9166" x1="64.8625" y1="21.0347" x2="64.2597" y2="43.0438" gradientUnits="userSpaceOnUse">
                        <stop stop-color="white" stop-opacity="0.47" />
                        <stop offset="1" stop-color="white" stop-opacity="0" />
                      </linearGradient>
                      <linearGradient id="paint2_linear_174_9166" x1="31.02" y1="9.02441" x2="31.02" y2="95.3002" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#5F8ED4" />
                        <stop offset="1" stop-color="#4F54C3" />
                      </linearGradient>
                      <linearGradient id="paint3_linear_174_9166" x1="54.7875" y1="42.5752" x2="75.425" y2="71.3377" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#5975CC" />
                        <stop offset="1" stop-color="#0043A6" stop-opacity="0" />
                      </linearGradient>
                      <linearGradient id="paint4_linear_174_9166" x1="40.8125" y1="66.3502" x2="73.8" y2="66.3502" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#D0F0F7" />
                        <stop offset="1" stop-color="white" />
                      </linearGradient>
                    </defs>
                  </svg>
                </i> </span></h2>
                <p>AI-powered <span>copilot</span> for events</p>
              </div>



              {chatLog.length > 0 && <div className="chatType">
                <h4 className="labelChat">Choose a conversation style</h4>
                <ul>
                  <li onClick={() => changeTemperature(0)}>
                    <button className={temperature === 0 ? "active" : ""}>
                      More Creative
                    </button>
                  </li>
                  <li onClick={() => changeTemperature(1)}>
                    <button className={temperature === 1 ? "active" : ""}>
                      More Balanced
                    </button>
                  </li>
                  <li onClick={() => changeTemperature(2)}>
                    <button className={temperature === 2 ? "active" : ""}>
                      More Precise
                    </button>
                  </li>
                </ul>
              </div>}
              {chatLog?.map((chat, idx) => {
                return (
                  <React.Fragment key={`chat_${idx}`}>
                    {chat.message && <ChatMessage
                      bgBubbleAi={bgBubbleAi}
                      bgBubbleUser={bgBubbleUser}
                      botName={botName}
                      chat={chat}
                      dateTimeColor={dateTimeColor}
                      isLastResponse={
                        !loading &&
                        idx !== 0 &&
                        idx === chatLog.length - 2 && //Subtracting -2 because suggestions will be on last index
                        chat?.type === "ai"
                      }
                      key={`chat_${idx}`}
                      messageTextColorAi={messageTextColorAi}
                      messageTextColorUser={messageTextColorUser}
                      sendButtonTextColor={sendButtonTextColor}
                      downVote={() => submitFeedback(false)}
                      upVote={() => submitFeedback(true)}
                      onClickEvent={onClickEvent}
                    />}
                    {chat?.suggestions?.length > 0 && <div >

                      <h4 className="labelChat ">Here are some things EventsGPT Copilot can help you do:</h4>
                      <div className="cta_suggestions">
                        {
                          chat?.suggestions?.map((suggestion, idx) => {
                            return <button onClick={() => sendPromptMessage(suggestion)} key={`sugge_btn_${idx}`}> {suggestion}</button>

                          })
                        }
                      </div>
                    </div>}
                    {idx === 0 &&
                      quickPrompts?.map((prompt, idx) => (
                        <div className="cta-faqs" key={`quick_prompt_${idx}`}>
                          <div
                            className="cta"
                            onClick={() => sendPromptMessage(prompt.prompt)}
                          >
                            Q. {prompt.text}
                          </div>
                        </div>
                      ))}
                  </React.Fragment>
                );
              })}

              <div id="last-div" ref={bottomRef}></div>
            </div>
          </div>
          <div className="chat-footer">
            <form onSubmit={handleSubmit}>
              {loading && (
                <div className="chat-main ">
                  <div className="py-0">
                    <div className="chat ai">
                      <div className="chat-box">
                        <div className="message">
                          <div className="loading">
                            <div className="spinner">
                              <div className="bounce1"></div>
                              <div className="bounce2"></div>
                              <div className="bounce3"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="chatFooterWrapper">
                <div className="text-center">
                  <div className="note">
                    <i>    <svg width="30" height="30" viewBox="0 0 106 105" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M52.8578 104.318C52.8645 104.32 52.8713 104.323 52.878 104.325V104.311C74.7711 96.9781 115.49 69.0948 103.537 16.0875C79.9227 8.17267 59.9557 2.08167 52.878 0.0118542V0C52.8713 0.0019722 52.8645 0.00394726 52.8578 0.00592613C52.851 0.00394726 52.8442 0.0019722 52.8375 0V0.0118542C45.7599 2.08167 25.7928 8.17267 2.17802 16.0875C-9.77459 69.0948 30.9444 96.9781 52.8375 104.311V104.325C52.8442 104.323 52.851 104.32 52.8578 104.318Z" fill="#E2F6FA" />
                      <path d="M52.8409 95.3002V9.02441C58.6643 10.7266 75.2028 15.7706 94.7694 22.3286C104.66 66.1922 70.9382 89.2528 52.8409 95.3002Z" fill="url(#paint0_linear_174_9166)" />
                      <rect x="63.725" y="21.0347" width="2.275" height="29.6903" rx="1.1375" transform="rotate(-73.8316 63.725 21.0347)" fill="url(#paint1_linear_174_9166)" />
                      <path d="M52.8745 95.3002V9.02441C47.0511 10.7266 30.5127 15.7706 10.9461 22.3286C1.0553 66.1922 34.7772 89.2528 52.8745 95.3002Z" fill="url(#paint2_linear_174_9166)" />
                      <path d="M67.1131 34.3431L43.2493 56.165C41.5673 57.7031 41.5085 60.3337 43.1202 61.9454L68.0846 86.9097C69.4975 88.3227 71.7364 88.4762 73.3289 87.2693L89.8566 74.7444C90.8029 74.0273 91.3817 72.9269 91.4364 71.7409L91.7769 64.3639C91.8163 63.5106 91.5814 62.667 91.1067 61.9568L73.138 35.0723C71.7767 33.0355 68.9209 32.6899 67.1131 34.3431Z" fill="url(#paint3_linear_174_9166)" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M68.6302 31.8839C69.0923 31.6059 69.6441 31.5177 70.1698 31.6379C70.6955 31.758 71.1542 32.0771 71.4497 32.5282L73.5143 35.6772C73.7834 36.0886 73.8986 36.5818 73.8394 37.0698C73.7803 37.5579 73.5506 38.0093 73.191 38.3445L73.1848 38.3528L73.1556 38.3799L73.0367 38.4905L72.5675 38.9388C69.9711 41.4572 67.4535 44.0555 65.0183 46.7299C60.4366 51.7683 54.9958 58.3624 51.3338 64.7604C50.3119 66.5456 47.8157 66.9293 46.335 65.3882L32.8111 51.3366C32.6173 51.1352 32.466 50.8968 32.3661 50.6357C32.2663 50.3746 32.2199 50.0961 32.2298 49.8168C32.2398 49.5374 32.3057 49.2629 32.4239 49.0095C32.542 48.7562 32.7098 48.5292 32.9175 48.342L37.0049 44.6549C37.3641 44.3311 37.8247 44.1422 38.3078 44.1205C38.7909 44.0988 39.2666 44.2457 39.6534 44.5361L46.554 49.71C57.3335 39.0806 63.4459 35.0016 68.6302 31.8839Z" fill="url(#paint4_linear_174_9166)" />
                      <defs>
                        <linearGradient id="paint0_linear_174_9166" x1="74.6954" y1="9.02441" x2="74.6954" y2="95.3002" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#6EC6E3" />
                          <stop offset="1" stop-color="#5361C7" />
                        </linearGradient>
                        <linearGradient id="paint1_linear_174_9166" x1="64.8625" y1="21.0347" x2="64.2597" y2="43.0438" gradientUnits="userSpaceOnUse">
                          <stop stop-color="white" stop-opacity="0.47" />
                          <stop offset="1" stop-color="white" stop-opacity="0" />
                        </linearGradient>
                        <linearGradient id="paint2_linear_174_9166" x1="31.02" y1="9.02441" x2="31.02" y2="95.3002" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#5F8ED4" />
                          <stop offset="1" stop-color="#4F54C3" />
                        </linearGradient>
                        <linearGradient id="paint3_linear_174_9166" x1="54.7875" y1="42.5752" x2="75.425" y2="71.3377" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#5975CC" />
                          <stop offset="1" stop-color="#0043A6" stop-opacity="0" />
                        </linearGradient>
                        <linearGradient id="paint4_linear_174_9166" x1="40.8125" y1="66.3502" x2="73.8" y2="66.3502" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#D0F0F7" />
                          <stop offset="1" stop-color="white" />
                        </linearGradient>
                      </defs>
                    </svg></i>
                    <span className="flex-1">Your personal or company information is kept private and secure within this chat.  </span>
                  </div>
                </div>
                <div className="chatFields">
                  <div className="flex-1">
                    <input
                      className="form-control"
                      name=""
                      id=""
                      value={input}
                      placeholder="Ask me anything related to events..."
                      onChange={handleChange}
                      style={{
                        color: formFieldTextColor ? "" : " ",
                        background: formFieldBgColor ? "" : " ",
                      }}
                    ></input>
                  </div>
                  <div className="cta-footer">
                    <button
                      type="submit"
                      className="btn cta-chat"
                      style={{
                        color: sendButtonColor ? "" : " ",
                        background: !sendButtonTextColor ? "" : " ",
                      }}
                    >
                      <IoSend />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatDrawer;
