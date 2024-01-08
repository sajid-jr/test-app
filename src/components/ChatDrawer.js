import fetchStream from "fetch-readablestream";
import React, { useEffect, useRef, useState } from "react";
import { formatNow, formatTimeStamps } from "../utils/date";

import ChatMessage from "./ChatMessage";

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
  const [temperature, setTemperature] = useState(0);

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
          "Content-Type": "application/json",
          "x-api-key": apiKey,
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
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ user_id: userId, bot_id: botId }),
      }).then((response) => {
        setLoading(false);

        if (response.status === 200) {
          response.json().then((data) => {
            if (data && data.length) {
              const history = [];
              data.forEach((item) => {
                history.push({
                  type: "user",
                  message: item.User,
                  time: formatTimeStamps(timezone, item.Timestamp),
                });

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
        "x-api-key": apiKey,
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
          console.log("All suggestion: ", allSuggestions)
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
    console.log("All suggestions: ", allSuggestions)

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
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
              <ul className="chatType">
                <li>
                  <button className="active">
                    <small>More</small>
                    <span>Creative</span>
                  </button>
                </li>
                <li>
                  <button>
                    <small>More</small>
                    <span>Balanced</span>
                  </button>
                </li>
                <li>
                  <button>
                    <small>More</small>
                    <span>Precise</span>
                  </button>
                </li>
              </ul>
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
                        idx !== 0 &&
                        idx === chatLog.length - 1 &&
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
                    <div className="cta_suggestions">
                      {
                        chat?.suggestions?.map((suggestion, idx) => {
                          return <button key={`sugge_btn_${idx}`}> {suggestion}</button>

                        })
                      }
                    </div>
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
              <input
                className="form-control"
                name=""
                id=""
                value={input}
                placeholder="Type your query here..."
                onChange={handleChange}
                style={{
                  color: formFieldTextColor ? "" : " ",
                  background: formFieldBgColor ? "" : " ",
                }}
              ></input>
              <div className="cta-footer">
                <button
                  type="submit"
                  className="btn cta-chat"
                  style={{
                    color: sendButtonColor ? "" : " ",
                    background: !sendButtonTextColor ? "" : " ",
                  }}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatDrawer;
