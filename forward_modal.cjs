const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

const forwardModalState = `
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);

  const openForwardModal = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversation_participants")
      .select("conversation_id, conversations(id, type, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (data) {
      setRecentChats(data.map(d => d.conversations));
      setForwardModalOpen(true);
    }
  };

  const handleForward = async (targetConvId: string) => {
    if (!user) return;
    const msgsToForward = selectedMessages.map(id => messages.find(m => m.id === id)).filter(Boolean);
    
    for (const msg of msgsToForward) {
       await supabase.from("messages").insert({
          conversation_id: targetConvId,
          user_id: user.id,
          content: msg.content,
          media_type: msg.media_type,
          media_url: msg.media_url,
          forwarded_from_name: user.user_metadata?.full_name || user.email,
          status: "published"
       });
    }
    setForwardModalOpen(false);
    setSelectedMessages([]);
    toast({ title: "Messages forwarded!" });
  };
`;

c = c.replace(/const \[typingUsers, setTypingUsers\] = useState<string\[\]>\(\[\]\);/, forwardModalState + '\n  const [typingUsers, setTypingUsers] = useState<string[]>([]);');

const forwardModalUI = `
      {forwardModalOpen && (
        <div className="absolute inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
           <div className="bg-background w-full sm:w-[400px] h-[70vh] sm:h-auto max-h-[80vh] rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col animate-in slide-in-from-bottom-4">
              <div className="p-4 border-b flex justify-between items-center">
                 <h2 className="font-bold text-lg">Forward to...</h2>
                 <button onClick={() => setForwardModalOpen(false)} className="p-2 hover:bg-secondary rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                 {recentChats.map(chat => (
                    <button key={chat.id} onClick={() => handleForward(chat.id)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl text-left transition-colors">
                       <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="font-bold text-primary">{chat.name ? chat.name.charAt(0).toUpperCase() : "#"}</span>
                       </div>
                       <div className="flex flex-col flex-1 truncate">
                          <span className="font-semibold truncate">{chat.name || "Direct Chat"}</span>
                       </div>
                    </button>
                 ))}
                 {recentChats.length === 0 && <div className="text-center p-8 text-muted-foreground">No recent chats found.</div>}
              </div>
           </div>
        </div>
      )}
`;

c = c.replace(/\{isSelectionMode && \(/, forwardModalUI + '\n      {isSelectionMode && (');
c = c.replace(/<button onClick=\{\(\) => \{\}\} className="p-2 rounded-full hover:bg-secondary text-primary transition-colors"><Forward className="w-5 h-5" \/><\/button>/, 
  '<button onClick={openForwardModal} className="p-2 rounded-full hover:bg-secondary text-primary transition-colors"><Forward className="w-5 h-5" /></button>');

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
