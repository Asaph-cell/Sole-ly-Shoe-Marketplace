import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  vendor_id: string;
  buyer_id: string | null;
  created_at: string;
  updated_at: string;
  last_message?: {
    message: string;
    created_at: string;
    is_read: boolean;
  };
  other_user?: {
    full_name: string | null;
    store_name: string | null;
  };
  unread_count: number;
}

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  isVendor: boolean;
}

export const ConversationList = ({ 
  onSelectConversation, 
  selectedConversationId,
  isVendor 
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Use guestId for unauthenticated users
      let currentUserId = user?.id as string | undefined;
      if (!currentUserId) {
        const existing = localStorage.getItem("guestId");
        currentUserId = existing || `guest:${crypto.randomUUID()}`;
        if (!existing) localStorage.setItem("guestId", currentUserId);
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(message, created_at, is_read, sender_id)
        `)
        .or(isVendor 
          ? `vendor_id.eq.${currentUserId}` 
          : `buyer_id.eq.${currentUserId}`
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithDetails = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = isVendor ? conv.buyer_id : conv.vendor_id;
          
          let otherUser = null;
          if (otherUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, store_name')
              .eq('id', otherUserId)
              .single();
            otherUser = profile;
          }

          const messages = conv.messages || [];
          const lastMessage = messages.length > 0 ? messages[0] : null;

          const unreadCount = messages.filter(
            (m: any) => !m.is_read && m.sender_id !== currentUserId
          ).length;

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMessage,
            unread_count: unreadCount
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Card
          key={conv.id}
          className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
            selectedConversationId === conv.id ? 'bg-accent' : ''
          }`}
          onClick={() => onSelectConversation(conv.id)}
        >
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarFallback>
                {conv.other_user?.full_name?.[0] || conv.other_user?.store_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold truncate">
                  {conv.other_user?.store_name || conv.other_user?.full_name || 'Unknown User'}
                </p>
                {conv.last_message && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <p className="text-sm text-muted-foreground truncate">
                  {conv.last_message.message}
                </p>
              )}
              {conv.unread_count > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {conv.unread_count} new
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
