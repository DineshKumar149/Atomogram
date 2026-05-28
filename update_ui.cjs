const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

// 1. Add renderText helper
const renderTextFn = `
const renderText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\\|\\|.*?\\|\\|)/g);
    return parts.map((part, i) => {
        if (part.startsWith('||') && part.endsWith('||')) {
            const secret = part.slice(2, -2);
            return (
                <span 
                  key={i} 
                  className="cursor-pointer transition-all duration-300 blur-md bg-foreground/20 text-transparent rounded px-1 hover:opacity-80" 
                  onClick={(e) => { 
                      e.currentTarget.classList.remove('blur-md', 'bg-foreground/20', 'text-transparent'); 
                  }}
                >{secret}</span>
            );
        }
        return <span key={i}>{part}</span>;
    });
};
`;

c = c.replace(/const isAdmin = user\?\.email\?\.toLowerCase\(\) === ADMIN_EMAIL;/, 
  'const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;\n' + renderTextFn);

// 2. Replace {m.content} with {renderText(m.content)}
c = c.replace(/\{m\.content\}/g, '{renderText(m.content)}');
// Rollback unintended replacements like setText(m.content) etc
c = c.replace(/setText\(renderText\(m\.content\)\)/g, 'setText(m.content)');
c = c.replace(/m\.content\?/g, 'm.content?'); // just in case

// 3. Add Selection Checkbox next to messages
const checkboxInject = `
              <div id={\`msg-\${m.id}\`} key={m.id} className={\`flex gap-2.5 items-end \${isMe ? "justify-end" : "justify-start"} \${isSelectionMode ? 'cursor-pointer hover:bg-black/5 p-1 rounded-xl transition-colors' : ''}\`} onClick={() => {
                  if (isSelectionMode) setSelectedMessages(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]);
              }}>
                {isSelectionMode && (
                  <div className="shrink-0 mb-2 mr-1">
                    <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center \${selectedMessages.includes(m.id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'}\`}>
                      {selectedMessages.includes(m.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                )}
`;
c = c.replace(/<div id=\{\`msg-\$\{m\.id\}\`\} key=\{m\.id\} className=\{\`flex gap-2\.5 \$\{isMe \? "justify-end" : "justify-start"\}\`\}>/, checkboxInject);

// 4. Disable standard context menu if in selection mode
c = c.replace(/onTouchStart=\{\(e\) => handleTouchStart\(e, m\.id\)\}/g, 'onTouchStart={(e) => { if (!isSelectionMode) handleTouchStart(e, m.id); }}');
c = c.replace(/onTouchMove=\{\(e\) => handleTouchMove\(e, m\.id\)\}/g, 'onTouchMove={(e) => { if (!isSelectionMode) handleTouchMove(e, m.id); }}');

// 5. Add bulk actions header
const bulkHeader = `
      {isSelectionMode && (
        <div className="absolute top-0 left-0 right-0 z-[60] bg-background border-b border-border flex items-center px-4 h-14 justify-between animate-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => setSelectedMessages([])} className="p-2 -ml-2 rounded-full hover:bg-secondary"><X className="w-5 h-5" /></button>
             <span className="font-bold text-lg">{selectedMessages.length} Selected</span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => {}} className="p-2 rounded-full hover:bg-secondary text-primary transition-colors"><Forward className="w-5 h-5" /></button>
             <button onClick={async () => {
                 for (const id of selectedMessages) {
                     await supabase.from("messages").delete().eq("id", id);
                 }
                 setSelectedMessages([]);
             }} className="p-2 rounded-full hover:bg-secondary text-destructive transition-colors"><Trash2 className="w-5 h-5" /></button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden relative">
`;
c = c.replace(/<div className="flex-1 flex flex-col overflow-hidden relative">/, bulkHeader);

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
