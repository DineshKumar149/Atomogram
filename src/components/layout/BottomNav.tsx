import { Home, Compass, PlaySquare, PlusSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface BottomNavProps {
  onOpenCreate: () => void;
}

const BottomNav = ({ onOpenCreate }: BottomNavProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfileData(data);
    };
    fetchProfile();
  }, [user]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  if (!user) return null;

  const avatarUrl = profileData?.avatar_url || user?.user_metadata?.avatar_url || "";
  const displayName = profileData?.display_name || "U";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden"
      style={{
        background: "var(--mob-nav-bg, hsla(0,0%,100%,0.97))",
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
        borderTop: "1px solid hsla(0,0%,0%,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">

        {/* Home */}
        <Link to="/gallery" className="flex flex-col items-center gap-0.5 p-2 min-w-[52px] transition-transform active:scale-90">
          <Home
            className={`w-6 h-6 transition-all ${isActive("/gallery") ? "text-foreground" : "text-muted-foreground"}`}
            strokeWidth={isActive("/gallery") ? 2.5 : 1.8}
          />
        </Link>

        {/* Explore */}
        <Link to="/explore" className="flex flex-col items-center gap-0.5 p-2 min-w-[52px] transition-transform active:scale-90">
          <Compass
            className={`w-6 h-6 transition-all ${isActive("/explore") ? "text-foreground" : "text-muted-foreground"}`}
            strokeWidth={isActive("/explore") ? 2.5 : 1.8}
          />
        </Link>

        {/* Create */}
        <button
          onClick={onOpenCreate}
          className="flex flex-col items-center gap-0.5 p-2 min-w-[52px] transition-transform active:scale-90"
        >
          <PlusSquare
            className="w-6 h-6 text-muted-foreground hover:text-foreground transition-all"
            strokeWidth={1.8}
          />
        </button>

        {/* Reels */}
        <Link to="/reels" className="flex flex-col items-center gap-0.5 p-2 min-w-[52px] transition-transform active:scale-90">
          <PlaySquare
            className={`w-6 h-6 transition-all ${isActive("/reels") ? "text-foreground" : "text-muted-foreground"}`}
            strokeWidth={isActive("/reels") ? 2.5 : 1.8}
          />
        </Link>



        {/* Profile */}
        <Link to="/profile" className="flex flex-col items-center gap-0.5 p-2 min-w-[52px] transition-transform active:scale-90">
          <Avatar className={`w-7 h-7 ring-2 transition-all ${isActive("/profile") ? "ring-foreground ring-offset-1 ring-offset-background" : "ring-transparent"}`}>
            <AvatarImage src={avatarUrl} className="object-cover" />
            <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-bold">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

      </div>
    </nav>
  );
};

export default BottomNav;
