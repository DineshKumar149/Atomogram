const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

if (!c.includes('DropdownMenu')) {
  c = c.replace(/import \{ Popover, PopoverContent, PopoverTrigger \} from "@\/components\/ui\/popover";/, 
    'import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";\nimport { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";');
}
if (!c.includes('Menu,')) {
  c = c.replace(/Search,/, 'Search, Menu,');
}

const headerStartStr = '<div className="flex items-center gap-2 text-muted-foreground">';
const headerStartIndex = c.indexOf(headerStartStr);

const infoStr = 'onClick={() => setDetailsOpen((o) => !o)}';
const infoIdx = c.indexOf(infoStr, headerStartIndex);

if (headerStartIndex !== -1 && infoIdx !== -1) {
    // find closing </div> after info button
    const endStr = '</Button>';
    const endIdx = c.indexOf(endStr, infoIdx) + endStr.length;
    // we also need to include the closing </div> of the flex container
    const flexEndIdx = c.indexOf('</div>', endIdx) + 6;

    const newHeader = `<div className="flex items-center text-muted-foreground">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-secondary transition-colors focus-visible:ring-0">
                    <Menu className="w-6 h-6 text-foreground/80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[70] rounded-2xl shadow-xl border-border/40 p-1.5">
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
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => mediaRef.current?.click()}>
                    <ImageIcon className="w-[18px] h-[18px] mr-3 text-primary" />
                    <span className="font-semibold text-sm">Send Media</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => setShowScheduledView(!showScheduledView)}>
                    <CalendarClock className="w-[18px] h-[18px] mr-3 text-orange-500" />
                    <span className="font-semibold text-sm">Schedule Message</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={(e) => {
                     e.preventDefault();
                     const nv = !vanishMode;
                     setVanishMode(nv);
                     supabase.from("conversations").update({ vanish_mode_enabled: nv }).eq("id", conversationId).then();
                  }}>
                    {vanishMode ? <Eye className="w-[18px] h-[18px] mr-3 text-destructive" /> : <Ghost className="w-[18px] h-[18px] mr-3 text-muted-foreground" />}
                    <span className={\`font-semibold text-sm \${vanishMode ? "text-destructive" : ""}\`}>{vanishMode ? "Disable Vanish Mode" : "Vanish Mode"}</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/40 my-1" />
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-secondary transition-colors" onClick={() => setDetailsOpen(true)}>
                    <Info className="w-[18px] h-[18px] mr-3 text-muted-foreground" />
                    <span className="font-semibold text-sm">Chat Info</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive transition-colors" onClick={() => executeClearChat()}>
                    <Trash2 className="w-[18px] h-[18px] mr-3" />
                    <span className="font-semibold text-sm">Clear Chat</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>`;
            
    c = c.substring(0, headerStartIndex) + newHeader + c.substring(flexEndIdx);
} else {
    console.log("Could not find header");
}


// Clean up input area
// Find the MoreHorizontal popover
const popoverRegex = /<Popover>[\s\S]*?<MoreHorizontal className="w-6 h-6" \/>[\s\S]*?<\/PopoverContent>\s*<\/Popover>/;
c = c.replace(popoverRegex, '');

// Find the Paperclip button
const paperclipRegex = /\{!recording && !voicePreview && \(\s*<Button type="button" size="icon" variant="ghost" className="rounded-full h-10 w-10 shrink-0 hover:bg-background\/80" onClick=\{\(\) => mediaRef\.current\?\.click\(\)\} disabled=\{isBlocked\}>\s*<Paperclip className="w-\[20px\] h-\[20px\] text-muted-foreground" \/>\s*<\/Button>\s*\)\}/;
c = c.replace(paperclipRegex, '');

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
console.log("ChatRoom UI cleanup complete");
