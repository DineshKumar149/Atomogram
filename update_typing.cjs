const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

c = c.replace(/const \[typingUsers, setTypingUsers\] = useState<string\[\]>\(\[\]\);/, 
  'const [typingUsers, setTypingUsers] = useState<{id: string, action: string}[]>([]);');

c = c.replace(/const \{ data \} = await supabase\.from\("typing_indicators"\)\.select\("user_id, updated_at"\)/, 
  'const { data } = await supabase.from("typing_indicators").select("user_id, updated_at, action_type")');

c = c.replace(/setTypingUsers\(\(data \?\? \[\]\)\.map\(\(t\) => t\.user_id\)\.filter\(\(id\) => id !== user\?\.id\)\);/, 
  "setTypingUsers((data ?? []).filter(t => t.user_id !== user?.id).map(t => ({ id: t.user_id, action: t.action_type || 'typing' })));");

c = c.replace(/const broadcastTyping = async \(\) => \{/, 
  "const broadcastTyping = async (actionType = 'typing') => {");

c = c.replace(/updated_at: new Date\(\)\.toISOString\(\)/, 
  "updated_at: new Date().toISOString(), action_type: actionType");

c = c.replace(/typingUsers\.map\(\(id\) => profiles\[id\]\?\.display_name \?\? "Someone"\)\.join\(", "\) is typing\.\.\./, 
  `typingUsers.map((u) => profiles[u.id]?.display_name ?? "Someone").join(", ") + " is " + (typingUsers[0]?.action === 'audio' ? 'recording audio...' : typingUsers[0]?.action === 'image' ? 'uploading photo...' : 'typing...')`);

// Update usage of broadcastTyping to pass action where appropriate
c = c.replace(/const startRecording = async \(\) => \{([\s\S]*?)setRecording\(true\);/m, 
  `const startRecording = async () => {
    broadcastTyping('audio');
    $1setRecording(true);`);

c = c.replace(/onChange=\{\(e\) => \{\n\s+setText\(e\.target\.value\);\n\s+if \(typingTimeout\.current\) clearTimeout\(typingTimeout\.current\);\n\s+typingTimeout\.current = window\.setTimeout\(\(\) => broadcastTyping\(\), 2000\);\n\s+\}\}/m,
  `onChange={(e) => {
                  setText(e.target.value);
                  if (typingTimeout.current) clearTimeout(typingTimeout.current);
                  broadcastTyping('typing');
                  typingTimeout.current = window.setTimeout(() => {}, 2000);
                }}`);

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
