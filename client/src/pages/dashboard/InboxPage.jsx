import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const InboxPage = () => {
  const { activeWorkspaceId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  const loadConversations = async () => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    setError("");

    try {
      const res = await API.get(`/inbox/workspace/${activeWorkspaceId}/conversations`);
      const data = res.data.data || [];
      setConversations(data);
      if (data.length > 0 && !selectedConversationId) {
        setSelectedConversationId(data[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      const res = await API.get(`/inbox/conversation/${conversationId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages");
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedConversationId) return;

    try {
      await API.post(`/inbox/conversation/${selectedConversationId}/reply`, {
        content: reply,
      });
      setReply("");
      await loadMessages(selectedConversationId);
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reply");
    }
  };

  return (
    <section>
      <h2 className="page-title">Inbox</h2>
      <p className="page-subtitle">Unified communication across customer conversations.</p>
      {error && <p className="error-text">{error}</p>}

      <div className="card spaced-top inbox-layout">
        <aside className="inbox-list">
          <h3>Conversations</h3>
          {loading ? (
            <p>Loading...</p>
          ) : conversations.length === 0 ? (
            <p>No conversations yet.</p>
          ) : (
            <div className="list-stack spaced-top">
              {conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  className={`inbox-thread${selectedConversationId === conversation._id ? " inbox-thread-active" : ""}`}
                  onClick={() => setSelectedConversationId(conversation._id)}
                >
                  <strong>{conversation.contact?.name || "Unknown contact"}</strong>
                  <span>{conversation.contact?.email || conversation.contact?.phone || "-"}</span>
                  <span>Unread: {conversation.unreadCount}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="inbox-messages">
          {!selectedConversation ? (
            <p>Select a conversation to view messages.</p>
          ) : (
            <>
              <h3>
                {selectedConversation.contact?.name || "Conversation"}
              </h3>

              <div className="message-list spaced-top">
                {messages.map((msg) => (
                  <article
                    key={msg._id}
                    className={`message-bubble ${msg.direction === "outbound" ? "message-outbound" : "message-inbound"}`}
                  >
                    <p>{msg.content}</p>
                    <small>
                      {msg.channel} | {msg.direction}
                    </small>
                  </article>
                ))}
              </div>

              <form className="row-gap spaced-top" onSubmit={sendReply}>
                <textarea
                  className="input"
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply"
                />
                <button className="primary-button" type="submit">
                  Send Reply
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default InboxPage;
