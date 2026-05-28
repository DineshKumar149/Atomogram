const fs = require('fs'); 
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8'); 
c = c.replace(/\{\(scheduledForDate \|\| scheduledForTime\) && \(\r?\n\s+<Button size="sm" variant="ghost" onClick=\{\(\) => \{ setScheduledForDate\(""\); setScheduledForTime\(""\); \}\} className="h-7 text-\[11px\] text-muted-foreground">Clear Schedule<\/Button>\r?\n\s+\)\}\r?\n\s+<\/div>\r?\n\s+<\/PopoverContent>/, `{(scheduledForDate || scheduledForTime) && (
                          <Button size="sm" variant="ghost" onClick={() => { setScheduledForDate(""); setScheduledForTime(""); }} className="h-7 text-[11px] text-muted-foreground">Clear Schedule</Button>
                        )}
                      </div>
                      <div className="w-full h-px bg-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <BellOff className="w-3.5 h-3.5" /> Send without sound
                        </span>
                        <Switch checked={isSilent} onCheckedChange={setIsSilent} />
                      </div>
                    </PopoverContent>`); 
fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
