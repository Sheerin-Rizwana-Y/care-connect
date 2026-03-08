import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Send, MessageSquare, AlertTriangle, Image } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    const targetUser = searchParams.get('user');
    const targetName = searchParams.get('name');
    if (targetUser) {
      const conv = conversations.find(c => c.other_user_id === targetUser);
      if (conv) {
        setActiveConv(conv);
      } else {
        // Start a new conversation context (no existing messages yet)
        setActiveConv({
          conversation_id: 'new_' + targetUser,
          other_user_id: targetUser,
          other_user_name: targetName || 'User',
          last_message: '',
          unread_count: 0,
          isNew: true,
        });
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (activeConv && !activeConv.isNew) fetchMessages(activeConv.other_user_id);
    else if (activeConv?.isNew) setMessages([]);
  }, [activeConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await messagingAPI.getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await messagingAPI.getMessages(userId);
      setMessages(res.data);
      setConversations(prev => prev.map(c =>
        c.other_user_id === userId ? {...c, unread_count: 0} : c
      ));
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv) return;
    setSending(true);
    try {
      await messagingAPI.sendMessage({ receiver_id: activeConv.other_user_id, content: newMessage.trim() });
      setNewMessage('');
      fetchMessages(activeConv.other_user_id);
      // After first message in new conv, refresh conversations list and update active
      if (activeConv.isNew) {
        await fetchConversations();
      } else {
        fetchConversations();
      }
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleImageSend = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const formData = new FormData();
    formData.append('image', file);
    setSending(true);
    try {
      await messagingAPI.sendImage(activeConv.other_user_id, formData);
      fetchMessages(activeConv.other_user_id);
      fetchConversations();
      toast.success('Image sent');
    } catch { toast.error('Failed to send image'); }
    finally {
      setSending(false);
      e.target.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversations List */}
      <div className="w-72 flex-shrink-0 card flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 p-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageSquare size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-300 text-xs mt-1">Contact a seller or finder to start chatting</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button key={conv.conversation_id} onClick={() => setActiveConv(conv)}
                className={`w-full p-4 flex gap-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50
                  ${activeConv?.conversation_id === conv.conversation_id ? 'bg-primary-50' : ''}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {conv.other_user_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm truncate">{conv.other_user_name}</p>
                    {conv.unread_count > 0 && (
                      <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true }) : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card flex flex-col">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {activeConv.other_user_name?.[0]?.toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900">{activeConv.other_user_name}</p>
              <div className="ml-auto">
                <button
                  onClick={async () => {
                    const reason = prompt('Reason for reporting this message:');
                    if (!reason) return;
                    try {
                      const lastMsg = messages[messages.length - 1];
                      await messagingAPI.reportMessage(lastMsg.id, reason);
                      toast.success('Report submitted to administrators');
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'Failed to report message');
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Report conversation"
                >
                  <AlertTriangle size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => {
                const isSent = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className={isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="sent" className="max-w-[200px] rounded-lg mb-1 object-cover" />
                      )}
                      {msg.content && msg.content !== '📷 Image' && (
                        <p className="text-sm">{msg.content}</p>
                      )}
                      <p className={`text-xs mt-1 ${isSent ? 'text-white/60' : 'text-gray-400'}`}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                        {isSent && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                {/* Image attach button */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sending}
                  className="p-2 text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0"
                  title="Send image"
                >
                  <Image size={20} />
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSend} />

                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... (Enter to send)"
                  rows={1}
                  className="input-field flex-1 resize-none"
                />
                <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                  className="btn-primary px-4 flex-shrink-0 flex items-center justify-center">
                  <Send size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                🔒 Messages are private. Never share personal contact info.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare size={36} className="text-primary-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Select a Conversation</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Choose a conversation from the left, or contact someone from a marketplace listing or lost & found item.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}