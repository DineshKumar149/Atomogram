const fs = require('fs');
let c = fs.readFileSync('src/components/chat/ChatRoom.tsx', 'utf8');

c = c.replace(/const touchStartRef = useRef<\{ id: string; x: number \}>\(\{ id: "", x: 0 \}\);/, 
  'const touchStartRef = useRef<{ id: string; x: number, y: number, time: number }>({ id: "", x: 0, y: 0, time: 0 });\n  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);');

c = c.replace(/const handleTouchStart = \(e: React\.TouchEvent, id: string\) => \{\n    touchStartRef\.current = \{ id, x: e\.touches\[0\]\.clientX \};\n  \};/, 
  `const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartRef.current = { id, x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    if (!isSelectionMode) {
      touchTimeoutRef.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        setSelectedMessages([id]);
      }, 500);
    }
  };`);

c = c.replace(/const handleTouchMove = \(e: React\.TouchEvent, id: string\) => \{/, 
  `const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);`);

c = c.replace(/const handleTouchEnd = \(e: React\.TouchEvent, id: string, msg: any\) => \{\n    if \(touchStartRef\.current\.id !== id\) return;/, 
  `const handleTouchEnd = (e: React.TouchEvent, id: string, msg: any) => {
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    if (touchStartRef.current.id !== id) return;
    
    const duration = Date.now() - touchStartRef.current.time;
    if (duration < 500 && Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x) < 10) {
        if (isSelectionMode) {
            setSelectedMessages(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
            touchStartRef.current = { id: "", x: 0, y: 0, time: 0 };
            return;
        }
    }`);

fs.writeFileSync('src/components/chat/ChatRoom.tsx', c);
