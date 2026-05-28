const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

// The starting point of the input footer
const footerStart = c.indexOf('<div className="p-4 flex items-center gap-3 border-t-0 bg-transparent">');
// The end point (before the Details panel)
const footerEnd = c.indexOf('</div>{/* end main chat column */}');

if (footerStart !== -1 && footerEnd !== -1) {
  const newFooter = `<div className="p-2 flex items-end gap-2 border-t-0 bg-transparent mb-2 max-w-[800px] mx-auto w-full">
          <input ref={mediaRef} type="file" accept="image/*,video/*,application/pdf" multiple onChange={(e) => handleStageMedia(e, "document")} className="hidden" />
          <input ref={audioRef} type="file" accept="audio/*" multiple onChange={(e) => handleStageMedia(e, "audio")} className="hidden" />
          
          <div className="flex-1 relative bg-secondary/80 dark:bg-[#2c2c2c] rounded-3xl flex items-end border-none transition-all duration-300 shadow-sm min-h-[44px]">
            {/* EMOJI BUTTON - INSIDE LEFT */}
            {!recording && !voicePreview && (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" className="rounded-full h-11 w-11 shrink-0 hover:bg-transparent text-muted-foreground self-end" disabled={isBlocked}>
                      <Smile className="w-[26px] h-[26px]" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0 mb-3 shadow-2xl border-border/50 rounded-2xl overflow-hidden" side="top" align="start">
                    <Tabs defaultValue="emoji" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border/50 bg-secondary/80 p-0 h-12">
                        <TabsTrigger value="emoji" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary">Emoji</TabsTrigger>
                        <TabsTrigger value="stickers" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary">Stickers</TabsTrigger>
                        <TabsTrigger value="gifs" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary">GIFs</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="emoji" className="p-3 h-80 overflow-y-auto bg-background m-0">
                        <div className="relative mb-3 sticky top-0 z-10 bg-background pb-2">
                        <Search className="w-4 h-4 absolute left-3 top-[14px] text-muted-foreground" />
                        <Input placeholder="Search emojis..." value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)} className="h-10 pl-9 bg-secondary/50 border-none rounded-xl" />
                        </div>
                        <div className="grid grid-cols-8 gap-1.5">
                        {filteredEmojis.map(e => (
                            <button key={e} onClick={() => setText(prev => prev + e)} className="text-[28px] hover:bg-secondary rounded-xl p-1.5 text-center transition-transform hover:scale-110">{e}</button>
                        ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="stickers" className="p-3 h-80 overflow-y-auto bg-zinc-950/5 m-0">
                        <div className="relative mb-3 sticky top-0 z-10 bg-zinc-950/5 pb-2 backdrop-blur-md">
                        <Search className="w-4 h-4 absolute left-3 top-[14px] text-muted-foreground" />
                        <Input placeholder="Search stickers..." value={stickerSearch} onChange={e => setStickerSearch(e.target.value)} className="h-10 pl-9 bg-background border-none rounded-xl shadow-sm" />
                        </div>
                        {recentStickers.length > 0 && stickerSearch === "" && (
                        <div className="mb-5">
                            <span className="text-[11px] font-bold text-muted-foreground mb-2.5 block uppercase tracking-widest pl-1">Recent</span>
                            <div className="grid grid-cols-4 gap-3">
                            {recentStickers.map(s => (
                                <img key={\`recent-\${s.id}\`} src={s.url} alt="sticker" onClick={() => sendRichMediaInstant(s.url, "sticker", s.id)} className="w-full aspect-square rounded-xl bg-background object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow-sm p-1" />
                            ))}
                            </div>
                        </div>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                        {filteredStickers.map(s => (
                            <img key={s.id} src={s.url} alt="sticker" onClick={() => sendRichMediaInstant(s.url, "sticker", s.id)} className="w-full aspect-square rounded-xl bg-background object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow-sm p-1" />
                        ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="gifs" className="p-3 h-80 overflow-y-auto bg-background m-0">
                        <div className="relative mb-3 sticky top-0 z-10 bg-background pb-2">
                        <Search className="w-4 h-4 absolute left-3 top-[14px] text-muted-foreground" />
                        <Input placeholder="Search Tenor GIFs..." value={gifSearch} onChange={e => searchRealGifs(e.target.value)} className="h-10 pl-9 bg-secondary/50 border-none rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                        {realGifs.map(g => (
                            <img key={g.id} src={g.url} alt="gif" onClick={() => sendRichMediaInstant(g.url, "gif", g.id)} className="w-full h-32 rounded-xl bg-secondary object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-sm" />
                        ))}
                        </div>
                    </TabsContent>
                    </Tabs>
                </PopoverContent>
                </Popover>
            )}

            {/* TEXT INPUT */}
            {recording ? (
                <div className="flex-1 flex items-center gap-3 px-2 h-11">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    <span className="text-sm font-medium animate-pulse text-red-500">{formatTime(recordTime)}</span>
                    <span className="text-[15px] text-muted-foreground ml-2">Slide to cancel &lt;</span>
                </div>
            ) : voicePreview ? (
                <div className="flex-1 flex items-center px-2 h-11">
                   <span className="text-sm text-muted-foreground italic">Voice note preview...</span>
                </div>
            ) : (
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); executeSendMediaAndText(); } }}
                  placeholder={isBlockedByTarget ? "You cannot contact this user" : hasBlockedTarget ? "You blocked this chat" : "Message"}
                  disabled={isBlocked}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 w-full text-[16px] px-1 py-[11px] font-medium placeholder:text-muted-foreground resize-none overflow-y-auto"
                />
            )}

            {/* ATTACHMENT BUTTON - INSIDE RIGHT */}
            {!recording && !voicePreview && (
              <Button type="button" size="icon" variant="ghost" className="rounded-full h-11 w-11 shrink-0 hover:bg-transparent text-muted-foreground self-end mr-0.5" onClick={() => mediaRef.current?.click()} disabled={isBlocked}>
                <Paperclip className="w-[24px] h-[24px]" />
              </Button>
            )}
            
            {/* VIEW ONCE TOGGLE (Optional, keep inside right if media is attached) */}
            {pendingMedia.length > 0 && !recording && !voicePreview && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (isBlocked) return;
                  setViewLimitOption(prev => prev === 0 ? 1 : prev === 1 ? 2 : 0);
                }}
                disabled={isBlocked}
                className={\`rounded-full h-11 w-11 shrink-0 transition-all duration-300 relative self-end \${
                  viewLimitOption > 0 ? "text-primary" : "text-muted-foreground hover:bg-transparent"
                }\`}
              >
                {viewLimitOption === 0 ? (
                  <EyeOff className="w-[20px] h-[20px]" />
                ) : (
                  <div className="relative">
                    <Eye className="w-[20px] h-[20px]" />
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {viewLimitOption}
                    </span>
                  </div>
                )}
              </Button>
            )}
          </div>

          {/* SEND / MIC BUTTON - OUTSIDE RIGHT */}
          <div className="relative shrink-0 flex items-end pb-0.5">
            <Popover>
               <PopoverTrigger asChild>
                 {/* Invisible trigger for Long Press menu - we will handle long press programmatically but keeping this simple for now. Actually, let's use a real long press hook. */}
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
                        // If it's a short click, just send or record
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
                 </div>
               </PopoverTrigger>
               <PopoverContent side="top" align="end" className="w-56 p-1.5 rounded-2xl mb-2 shadow-xl border-border/40">
                  <Button id="long-press-send-trigger" className="hidden" />
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
          </div>
        </div>
      </div>
      `;

  c = c.substring(0, footerStart) + newFooter + c.substring(footerEnd);
  fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
  console.log("Chat input replaced successfully");
} else {
  console.log("Could not find footer boundaries");
}
