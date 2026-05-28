import { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Heart, Send, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import ShareDialog from "@/components/shared/ShareDialog";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profile?: Profile;
  has_viewed?: boolean;
}

interface StoryGroup {
  user_id: string;
  profile: Profile;
  stories: Story[];
  hasViewed: boolean;
}

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ groups, startGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  
  // Find first unread story in the initial group
  const initialGroup = groups[startGroupIndex];
  const firstUnreadIndex = initialGroup?.stories.findIndex(s => !s.has_viewed);
  const initialStoryIndex = firstUnreadIndex >= 0 ? firstUnreadIndex : 0;
  
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  // Likes map by story id
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  // Reply box
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Share Dialog
  const [shareOpen, setShareOpen] = useState(false);

  // Viewers and creator actions
  const [viewersCount, setViewersCount] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const markedRef = useRef<Set<string>>(new Set());

  // Swipe/Drag detection states
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number | null>(null);

  const activeGroup = groups[groupIndex];
  const currentStory = activeGroup?.stories[storyIndex];

  // Fetch viewers if this is my story
  useEffect(() => {
    if (activeGroup?.user_id === user?.id && currentStory) {
      const fetchViewers = async () => {
        const { data, count } = await supabase
          .from("story_views")
          .select("viewer_id, viewed_at, profiles!story_views_viewer_id_fkey(username, display_name, avatar_url)", { count: "exact" })
          .eq("story_id", currentStory.id)
          .order("viewed_at", { ascending: false });
        
        if (data) {
          setViewersList(data);
          setViewersCount(count || 0);
        }
      };
      fetchViewers();
    }
  }, [currentStory, activeGroup?.user_id, user?.id]);

  const handleDeleteStory = async () => {
    if (!currentStory || !user) return;
    try {
      setDeleting(true);
      setPaused(true);
      
      await supabase.from("stories").delete().eq("id", currentStory.id);
      
      try {
        const path = currentStory.media_url.split('/stories/')[1];
        if (path) {
          await supabase.storage.from("stories").remove([path]);
        }
      } catch (err) {
        console.error("Error deleting from storage", err);
      }
      
      toast({ title: "Story deleted" });
      onClose(); 
    } catch (e) {
      toast({ title: "Failed to delete story", variant: "destructive" });
      setDeleting(false);
      setPaused(false);
    }
  };

  // Swipe/Drag detection states
  const dragStartXRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const markViewed = useCallback(
    async (story: Story) => {
      if (!user || !story || markedRef.current.has(story.id)) return;
      if (story.user_id === user.id) return;
      markedRef.current.add(story.id);
      await supabase.from("story_views").upsert(
        { story_id: story.id, viewer_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: "story_id,viewer_id" }
      );
    },
    [user]
  );

  const goNextStory = useCallback(() => {
    clearTimer();
    elapsedRef.current = 0;
    setProgress(0);

    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      const nextGroup = groups[groupIndex + 1];
      const nextUnread = nextGroup.stories.findIndex(s => !s.has_viewed);
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(nextUnread >= 0 ? nextUnread : 0);
    } else {
      onClose();
    }
  }, [clearTimer, storyIndex, activeGroup?.stories.length, groupIndex, groups.length, onClose]);

  const goPrevStory = useCallback(() => {
    clearTimer();
    elapsedRef.current = 0;
    setProgress(0);

    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }, [clearTimer, storyIndex, groupIndex, groups]);

  const startTimer = useCallback(() => {
    clearTimer();
    if (currentStory?.media_type === "video") return;
    
    startTimeRef.current = Date.now() - elapsedRef.current;

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      elapsedRef.current = elapsed;
      setProgress(pct);

      if (elapsed >= STORY_DURATION) {
        clearTimer();
        elapsedRef.current = 0;
        goNextStory();
      }
    }, 50);
  }, [clearTimer, goNextStory, currentStory?.media_type]);

  useEffect(() => {
    if (currentStory) {
      markViewed(currentStory);
    }
  }, [currentStory, markViewed]);

  useEffect(() => {
    if (!paused && !shareOpen && !viewersOpen) {
      if (currentStory?.media_type === "video") {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }
      startTimer();
    } else {
      clearTimer();
      if (currentStory?.media_type === "video" && videoRef.current) {
        videoRef.current.pause();
      }
    }

    return () => clearTimer();
  }, [paused, storyIndex, groupIndex, startTimer, clearTimer, currentStory?.media_type, shareOpen, viewersOpen]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (shareOpen) return;
      if (e.key === "ArrowRight") goNextStory();
      if (e.key === "ArrowLeft") goPrevStory();
      if (e.key === "Escape") onClose();
      if (e.key === " ") setPaused((p) => !p);
    },
    [goNextStory, goPrevStory, onClose, shareOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid taps on bottom bar or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest(".interactive-zone")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrevStory();
    } else {
      goNextStory();
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !activeGroup || sendingReply) return;
    setSendingReply(true);

    try {
      const { data: convId, error: convError } = await supabase.rpc("get_or_create_dm", {
        _other_user: activeGroup.user_id,
      });

      if (convError || !convId) {
        console.error("Error creating DM for story reply:", convError);
        return;
      }

      await supabase.from("messages").insert({
        conversation_id: convId as string,
        user_id: user.id,
        content: `Reply to Story: ${replyText.trim()}`,
        media_type: "text",
      });

      setReplyText("");
      toast({
        title: "Reply Sent",
        description: `Your reply has been sent directly to ${
          activeGroup.profile?.username || "user"
        }.`,
      });
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleLikeStory = async () => {
    if (!user || !currentStory || !activeGroup) return;
    const storyId = currentStory.id;
    const isCurrentlyLiked = likedStories[storyId];

    setLikedStories((prev) => ({
      ...prev,
      [storyId]: !isCurrentlyLiked,
    }));

    if (!isCurrentlyLiked) {
      // Send DM: ❤️ Liked your story
      try {
        const { data: convId } = await supabase.rpc("get_or_create_dm", {
          _other_user: activeGroup.user_id,
        });
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId as string,
            user_id: user.id,
            content: "❤️ Liked your story",
            media_type: "text",
          });
        }

        // Also add notifications record if they are different users
        if (activeGroup.user_id !== user.id) {
          await supabase.from("notifications").insert({
            recipient_id: activeGroup.user_id,
            sender_id: user.id,
            type: "like",
            content: currentStory.id,
          });
        }
      } catch (err) {
        console.error("Error liking story:", err);
      }
    }
  };

  const getInitials = (profile?: Profile) => {
    if (!profile) return "?";
    const name = profile.display_name || profile.username || "?";
    return name.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (profile?: Profile) => {
    if (!profile) return "User";
    return profile.username || profile.display_name || "User";
  };

  const getSafeDate = (dateStr: string) => {
    if (!dateStr) return "recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "recently";
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  // Swipe & Touch Gestures

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".interactive-zone")) return;
    
    if ('touches' in e) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartXRef.current = (e as React.MouseEvent).clientX;
      touchStartYRef.current = (e as React.MouseEvent).clientY;
    }
    
    touchStartTimeRef.current = Date.now();
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      setPaused(false);
      return;
    }
    
    const target = e.target as HTMLElement;
    if (target.closest(".interactive-zone")) {
      setPaused(false);
      return;
    }

    let touchEndX: number;
    let touchEndY: number;

    if ('changedTouches' in e) {
      touchEndX = (e as React.TouchEvent).changedTouches[0].clientX;
      touchEndY = (e as React.TouchEvent).changedTouches[0].clientY;
    } else {
      touchEndX = (e as React.MouseEvent).clientX;
      touchEndY = (e as React.MouseEvent).clientY;
    }

    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;
    const duration = touchStartTimeRef.current ? Date.now() - touchStartTimeRef.current : 0;

    // Swipe down to close
    if (diffY > 100 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose();
      return;
    }

    // Minimum swipe distance for horizontal swipe (changing user group)
    if (Math.abs(diffX) > 50) {
      if (diffX < 0) {
        // Swipe Left -> Next group
        if (groupIndex < groups.length - 1) {
          const nextGroup = groups[groupIndex + 1];
          const nextUnread = nextGroup.stories.findIndex(s => !s.has_viewed);
          setGroupIndex((g) => g + 1);
          setStoryIndex(nextUnread >= 0 ? nextUnread : 0);
        } else {
          onClose(); // Auto close if it's the last group
        }
      } else {
        // Swipe Right -> Prev group
        if (groupIndex > 0) {
          const prevGroup = groups[groupIndex - 1];
          const prevUnread = prevGroup.stories.findIndex(s => !s.has_viewed);
          setGroupIndex((g) => g - 1);
          setStoryIndex(prevUnread >= 0 ? prevUnread : 0);
        }
      }
    } else if (duration < 250) {
      // It's a quick tap (navigate within group)
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touchEndX - rect.left;
      if (x < rect.width * 0.3) {
        goPrevStory();
      } else {
        goNextStory();
      }
    }
    
    setPaused(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchStartTimeRef.current = null;
  };

  if (!activeGroup || !currentStory) return null;

  const prevGroup = groups[groupIndex - 1];
  const nextGroup = groups[groupIndex + 1];

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center select-none"
      style={{ zIndex: 500 }}
    >
      {/* Top Left Atome Branding / Logo */}
      <div className="absolute top-6 left-6 text-white font-bold text-xl tracking-wide select-none cursor-pointer hidden md:block z-50">
        Atome
      </div>

      {/* Top Right Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all z-50 pointer-events-auto cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 3-Card Layout Flex Box */}
      <div className="flex items-center justify-center gap-6 md:gap-14 w-full h-[100dvh] md:max-w-[95vw] md:h-[80vh] relative">
        {/* Left Floating Chevron (Group prev) */}
        {groupIndex > 0 && (
          <button
            onClick={() => {
              setGroupIndex((g) => g - 1);
              setStoryIndex(0);
            }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all z-40 hidden md:flex cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}

        {/* 1. LEFT CARD (PREVIOUS USER PREVIEW) */}
        {prevGroup && (
          <div
            onClick={() => {
              setGroupIndex(groupIndex - 1);
              setStoryIndex(0);
            }}
            className="hidden lg:block w-[140px] xl:w-[220px] h-[240px] xl:h-[380px] rounded-xl overflow-hidden opacity-35 scale-[0.8] origin-right transition-all duration-300 cursor-pointer hover:opacity-50 select-none flex-shrink-0 relative border border-white/10"
          >
            {prevGroup.stories[0].media_type === "video" ? (
              <video
                src={prevGroup.stories[0].media_url}
                className="w-full h-full object-cover pointer-events-none"
                muted
                playsInline
              />
            ) : (
              <img
                src={prevGroup.stories[0].media_url}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
              <Avatar className="w-12 h-12 border-2 border-white/20">
                <AvatarImage src={prevGroup.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-neutral-800 text-white text-sm font-bold">
                  {getInitials(prevGroup.profile)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-xs font-semibold mt-2.5 max-w-full truncate">
                {getDisplayName(prevGroup.profile)}
              </span>
            </div>
          </div>
        )}

        {/* 2. CENTER CARD (ACTIVE STORY USER) */}
        <div
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-[100dvh] md:h-full md:max-w-[400px] md:rounded-2xl overflow-hidden md:border border-white/15 bg-black flex flex-col justify-between shadow-2xl transition-all duration-300 scale-100 z-30"
        >
          {/* Progress indicators */}
          <div className={`absolute top-3.5 inset-x-3.5 flex gap-1 pointer-events-none z-40 transition-opacity duration-200 ${paused ? "opacity-0" : "opacity-100"}`}>
            {activeGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white transition-none"
                  style={{
                    width:
                      i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* User info top row */}
          <div className={`absolute top-6 left-4 right-4 flex items-center justify-between z-40 transition-opacity duration-200 ${paused ? "opacity-0" : "opacity-100"}`}>
            <div className="flex items-center gap-2.5 pointer-events-none">
              <div className="p-[2px] rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-purple-600">
                <Avatar className="w-8 h-8 border border-black">
                  <AvatarImage src={activeGroup.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-neutral-900 text-white text-[10px] font-bold">
                    {getInitials(activeGroup.profile)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-semibold text-xs leading-none drop-shadow-md">
                  {getDisplayName(activeGroup.profile)}
                </span>
                <span className="text-white/60 text-[10px] mt-0.5 leading-none drop-shadow-md">
                  {getSafeDate(currentStory.created_at)}
                </span>
              </div>
            </div>

            {/* Mute toggle button */}
            <div className="flex items-center gap-2.5 interactive-zone">
              {currentStory.media_type === "video" && (
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all cursor-pointer pointer-events-auto"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Active Story Media body */}
          <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
            {currentStory.media_type === "video" ? (
              <video
                ref={videoRef}
                key={currentStory.id}
                src={currentStory.media_url}
                className="w-full h-full object-cover select-none pointer-events-none"
                autoPlay
                playsInline
                muted={muted}
                onEnded={goNextStory}
                onTimeUpdate={(e) => {
                  const v = e.target as HTMLVideoElement;
                  if (v.duration) {
                    setProgress((v.currentTime / v.duration) * 100);
                  }
                }}
              />
            ) : (
              <img
                key={currentStory.id}
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            )}

            {/* Top and Bottom Gradients overlay */}
            <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${paused ? "opacity-0" : "opacity-100"}`} />
            <div className={`absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${paused ? "opacity-0" : "opacity-100"}`} />

            {/* Caption Text overlay */}
            {currentStory.caption && (
              <div className={`absolute bottom-20 inset-x-4 pointer-events-none z-30 transition-opacity duration-200 ${paused ? "opacity-0" : "opacity-100"}`}>
                <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg text-center max-w-full truncate-3-lines">
                  {currentStory.caption}
                </p>
              </div>
            )}
          </div>

          {/* Footer Interactive bar */}
          <div className={`px-4 py-3.5 bg-black border-t border-white/10 flex items-center gap-3.5 z-40 interactive-zone transition-opacity duration-200 ${paused ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            {activeGroup.user_id === user?.id ? (
              <>
                <button
                  onClick={() => setViewersOpen(true)}
                  className="flex items-center gap-2 text-white hover:text-white/80 transition-colors cursor-pointer"
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-sm font-semibold">{viewersCount} Viewers</span>
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleDeleteStory}
                  disabled={deleting}
                  className="p-2 text-white/80 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {/* Reply pill input */}
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder={`Reply to ${getDisplayName(activeGroup.profile)}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="w-full bg-[#1c1c1e] text-white border border-white/15 rounded-full py-2 pl-4 pr-10 text-xs placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#0095f6] transition-all"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendingReply}
                    className="absolute right-3 text-[#0095f6] hover:text-[#1877f2] disabled:opacity-0 transition-opacity cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Like and Share buttons */}
                <button
                  onClick={handleLikeStory}
                  className="hover:scale-105 active:scale-95 transition-transform text-white cursor-pointer"
                >
                  <Heart
                    className={`w-[22px] h-[22px] ${
                      likedStories[currentStory.id] ? "fill-red-500 text-red-500 scale-110" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShareOpen(true)}
                  className="hover:scale-105 active:scale-95 transition-transform text-white cursor-pointer"
                >
                  <svg
                    aria-label="Share"
                    className="text-white fill-current"
                    height="22"
                    viewBox="0 0 24 24"
                    width="22"
                  >
                    <line
                      fill="none"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      x1="22"
                      x2="9.218"
                      y1="3"
                      y2="10.083"
                    ></line>
                    <polygon
                      fill="none"
                      points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    ></polygon>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3. RIGHT CARD (NEXT USER PREVIEW) */}
        {nextGroup && (
          <div
            onClick={() => {
              setGroupIndex(groupIndex + 1);
              setStoryIndex(0);
            }}
            className="hidden lg:block w-[140px] xl:w-[220px] h-[240px] xl:h-[380px] rounded-xl overflow-hidden opacity-35 scale-[0.8] origin-left transition-all duration-300 cursor-pointer hover:opacity-50 select-none flex-shrink-0 relative border border-white/10"
          >
            {nextGroup.stories[0].media_type === "video" ? (
              <video
                src={nextGroup.stories[0].media_url}
                className="w-full h-full object-cover pointer-events-none"
                muted
                playsInline
              />
            ) : (
              <img
                src={nextGroup.stories[0].media_url}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
              <Avatar className="w-12 h-12 border-2 border-white/20">
                <AvatarImage src={nextGroup.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-neutral-800 text-white text-sm font-bold">
                  {getInitials(nextGroup.profile)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-xs font-semibold mt-2.5 max-w-full truncate">
                {getDisplayName(nextGroup.profile)}
              </span>
            </div>
          </div>
        )}

        {/* Right Floating Chevron (Group next) */}
        {groupIndex < groups.length - 1 && (
          <button
            onClick={() => {
              setGroupIndex((g) => g + 1);
              setStoryIndex(0);
            }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all z-40 hidden md:flex cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Share Dialog Overlay */}
      {shareOpen && (
        <ShareDialog
          onClose={() => setShareOpen(false)}
          sharedPost={{
            type: "story",
            post_id: currentStory.id,
            media_url: currentStory.media_url,
            caption: currentStory.caption || "",
            author_username: activeGroup.profile?.username || "user",
            author_display_name: activeGroup.profile?.display_name || activeGroup.profile?.username || "User",
            author_avatar: activeGroup.profile?.avatar_url || "",
            author_id: activeGroup.profile?.user_id || "",
            is_video: currentStory.media_type === "video",
          }}
        />
      )}

      {/* Viewers List Overlay */}
      {viewersOpen && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 bg-background rounded-t-3xl shadow-2xl z-50 flex flex-col pointer-events-auto border-t border-border overflow-hidden md:w-[400px] md:left-1/2 md:-translate-x-1/2 md:top-auto md:h-[60vh] md:rounded-3xl md:bottom-20">
          <div className="flex items-center justify-between p-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10">
            <h3 className="font-bold flex items-center gap-2 text-foreground">
              <Eye className="w-5 h-5" />
              Viewers ({viewersCount})
            </h3>
            <button
              onClick={() => setViewersOpen(false)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {viewersList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-10">
                <Eye className="w-12 h-12 mb-3 opacity-20" />
                <p>No viewers yet</p>
              </div>
            ) : (
              viewersList.map((viewer: any) => (
                <div key={viewer.viewer_id} className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border border-border/50">
                    <AvatarImage src={viewer.profiles?.avatar_url} />
                    <AvatarFallback>{(viewer.profiles?.display_name || viewer.profiles?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="font-semibold text-[15px] text-foreground truncate">
                      {viewer.profiles?.username || viewer.profiles?.display_name || "User"}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {viewer.profiles?.display_name && viewer.profiles?.username ? viewer.profiles.display_name : ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {getSafeDate(viewer.viewed_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
