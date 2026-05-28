const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

// The main message bubble wrapper is here:
// <div key={m.id} className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}>
c = c.replace(
  /<div key=\{m\.id\} className=\{\`flex gap-2\.5 \$\{isMe \? "justify-end" : "justify-start"\}\`\}>/g,
  '<div key={m.id} className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"} select-none`} style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }} onContextMenu={(e) => { e.preventDefault(); if (!isSelectionMode) { setSelectedMessages([m.id]); } else { setSelectedMessages(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]); } }}>'
);

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
console.log("Message bubble wrapper updated for multi-select");
