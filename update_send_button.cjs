const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

const regex = /<Popover>\s*<PopoverTrigger asChild>\s*<div\s*onContextMenu=[\s\S]*?<PopoverContent side="top" align="end" className="w-56 p-1\.5 rounded-2xl mb-2 shadow-xl border-border\/40">\s*<Button id="long-press-send-trigger" className="hidden" \/>/m;

const replacement = `<Popover>
               <PopoverTrigger asChild>
                  <button id="long-press-send-trigger" className="hidden" />
               </PopoverTrigger>
               <PopoverContent side="top" align="end" className="w-56 p-1.5 rounded-2xl mb-2 shadow-xl border-border/40">`;

const fullReplacement = `<Popover>
               <PopoverTrigger asChild>
                  <button id="long-press-send-trigger" className="hidden" />
               </PopoverTrigger>
               <PopoverContent side="top" align="end" className="w-56 p-1.5 rounded-2xl mb-2 shadow-xl border-border/40">
                  <div className="flex flex-col gap-1">
                     <button onClick={() => { setIsSilent(true); executeSendMediaAndText(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary w-full text-left transition-colors">
                        <BellOff className="w-[18px] h-[18px] text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Send without sound</span>
                     </button>
                     <div className="h-px bg-border/40 my-0.5" />
                     <button onClick={() => setShowScheduledView(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary w-full text-left transition-colors">
                        <CalendarClock className="w-[18px] h-[18px] text-orange-500" />
                        <span className="text-sm font-semibold text-foreground">Schedule message</span>
                     </button>
                  </div>
               </PopoverContent>
            </Popover>

            <div 
               onContextMenu={(e) => {
                 e.preventDefault();
                 document.getElementById('long-press-send-trigger')?.click();
               }}
               onTouchStart={(e) => {
                 touchTimeoutRef.current = setTimeout(() => {
                   if (navigator.vibrate) navigator.vibrate(50);
                   document.getElementById('long-press-send-trigger')?.click();
                 }, 500);
               }}
               onTouchEnd={() => clearTimeout(touchTimeoutRef.current!)}
               onTouchMove={() => clearTimeout(touchTimeoutRef.current!)}
             >
                <Button 
                  type="button" 
                  size="icon" 
                  onClick={(e) => {
                    clearTimeout(touchTimeoutRef.current!);
                    if (recording) {
                       stopRecording();
                    } else if (text.trim() || pendingMedia.length > 0 || voicePreview) {
                       executeSendMediaAndText();
                    } else {
                       startRecording();
                    }
                  }}
                  disabled={isUploading || isBlocked} 
                  className={\`rounded-full h-[46px] w-[46px] shadow-sm transition-all duration-300 \${
                     recording ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" :
                     (text.trim() || pendingMedia.length > 0 || voicePreview) ? "bg-[#3390ec] text-white hover:bg-[#3390ec]/90 hover:scale-105 active:scale-95" : 
                     "bg-transparent text-muted-foreground hover:bg-secondary"
                  }\`}
                >
                  {recording ? <Square className="w-5 h-5 fill-current" /> : (text.trim() || pendingMedia.length > 0 || voicePreview) ? <Send className="w-[20px] h-[20px] ml-0.5" /> : <Mic className="w-[24px] h-[24px]" />}
                </Button>
            </div>`;

// We need to replace the whole block
const startPopover = c.indexOf('<Popover>\n               <PopoverTrigger asChild>');
const endPopoverBlock = c.indexOf('</PopoverContent>\n            </Popover>');

if (startPopover !== -1 && endPopoverBlock !== -1) {
    const endIdx = endPopoverBlock + '</PopoverContent>\n            </Popover>'.length;
    c = c.substring(0, startPopover) + fullReplacement + c.substring(endIdx);
    fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
    console.log('Fixed send button popover logic');
} else {
    console.log('Could not find popover block');
}
