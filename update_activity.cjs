const fs = require('fs');
let c = fs.readFileSync('src/pages/Activity.tsx', 'utf8');

const newUI = `
  return (
    <div className={\`flex flex-col h-[100dvh] overflow-hidden \${isDark ? "bg-black text-white" : "bg-white text-black"}\`}>
      {/* HEADER & TABS */}
      <div className="shrink-0 flex flex-col border-b" style={{ borderColor: isDark ? "#262626" : "#e5e5e5" }}>
        <div className="flex items-center px-4 py-3">
           <h2 className="text-xl font-bold">Your activity</h2>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar px-2 pb-1 gap-2">
          {[
            { id: "interactions", icon: ArrowLeftRight, label: "Interactions" },
            { id: "photos", icon: Images, label: "Photos & videos" },
            { id: "history", icon: CalendarClock, label: "Account history" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id as Section)}
              className={\`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors \${section === tab.id ? (isDark ? "bg-white text-black" : "bg-black text-white") : (isDark ? "bg-neutral-900 text-neutral-300" : "bg-neutral-100 text-neutral-600")}\`}
            >
              <tab.icon size={16} />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── INTERACTIONS ── */}
        {section === "interactions" && (
          <div className="flex flex-col h-full">
            {/* Sub-Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar border-b px-2 py-2 gap-2 shrink-0" style={{ borderColor: isDark ? "#262626" : "#e5e5e5" }}>
              {(["likes", "comments", "reposts"] as InteractionTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setInteractionTab(tab)}
                  className={\`flex items-center gap-2 px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold capitalize \${interactionTab === tab ? (isDark ? "bg-neutral-800 text-white" : "bg-neutral-200 text-black") : (isDark ? "bg-transparent text-neutral-400" : "bg-transparent text-neutral-500")}\`}
                >
                  {tab === "likes" && <Heart size={14} />}
                  {tab === "comments" && <MessageCircle size={14} />}
                  {tab === "reposts" && <Repeat2 size={14} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-primary animate-spin" style={{ borderColor: isDark ? "#333" : "#e5e5e5", borderTopColor: isDark ? "#fff" : "#000" }} />
                </div>
              ) : (
                <>
                  {interactionTab === "likes" && (
                    likedPosts.length === 0 ? (
                      <div className="text-center p-12 text-neutral-500">
                        <Heart size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-semibold">No liked posts yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {likedPosts.map(like => (
                          <Link key={like.id} to={\`/gallery\`} className="aspect-square relative block bg-neutral-100 dark:bg-neutral-900">
                            {like.post?.image_url ? (
                              <img src={like.post.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
                                <Heart size={24} className="opacity-30" />
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )
                  )}

                  {interactionTab === "comments" && (
                    myComments.length === 0 ? (
                      <div className="text-center p-12 text-neutral-500">
                        <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-semibold">No comments yet</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {myComments.map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-3 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-200 dark:bg-neutral-800">
                              {c.post?.image_url && <img src={c.post.image_url} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium mb-1 truncate">{c.content}</p>
                              <p className="text-xs text-neutral-500 truncate">{c.post?.caption || "Post"}</p>
                            </div>
                            <span className="text-xs text-neutral-500 shrink-0">{timeAgo(c.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {interactionTab === "reposts" && (
                    <div className="text-center p-12 text-neutral-500">
                      <Repeat2 size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-sm font-semibold">No reposts yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PHOTOS AND VIDEOS ── */}
        {section === "photos" && (
          <div className="flex flex-col h-full">
            {/* Sub-Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar border-b px-2 py-2 gap-2 shrink-0" style={{ borderColor: isDark ? "#262626" : "#e5e5e5" }}>
              {(["posts", "reels", "highlights"] as PhotoTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPhotoTab(tab)}
                  className={\`flex items-center gap-2 px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold capitalize \${photoTab === tab ? (isDark ? "bg-neutral-800 text-white" : "bg-neutral-200 text-black") : (isDark ? "bg-transparent text-neutral-400" : "bg-transparent text-neutral-500")}\`}
                >
                  {tab === "posts" && <Images size={14} />}
                  {tab === "reels" && <Repeat2 size={14} />}
                  {tab === "highlights" && <BookmarkCheck size={14} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-1">
              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-primary animate-spin" style={{ borderColor: isDark ? "#333" : "#e5e5e5", borderTopColor: isDark ? "#fff" : "#000" }} />
                </div>
              ) : myPosts.length === 0 ? (
                <div className="text-center p-12 text-neutral-500">
                  <Images size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-semibold">No {photoTab} yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {myPosts.map(post => (
                    <div key={post.id} className="aspect-square relative cursor-pointer bg-neutral-100 dark:bg-neutral-900">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
                          <Images size={24} className="opacity-30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACCOUNT HISTORY ── */}
        {section === "history" && (
          <div className="flex flex-col h-full">
            <div className="p-4 text-center border-b" style={{ borderColor: isDark ? "#262626" : "#e5e5e5" }}>
              <p className="text-sm font-bold mb-1">About account history</p>
              <p className="text-xs text-neutral-500">Review changes you've made to your account since you created it.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-primary animate-spin" style={{ borderColor: isDark ? "#333" : "#e5e5e5", borderTopColor: isDark ? "#fff" : "#000" }} />
                </div>
              ) : accountHistory.length === 0 ? (
                <div className="text-center p-12 text-neutral-500">
                  <CalendarClock size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-semibold">No history yet</p>
                </div>
              ) : (
                Object.entries(groupByTime(accountHistory)).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-xs font-bold px-4 py-2 bg-neutral-50 dark:bg-neutral-900">{group}</p>
                    {items.map((n: any) => (
                      <div key={n.id} className="flex items-center gap-3 p-3 border-b border-neutral-100 dark:border-neutral-900">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
                          {historyIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{historyText(n)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-neutral-500">{timeAgo(n.created_at)}</span>
                          <ChevronRight size={14} className="text-neutral-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
`;

c = c.replace(/return \([\s\S]*\}\;/m, newUI);
fs.writeFileSync('src/pages/Activity.tsx', c);
