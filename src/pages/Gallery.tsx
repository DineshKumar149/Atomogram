import { useState, useEffect } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FeedPostItem from "@/components/gallery/FeedPostItem";
import StoriesBar from "@/components/stories/StoriesBar";
import StoryViewer from "@/components/stories/StoryViewer";
import CreateStory from "@/components/stories/CreateStory";

const PostSkeleton = () => (
  <div className="w-full flex flex-col gap-3 animate-pulse pt-2 pb-4">
    <div className="flex items-center gap-3 px-4">
      <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-32" />
        <div className="h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-24" />
      </div>
      <div className="w-6 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
    </div>
    <div className="w-full aspect-square md:aspect-[4/5] bg-neutral-200 dark:bg-neutral-800" />
    <div className="flex items-center gap-4 px-4 py-1">
      <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      <div className="flex-1" />
      <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
    </div>
    <div className="px-4 flex flex-col gap-2 mt-1">
      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md w-1/4" />
      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md w-3/4" />
    </div>
  </div>
);

const Gallery = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile Data
  const [profileData, setProfileData] = useState<any>(null);

  // Story States
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerGroups, setStoryViewerGroups] = useState<any[]>([]);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfileData(data);
    };

    const fetchFeed = async () => {
      setIsLoading(true);
      
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("status", "following");
      const followingIds = follows ? follows.map(f => f.following_id) : [];

      const { data: blocks } = await supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      const blockedIds = blocks ? blocks.map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id) : [];

      const { data, error } = await supabase
        .from("posts")
        .select(`*, profiles(display_name, avatar_url, username, is_private), post_likes(user_id), post_comments(id)`)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const visibleMedia = data.filter(item => {
           if (blockedIds.includes(item.user_id)) return false;
           if (item.user_id === user.id) return true;
           if (item.profiles?.is_private) {
              return followingIds.includes(item.user_id);
           }
           
           if (item.status === "scheduled" && item.scheduled_for && new Date(item.scheduled_for) > new Date()) {
             return false;
           }

           return true;
        });
        setMedia(visibleMedia);
      }
      setIsLoading(false);
    };

    const fetchSuggested = async () => {
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = follows ? follows.map(f => f.following_id) : [];
      followingIds.push(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .not("user_id", "in", `(${followingIds.map(id => `"${id}"`).join(",")})`)
        .limit(5);
      setSuggestedUsers(data || []);
    };

    fetchProfile();
    fetchFeed();
    fetchSuggested();
  }, [user]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-[1000px] mx-auto flex gap-16 pt-1 md:pt-8 px-0 md:px-4">
        
        {/* Main Feed Column */}
        <div className="flex-1 max-w-[630px] w-full mx-auto mob-feed-wrapper">
          {/* Stories Bar */}
          <div className="mb-2 bg-transparent p-0 border-none shadow-none">
            <StoriesBar
              onOpenViewer={(groups, idx) => { setStoryViewerGroups(groups); setStoryViewerIndex(idx); setStoryViewerOpen(true); }}
              onOpenCreate={() => setCreateStoryOpen(true)}
            />
          </div>

          {/* Feed Posts */}
          <div className="flex flex-col gap-0 md:gap-6 pb-20 md:pb-8">
            {isLoading ? (
              <div className="flex flex-col w-full gap-0 md:gap-6 mt-4 md:mt-0">
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : media.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center border border-border rounded-3xl transition-all w-full">
                <div className="p-8 rounded-full bg-foreground/5 mb-6"><ImageIcon className="w-16 h-16 text-foreground/50" /></div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground font-display">No posts yet</h3>
                <p className="text-sm text-muted-foreground font-medium mt-2">When you or others upload photos or videos, they will appear here.</p>
              </div>
            ) : (
              media
                .filter((item) => {
                  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
                  return isMobile ? item.media_type !== "video" : true;
                })
                .map((item) => (
                  <FeedPostItem key={item.id} item={item} currentUser={user} />
                ))
            )}
          </div>
        </div>

      </div>

      {storyViewerOpen && (
        <StoryViewer groups={storyViewerGroups} startGroupIndex={storyViewerIndex} onClose={() => setStoryViewerOpen(false)} />
      )}
      {createStoryOpen && (
        <CreateStory onClose={() => setCreateStoryOpen(false)} onCreated={() => setCreateStoryOpen(false)} />
      )}
    </div>
  );
};

export default Gallery;
