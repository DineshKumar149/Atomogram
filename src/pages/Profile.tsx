import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, ArrowLeft, Image as ImageIcon, Plus, Link as LinkIcon,
  MessageCircle, Grid3X3, Bookmark, User, X, MoreHorizontal,
  Camera, CheckCircle2, ShieldOff, Shield, PlaySquare, Contact, Lock,
  Menu, Settings as SettingsIcon, Activity, LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// ImageCropper removed — post editing now uses CESDKEditor via PostGridItem
import { Input } from "@/components/ui/input";
import PostGridItem from "@/components/profile/PostGridItem";
import PostDetailModal from "@/components/profile/PostDetailModal";
import FollowingPopup from "@/components/profile/FollowingPopup";
import EditProfileModal from "@/components/profile/EditProfileModal";
import FollowersModal from "@/components/profile/FollowersModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StoryViewer from "@/components/stories/StoryViewer";
import CreateStory from "@/components/stories/CreateStory";
import { isAdminUser } from "@/lib/admin";

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOwnProfile = !id || id === user?.id;
  const profileId = id || user?.id;
  const isAdmin = isAdminUser(user?.email);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [uploadedPosts, setUploadedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved" | "tagged">("posts");

  const [postCaption, setPostCaption] = useState("");
  const [postUploading, setPostUploading] = useState(false);
  const [pendingPostImage, setPendingPostImage] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

  const [isBlockedByTarget, setIsBlockedByTarget] = useState(false);
  const [hasBlockedTarget, setHasBlockedTarget] = useState(false);

  const [followStatus, setFollowStatus] = useState<"none" | "following" | "pending">("none");
  const [isFollowedBack, setIsFollowedBack] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowingPopup, setShowFollowingPopup] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState<"followers" | "following" | null>(null);

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [storyViewerStories, setStoryViewerStories] = useState<any[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);

  const fetchUserPosts = useCallback(async () => {
    if (!profileId) return;
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });
    if (posts) setUploadedPosts(posts);
  }, [profileId]);

  const fetchFollowCounts = useCallback(async () => {
    if (!profileId) return;
    const { count: fwrs } = await supabase
      .from("user_follows")
      .select("id", { count: "exact" })
      .eq("following_id", profileId)
      .eq("status", "following");
    setFollowersCount(fwrs || 0);

    const { count: fwing } = await supabase
      .from("user_follows")
      .select("id", { count: "exact" })
      .eq("follower_id", profileId)
      .eq("status", "following");
    setFollowingCount(fwing || 0);

    if (user && !isOwnProfile) {
      const { data: followRow } = await supabase
        .from("user_follows")
        .select("id, status")
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
        .maybeSingle();
      if (followRow) {
        setFollowStatus(followRow.status === "pending" ? "pending" : "following");
      } else {
        setFollowStatus("none");
      }

      // Check if B follows user (for Follow Back!)
      const { data: followedBackRow } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", profileId)
        .eq("following_id", user.id)
        .eq("status", "following")
        .maybeSingle();
      setIsFollowedBack(!!followedBackRow);
    }
  }, [profileId, user, isOwnProfile]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      setLoading(true);

      let blockedByT = false;
      let hasBlockedT = false;

      if (!isOwnProfile && user) {
        const { data: block1 } = await supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", profileId)
          .eq("blocked_id", user.id)
          .maybeSingle();
        blockedByT = !!block1;
        setIsBlockedByTarget(blockedByT);

        const { data: block2 } = await supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", profileId)
          .maybeSingle();
        hasBlockedT = !!block2;
        setHasBlockedTarget(hasBlockedT);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", profileId)
        .maybeSingle();
      setProfileData(profile);

      const now = new Date().toISOString();
      const { count: storyCount } = await supabase
        .from("stories")
        .select("id", { count: "exact" })
        .eq("user_id", profileId)
        .gt("expires_at", now);
      setHasStory((storyCount || 0) > 0);

      if (isOwnProfile) {
        const savedIds = user?.user_metadata?.saved_posts || [];
        if (savedIds.length > 0) {
          const { data: posts } = await supabase.from("posts").select("*").in("id", savedIds);
          setSavedPosts(posts || []);
        } else {
          setSavedPosts([]);
        }
      } else if (user && !blockedByT && !hasBlockedT) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingViews } = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_id", profileId)
          .eq("sender_id", user.id)
          .eq("type", "view_feed")
          .gt("created_at", twentyFourHoursAgo)
          .limit(1);

        if (!existingViews || existingViews.length === 0) {
          await supabase.from("notifications").insert({
            recipient_id: profileId,
            sender_id: user.id,
            type: "view_feed",
          });
        }
      }

      if (!blockedByT) await fetchUserPosts();
      else setUploadedPosts([]);

      await fetchFollowCounts();
      setLoading(false);
    };

    fetchProfile();
  }, [profileId, user, isOwnProfile, fetchUserPosts, fetchFollowCounts]);

  useEffect(() => {
    if (!profileId) return;
    const ch = supabase
      .channel(`profile-follows-${profileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_follows" }, fetchFollowCounts)
      .subscribe();
      
    const postsCh = supabase
      .channel(`profile-posts-${profileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${profileId}` }, fetchUserPosts)
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
      supabase.removeChannel(postsCh);
    };
  }, [profileId, fetchFollowCounts, fetchUserPosts]);

  const handleToggleFollow = async () => {
    if (!user || !profileId) return;
    if (followStatus === "following") {
      setShowFollowingPopup(true);
    } else if (followStatus === "pending") {
      // Cancel request
      setFollowStatus("none");
      await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
    } else {
      const isPrivate = profileData?.is_private;
      const newStatus = isPrivate ? "pending" : "following";
      setFollowStatus(newStatus === "pending" ? "pending" : "following");
      if (newStatus === "following") setFollowersCount((c) => c + 1);

      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: profileId, status: newStatus });
      
      if (error) {
        setFollowStatus("none");
        if (newStatus === "following") setFollowersCount((c) => c - 1);
        toast({ title: "Failed to follow", variant: "destructive" });
      } else {
        await supabase.from("notifications").insert({
          recipient_id: profileId,
          sender_id: user.id,
          type: "follow",
        });
      }
    }
  };

  const handleUnfollow = async () => {
    if (!user || !profileId) return;
    setFollowStatus("none");
    setFollowersCount((c) => Math.max(0, c - 1));
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", profileId);
  };

  const handleStartChat = async () => {
    if (!user || !profileId) return;
    const { data: convId, error } = await supabase.rpc("get_or_create_dm", { _other_user: profileId });
    if (!error && convId) navigate(`/chat?c=${convId}`);
  };

  const handleToggleBlock = async () => {
    if (!user || !profileId) return;
    if (hasBlockedTarget) {
      const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", profileId);
      if (!error) { setHasBlockedTarget(false); toast({ title: "User unblocked" }); }
    } else {
      const { error } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: profileId });
      if (!error) { 
        setHasBlockedTarget(true); 
        setFollowStatus("none"); 
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
        await supabase.from("user_follows").delete().eq("follower_id", profileId).eq("following_id", user.id);
        toast({ title: "User blocked" }); 
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCoverUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      await supabase.from("profiles").update({ cover_url: urlData.publicUrl }).eq("user_id", user.id);
      setProfileData((prev: any) => ({ ...prev, cover_url: urlData.publicUrl }));
      toast({ title: "Cover photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const uploadFileToStorage = async (file: File | Blob, mediaType: "image" | "video", originalName?: string) => {
    if (!user) throw new Error("Not signed in");
    const ext = originalName ? originalName.split(".").pop() : (mediaType === "video" ? "mp4" : "jpg");
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, file, {
      cacheControl: "3600", upsert: false,
      contentType: (file as any).type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handlePostUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    const arr = Array.from(files);
    if (postFileInputRef.current) postFileInputRef.current.value = "";
    const images = arr.filter((f) => f.type.startsWith("image/"));
    if (arr.length === 1 && images.length === 1) {
      setPendingPostImage(images[0]);
    } else {
      setSelectedFiles(arr);
      setCroppedBlob(null);
      setShowUploadDialog(true);
    }
  };

  const handleCroppedPostUpload = async (blob: Blob) => {
    setCroppedBlob(blob);
    setSelectedFiles([]);
    setShowUploadDialog(true);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !profileId) return;
    const arr = Array.from(files);
    if (bulkUploadInputRef.current) bulkUploadInputRef.current.value = "";
    
    const images = arr.filter((f) => f.type.startsWith("image/")).slice(0, 1000);
    if (images.length === 0) return;

    setBulkUploading(true);
    toast({ title: `Uploading ${images.length} images...`, description: "Please wait, this might take a while." });
    try {
      for (let i = 0; i < images.length; i += 10) {
        const batch = images.slice(i, i + 10);
        const imageUrls: string[] = [];
        for (const img of batch) {
          const url = await uploadFileToStorage(img, "image", img.name);
          imageUrls.push(url);
        }
        
        await supabase.from("posts").insert({ 
          user_id: profileId, 
          image_url: imageUrls[0], 
          image_urls: imageUrls, 
          caption: "", 
          media_type: "image" 
        });
      }
      toast({ title: "Bulk upload complete!" });
      fetchUserPosts();
    } catch (err: any) {
      toast({ title: "Bulk upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  };

  const executeUpload = async () => {
    if (!user) return;
    setPostUploading(true);
    try {
      if (croppedBlob && pendingPostImage) {
        const url = await uploadFileToStorage(croppedBlob, "image", pendingPostImage.name.replace(/\.[^/.]+$/, "") + ".jpg");
        await supabase.from("posts").insert({ user_id: user.id, image_url: url, image_urls: [url], caption: postCaption.trim() || null, media_type: "image" });
      } else if (selectedFiles.length > 0) {
        const videos = selectedFiles.filter((f) => f.type.startsWith("video/"));
        const images = selectedFiles.filter((f) => f.type.startsWith("image/"));
        for (const v of videos) {
          const url = await uploadFileToStorage(v, "video", v.name);
          await supabase.from("posts").insert({ user_id: user.id, image_url: url, caption: postCaption.trim() || null, media_type: "video" });
        }
        if (images.length > 0) {
          const imageUrls: string[] = [];
          for (const img of images) { imageUrls.push(await uploadFileToStorage(img, "image", img.name)); }
          await supabase.from("posts").insert({ user_id: user.id, image_url: imageUrls[0], image_urls: imageUrls, caption: postCaption.trim() || null, media_type: "image" });
        }
      }
      toast({ title: "Post shared!" });
      setPostCaption(""); setSelectedFiles([]); setCroppedBlob(null); setPendingPostImage(null); setShowUploadDialog(false);
      fetchUserPosts();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setPostUploading(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isBlockedByTarget) {
    return (
      <div className="flex-1 w-full min-h-[100dvh] relative font-sans pb-mobile-nav">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-xl p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
              <User className="w-10 h-10 text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold">Profile Unavailable</h2>
            <p className="text-sm text-muted-foreground">This account is private or has restricted your view.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayAvatar = isOwnProfile
    ? user?.user_metadata?.avatar_url || profileData?.avatar_url
    : profileData?.avatar_url;

  const displayName = isOwnProfile
    ? user?.user_metadata?.display_name || profileData?.display_name || user?.email?.split("@")[0] || "User"
    : profileData?.display_name || profileData?.email?.split("@")[0] || "User";

  const username = profileData?.username;
  const bio = profileData?.bio;
  const website = profileData?.website;
  const coverUrl = profileData?.cover_url;
  const isVerified = profileData?.is_verified;
  const displayFallback = displayName.slice(0, 2).toUpperCase();
  const postsCount = uploadedPosts.length;
  const reelsCount = uploadedPosts.filter(p => p.media_type === "video").length;
  
  const gridSource = activeTab === "posts" 
    ? uploadedPosts.filter(p => p.media_type !== "video")
    : activeTab === "reels" 
      ? uploadedPosts.filter(p => p.media_type === "video")
      : activeTab === "saved" 
        ? savedPosts 
        : []; // Tagged mock empty

  const handleAvatarTap = async () => {
    if (hasStory) {
      if (!isOwnProfile && profileData?.is_private && followStatus !== "following") {
        setShowFullAvatar(true);
        return;
      }
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("stories")
        .select("*, profiles(*)")
        .eq("user_id", profileId)
        .gt("expires_at", now)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        // Build a proper StoryGroup that StoryViewer expects
        const firstStory = data[0];
        const profileInfo = firstStory.profiles || {
          user_id: profileId,
          display_name: displayName,
          username: username,
          avatar_url: displayAvatar,
        };
        const storyGroup = {
          user_id: profileId!,
          profile: profileInfo,
          stories: data,
          hasViewed: false,
        };
        setStoryViewerStories([storyGroup]);
        setStoryViewerOpen(true);
      } else {
        setShowFullAvatar(true);
      }
    } else {
      setShowFullAvatar(true);
    }
  };

  return (
    <div className="flex-1 w-full min-h-[100dvh] relative font-sans pb-mobile-nav">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* --- MOBILE TOP NAVBAR --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[40px] bg-background/60 backdrop-blur-lg z-50 flex items-center justify-between px-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-bold text-xl tracking-tight flex items-center gap-1.5">
            {profileData?.is_private && <Lock className="w-4 h-4" />}
            {username}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isOwnProfile ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="active:scale-90 transition-transform outline-none"><Menu className="w-7 h-7" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-border/50 shadow-xl" sideOffset={8}>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="py-3 px-3 font-medium cursor-pointer rounded-xl">
                    <SettingsIcon className="w-5 h-5 mr-3" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/activity")} className="py-3 px-3 font-medium cursor-pointer rounded-xl">
                    <Activity className="w-5 h-5 mr-3" /> Your activity
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("saved")} className="py-3 px-3 font-medium cursor-pointer rounded-xl">
                    <Bookmark className="w-5 h-5 mr-3" /> Saved
                  </DropdownMenuItem>
                  <div className="h-px bg-border/50 my-1 mx-2" />
                  <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }} className="py-3 px-3 font-medium cursor-pointer rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="w-5 h-5 mr-3" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="active:scale-90 transition-transform outline-none"><MoreHorizontal className="w-6 h-6" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-border/50 shadow-xl" sideOffset={8}>
                <DropdownMenuItem onClick={handleToggleBlock} className={`py-3 px-3 gap-2 font-medium cursor-pointer rounded-xl ${hasBlockedTarget ? "text-foreground" : "text-destructive focus:text-destructive focus:bg-destructive/10"}`}>
                  {hasBlockedTarget ? <><Shield className="w-5 h-5 mr-1" /> Unblock</> : <><ShieldOff className="w-5 h-5 mr-1" /> Block User</>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {showFollowingPopup && profileData && (
        <FollowingPopup
          targetUser={{ id: profileId!, display_name: displayName, username, avatar_url: displayAvatar }}
          onClose={() => setShowFollowingPopup(false)}
          onUnfollow={handleUnfollow}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          authorProfile={isOwnProfile ? { ...profileData, display_name: displayName, avatar_url: displayAvatar } : profileData}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          profile={profileData}
          onClose={() => setShowEditProfile(false)}
          onSaved={(updated) => setProfileData(updated)}
        />
      )}

      {showCreateStory && (
        <CreateStory
          onClose={() => setShowCreateStory(false)}
          onCreated={() => {
            setShowCreateStory(false);
            setHasStory(true);
          }}
        />
      )}

      {showFollowersModal && profileId && (
        <FollowersModal
          profileId={profileId}
          mode={showFollowersModal}
          onClose={() => setShowFollowersModal(null)}
        />
      )}

      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <div className={`h-44 sm:h-56 w-full relative overflow-hidden ${!coverUrl ? "profile-cover" : ""}`}>
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <button onClick={() => navigate(-1)} className="hidden md:flex absolute top-4 left-4 w-9 h-9 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="absolute top-[56px] md:top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors text-white"
                >
                  {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverUpload} />
              </>
            )}
            {!isOwnProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex absolute top-4 right-4 w-9 h-9 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-2xl border-border/50">
                  <DropdownMenuItem onClick={handleToggleBlock} className={`gap-2 font-medium cursor-pointer ${hasBlockedTarget ? "text-foreground" : "text-destructive focus:text-destructive"}`}>
                    {hasBlockedTarget ? <><Shield className="w-4 h-4" /> Unblock User</> : <><ShieldOff className="w-4 h-4" /> Block User</>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="px-4 sm:px-6 relative pb-4 md:pb-8">
            {/* --- DESKTOP HEADER --- */}
            <div className="hidden md:flex flex-row items-start justify-between -mt-20">
              {/* Left: Stats */}
              <div className="flex gap-6 mt-28 flex-1">
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-foreground text-2xl font-display">{postsCount}</span>
                  <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase mt-1">Posts</span>
                </div>
                <button 
                  className={`flex flex-col items-center transition-opacity ${(!isOwnProfile && profileData?.is_private && followStatus !== "following") ? "opacity-50 pointer-events-none" : "hover:opacity-80"}`} 
                  onClick={() => setShowFollowersModal("followers")}
                >
                  <span className="font-extrabold text-foreground text-2xl font-display">{followersCount}</span>
                  <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase mt-1">Followers</span>
                </button>
                <button 
                  className={`flex flex-col items-center transition-opacity ${(!isOwnProfile && profileData?.is_private && followStatus !== "following") ? "opacity-50 pointer-events-none" : "hover:opacity-80"}`} 
                  onClick={() => setShowFollowersModal("following")}
                >
                  <span className="font-extrabold text-foreground text-2xl font-display">{followingCount}</span>
                  <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase mt-1">Following</span>
                </button>
              </div>

              {/* Center: Avatar & Info */}
              <div className="relative flex flex-col items-center z-10 mx-auto">
                <div className="relative group">
                  <div className="p-1 rounded-full bg-background cursor-pointer shadow-2xl" onClick={handleAvatarTap}>
                    <Avatar className={`w-44 h-44 ring-4 ring-background shadow-inner ${hasStory ? 'ring-primary border-4 border-transparent bg-gradient-to-tr from-pink-500 to-amber-500 p-1' : ''}`}>
                      <AvatarImage src={displayAvatar || ""} className="object-cover rounded-full" />
                      <AvatarFallback className="bg-foreground text-background text-4xl font-bold rounded-full">
                        {displayFallback}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCreateStory(true); }}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center border-4 border-background hover:scale-110 transition-transform shadow-lg z-10 group-hover:animate-pulse"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                  {isVerified && !isOwnProfile && (
                    <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full border-4 border-background w-10 h-10 flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <div className="text-center mt-4 space-y-1">
                  <h1 className="text-3xl font-extrabold text-foreground font-display tracking-tight flex items-center justify-center gap-2">
                    {displayName}
                    {isAdmin && (
                      <div className="ml-2 inline-flex items-center">
                        <Button 
                          onClick={(e) => { e.stopPropagation(); bulkUploadInputRef.current?.click(); }} 
                          variant="secondary" 
                          size="sm" 
                          disabled={bulkUploading}
                          className="h-7 text-xs px-2 rounded-full font-bold shadow-sm"
                        >
                          {bulkUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                          Bulk Upload
                        </Button>
                        <input type="file" multiple accept="image/*" className="hidden" ref={bulkUploadInputRef} onChange={handleBulkUpload} />
                      </div>
                    )}
                  </h1>
                  {bio && <p className="text-sm font-medium text-foreground/80 max-w-xs mx-auto">{bio}</p>}
                  {username && <p className="text-xs text-muted-foreground font-semibold font-body tracking-wider uppercase">@{username}</p>}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col items-end gap-3 mt-28 flex-1">
                {isOwnProfile ? (
                  <div className="flex flex-row gap-2">
                    <Button onClick={() => setShowEditProfile(true)} variant="outline" className="h-10 px-6 rounded-full font-bold text-sm border-border/60 hover:bg-secondary glass-card shadow-sm">
                      Edit Profile
                    </Button>
                    <Button onClick={() => postFileInputRef.current?.click()} className="h-10 px-6 rounded-full font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all">
                      <Plus className="w-4 h-4 mr-1" /> New Post
                    </Button>
                    <input type="file" multiple accept="image/*,video/*" className="hidden" ref={postFileInputRef} onChange={handlePostUpload} />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleToggleFollow}
                      className={`h-10 px-8 rounded-full font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        followStatus !== "none"
                          ? "bg-transparent border border-white dark:border-zinc-700 text-foreground hover:bg-secondary/40"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                      }`}
                    >
                      {followStatus === "following" ? "Following" : followStatus === "pending" ? "Requested" : isFollowedBack ? "Follow Back" : "Follow"}
                    </Button>
                    <Button onClick={handleStartChat} size="icon" variant="outline" className="h-10 w-10 rounded-full border-border/60 glass-card hover:bg-secondary shrink-0">
                      <MessageCircle className="w-4 h-4 text-foreground" />
                    </Button>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex gap-2 mt-2 overflow-x-auto max-w-[200px] scrollbar-none justify-end">
                  {(profileData?.websites || []).map((site: string, idx: number) => (
                    <a key={idx} href={site.startsWith("http") ? site : `https://${site}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass-card border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors shrink-0 shadow-sm text-muted-foreground hover:text-foreground">
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  ))}
                  {website && (!profileData?.websites || profileData.websites.length === 0) && (
                    <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass-card border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors shrink-0 shadow-sm text-muted-foreground hover:text-foreground">
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* --- MOBILE HEADER --- */}
            <div className="flex md:hidden flex-col -mt-8 relative z-10 px-1">
              <div className="flex items-center justify-between w-full">
                {/* Mobile Avatar */}
                <div className="relative group shrink-0">
                  <div className="p-1 rounded-full bg-background cursor-pointer shadow-md" onClick={handleAvatarTap}>
                    <Avatar className={`w-[84px] h-[84px] ring-2 ring-background shadow-inner ${hasStory ? 'ring-primary border-2 border-transparent bg-gradient-to-tr from-pink-500 to-amber-500 p-0.5' : ''}`}>
                      <AvatarImage src={displayAvatar || ""} className="object-cover rounded-full" />
                      <AvatarFallback className="bg-foreground text-background text-2xl font-bold rounded-full">
                        {displayFallback}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCreateStory(true); }}
                      className="absolute bottom-1 right-1 w-6 h-6 bg-[#0095f6] text-white rounded-full flex items-center justify-center border-2 border-background z-10"
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </button>
                  )}
                  {isVerified && !isOwnProfile && (
                    <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full border-2 border-background w-6 h-6 flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Mobile Stats */}
                <div className="flex flex-1 justify-around ml-4 items-center mt-10">
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-foreground text-lg">{postsCount}</span>
                    <span className="text-foreground/90 text-[13px]">posts</span>
                  </div>
                  <button 
                    className={`flex flex-col items-center ${(!isOwnProfile && profileData?.is_private && followStatus !== "following") ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => setShowFollowersModal("followers")}
                  >
                    <span className="font-bold text-foreground text-lg">{followersCount}</span>
                    <span className="text-foreground/90 text-[13px]">followers</span>
                  </button>
                  <button 
                    className={`flex flex-col items-center ${(!isOwnProfile && profileData?.is_private && followStatus !== "following") ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => setShowFollowersModal("following")}
                  >
                    <span className="font-bold text-foreground text-lg">{followingCount}</span>
                    <span className="text-foreground/90 text-[13px]">following</span>
                  </button>
                </div>
              </div>

              {/* Mobile Bio */}
              <div className="mt-3">
                <h1 className="text-[14px] font-bold text-foreground flex items-center">
                  {displayName}
                  {isAdmin && (
                    <Button 
                      onClick={(e) => { e.stopPropagation(); bulkUploadInputRef.current?.click(); }} 
                      variant="secondary" 
                      size="sm" 
                      disabled={bulkUploading}
                      className="h-5 text-[10px] px-1.5 ml-2 rounded-sm shadow-none"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" />
                      Bulk
                    </Button>
                  )}
                </h1>
                {bio && <p className="text-[14px] text-foreground/90 mt-0.5 leading-snug whitespace-pre-wrap">{bio}</p>}
                
                {/* Mobile Social Links */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {(profileData?.websites || []).map((site: string, idx: number) => (
                    <a key={idx} href={site.startsWith("http") ? site : `https://${site}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-blue-800 dark:text-[#e0f2fe] font-medium flex items-center">
                      <LinkIcon className="w-3.5 h-3.5 mr-1" />
                      {site.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                  {website && (!profileData?.websites || profileData.websites.length === 0) && (
                    <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-blue-800 dark:text-[#e0f2fe] font-medium flex items-center">
                      <LinkIcon className="w-3.5 h-3.5 mr-1" />
                      {website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center gap-1.5 mt-4">
                {isOwnProfile ? (
                  <>
                    <Button onClick={() => setShowEditProfile(true)} variant="secondary" className="flex-1 h-8 rounded-lg font-semibold text-[13px] bg-secondary/80">
                      Edit profile
                    </Button>
                    <Button onClick={() => postFileInputRef.current?.click()} variant="secondary" className="flex-1 h-8 rounded-lg font-semibold text-[13px] bg-secondary/80">
                      New Post
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleToggleFollow}
                      className={`flex-1 h-8 rounded-lg font-semibold text-[13px] ${
                        followStatus !== "none" ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-[#0095f6] text-white hover:bg-[#0074cc]"
                      }`}
                    >
                      {followStatus === "following" ? "Following" : followStatus === "pending" ? "Requested" : isFollowedBack ? "Follow Back" : "Follow"}
                    </Button>
                    <Button onClick={handleStartChat} variant="secondary" className="flex-1 h-8 rounded-lg font-semibold text-[13px] bg-secondary/80">
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-0 border-t border-border/50">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-6 sm:px-8 py-3.5 text-xs font-bold tracking-wider uppercase transition-all -mt-[1px] ${
              activeTab === "posts" ? "border-t border-foreground text-foreground" : "border-t border-transparent text-muted-foreground hover:text-foreground/80"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Posts</span>
          </button>
          {uploadedPosts.filter(p => p.media_type === "video").length > 0 && (
            <button
              onClick={() => setActiveTab("reels")}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3.5 text-xs font-bold tracking-wider uppercase transition-all -mt-[1px] ${
                activeTab === "reels" ? "border-t border-foreground text-foreground" : "border-t border-transparent text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <PlaySquare className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reels</span>
            </button>
          )}
          {isOwnProfile && savedPosts.length > 0 && (
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3.5 text-xs font-bold tracking-wider uppercase transition-all -mt-[1px] ${
                activeTab === "saved" ? "border-t border-foreground text-foreground" : "border-t border-transparent text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Saved</span>
            </button>
          )}
        </div>
        <div className="pt-2">
          {!isOwnProfile && profileData?.is_private && followStatus !== "following" ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-t border-border/20 mt-1">
              <div className="w-16 h-16 rounded-full border-2 border-border/60 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">This account is private</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">Follow this account to see their photos and videos.</p>
            </div>
          ) : gridSource.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4 border border-border/50">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-base font-bold text-foreground">
                {activeTab === "saved" ? "No saved posts" : activeTab === "reels" ? "No reels yet" : "No posts yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {activeTab === "saved" ? "Posts you save will appear here." : isOwnProfile ? "Share your first post or reel!" : "Nothing to show yet."}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {gridSource.map((post) => (
              <PostGridItem
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
                isOwner={isOwnProfile}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ImageCropper removed — post editing now uses CESDKEditor */}

      {showFullAvatar && displayAvatar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90" onClick={() => setShowFullAvatar(false)}>
          <button className="absolute top-4 right-4 p-2 text-white/80 hover:text-white" onClick={() => setShowFullAvatar(false)}>
            <X className="w-8 h-8" />
          </button>
          <img src={displayAvatar} alt="Profile" className="max-w-full max-h-[100dvh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {storyViewerOpen && storyViewerStories.length > 0 && (
        <StoryViewer
          groups={storyViewerStories}
          startGroupIndex={0}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {showUploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-2xl p-6 w-full max-w-md space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Share a Post</h3>
              <button onClick={() => { setShowUploadDialog(false); setSelectedFiles([]); setCroppedBlob(null); setPendingPostImage(null); setPostCaption(""); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/5 border border-border/40 flex items-center justify-center">
              {croppedBlob ? (
                <img src={URL.createObjectURL(croppedBlob)} alt="Preview" className="w-full h-full object-cover" />
              ) : selectedFiles.length > 0 ? (
                selectedFiles[0].type.startsWith("video/") ? (
                  <video src={URL.createObjectURL(selectedFiles[0])} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={URL.createObjectURL(selectedFiles[0])} alt="Preview" className="w-full h-full object-cover" />
                )
              ) : <ImageIcon className="w-8 h-8 text-muted-foreground/30" />}
            </div>
            <Input placeholder="Write a caption…" value={postCaption} onChange={(e) => setPostCaption(e.target.value)} className="h-12 rounded-2xl bg-secondary/30 border-border/40" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-border/60" disabled={postUploading} onClick={() => { setShowUploadDialog(false); setSelectedFiles([]); setCroppedBlob(null); setPendingPostImage(null); setPostCaption(""); }}>Cancel</Button>
              <Button className="flex-1 h-12 rounded-2xl font-bold gradient-btn" disabled={postUploading} onClick={executeUpload}>
                {postUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Posting…</> : "Share Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
