const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

const oldMenuStart = '<DropdownMenuContent align="end" className="w-56 z-[70] rounded-2xl shadow-xl border-border/40 p-1.5">';
const oldMenuEnd = '</DropdownMenuContent>';

const startIndex = c.lastIndexOf(oldMenuStart);
// Find the first </DropdownMenuContent> AFTER the start index
const endIndex = c.indexOf(oldMenuEnd, startIndex) + oldMenuEnd.length;

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const newMenu = \`<DropdownMenuContent align="end" className="w-56 z-[70] rounded-2xl shadow-xl border-border/40 p-1.5">
                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => { setSearchOpen(o => !o); setSearchQuery(""); }}>
                      <Search className="w-[18px] h-[18px] mr-3 text-muted-foreground" />
                      <span className="font-semibold text-sm">Search Messages</span>
                    </DropdownMenuItem>
                    
                    {conv?.type !== "group" && (
                      <>
                        <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => {
                          if (isBlockedByTarget) toast({ title: "Call failed", description: "You cannot contact this user.", variant: "destructive" });
                          else if (hasBlockedTarget) toast({ title: "Call failed", description: "Unblock this user to make calls.", variant: "destructive" });
                          else initiateCall("audio");
                        }}>
                          <Phone className="w-[18px] h-[18px] mr-3 text-muted-foreground" />
                          <span className="font-semibold text-sm">Voice Call</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => {
                          if (isBlockedByTarget) toast({ title: "Call failed", description: "You cannot contact this user.", variant: "destructive" });
                          else if (hasBlockedTarget) toast({ title: "Call failed", description: "Unblock this user to make calls.", variant: "destructive" });
                          else initiateCall("video");
                        }}>
                          <Video className="w-[18px] h-[18px] mr-3 text-muted-foreground" />
                          <span className="font-semibold text-sm">Video Call</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator className="bg-border/40 my-1" />
                    
                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <BellOff className="w-[18px] h-[18px] mr-3 text-primary" /> : <Bell className="w-[18px] h-[18px] mr-3 text-muted-foreground" />}
                      <span className="font-semibold text-sm">{isMuted ? "Unmute Messages" : "Mute Messages"}</span>
                    </DropdownMenuItem>
                    
                    {conv?.type === "group" && (
                       <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => setDetailsOpen(true)}>
                         <Users className="w-[18px] h-[18px] mr-3 text-muted-foreground" />
                         <span className="font-semibold text-sm">See All Members</span>
                       </DropdownMenuItem>
                    )}

                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => setShowScheduledView(!showScheduledView)}>
                      <CalendarClock className="w-[18px] h-[18px] mr-3 text-orange-500" />
                      <span className="font-semibold text-sm">Scheduled Messages</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-border/40 my-1" />
                    
                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive transition-colors" onClick={() => executeClearChat()}>
                      <Trash2 className="w-[18px] h-[18px] mr-3" />
                      <span className="font-semibold text-sm">Clear Chat</span>
                    </DropdownMenuItem>

                    {conv?.type !== "group" && (
                       <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive transition-colors" onClick={() => setHasBlockedTarget(!hasBlockedTarget)}>
                         <Ban className="w-[18px] h-[18px] mr-3" />
                         <span className="font-semibold text-sm">{hasBlockedTarget ? "Unblock User" : "Block User"}</span>
                       </DropdownMenuItem>
                    )}

                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive transition-colors" onClick={() => toast({ title: "Report submitted", description: "Thank you for keeping the community safe." })}>
                      <Flag className="w-[18px] h-[18px] mr-3" />
                      <span className="font-semibold text-sm">Report User</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>\`;

    c = c.substring(0, startIndex) + newMenu + c.substring(endIndex);
    fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
    console.log("Updated Chat Menu successfully");
} else {
    console.log("Could not find Chat Menu block");
}
