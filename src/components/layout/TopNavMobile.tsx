import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { supabase } from "@/integrations/supabase/client";
import NotificationPanel from "@/components/shared/NotificationPanel";

const TopNavMobile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { total: unreadTotal } = useChatUnread();
  
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchUnreadNotifs = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    setUnreadNotifsCount(count || 0);
  };

  useEffect(() => {
    fetchUnreadNotifs();

    if (user) {
      const ch = supabase
        .channel(`topnav-notif-${user.id}-${Math.random().toString(36).substr(2, 9)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, fetchUnreadNotifs)
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
      };
    }
  }, [user]);

  const openNotifications = async () => {
    setIsNotifOpen(true);
    setUnreadNotifsCount(0);
    if (user) {
      await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    }
  };

  if (!user) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] md:hidden"
        style={{
          background: "var(--mob-nav-bg, hsla(0,0%,100%,0.97))",
          backdropFilter: "blur(20px) saturate(200%)",
          WebkitBackdropFilter: "blur(20px) saturate(200%)",
          borderBottom: "1px solid hsla(0,0%,0%,0.08)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-[52px]">
          {/* Left: Logo */}
          <Link 
            to="/gallery" 
            onClick={(e) => {
              if (window.location.pathname === '/gallery') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center"
          >
            <span style={{
              fontSize: 26, fontWeight: 700,
              fontFamily: "'Billabong','Dancing Script',cursive,sans-serif", letterSpacing: "0.2px",
            }} className="text-foreground mt-1">
              Atome
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-5">
            {/* Notifications */}
            <button
              onClick={openNotifications}
              className="relative transition-transform active:scale-90"
            >
              <Heart className="w-6 h-6 text-foreground" strokeWidth={1.8} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-background">
                  {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Messages */}
            <button
              onClick={() => navigate("/chat")}
              className="relative transition-transform active:scale-90"
            >
              <Send className="w-6 h-6 text-foreground transform -rotate-12" strokeWidth={1.8} />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-background">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};

export default TopNavMobile;
