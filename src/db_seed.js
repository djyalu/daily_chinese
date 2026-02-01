import fs from 'fs';
import path from 'path';

const p = 'data/db.json';
const raw = process.env.SUBSCRIBERS_JSON || '[]';
let list = [];

try {
    list = JSON.parse(raw);
} catch (e) {
    console.error('Failed to parse SUBSCRIBERS_JSON:', e.message);
}

const db = fs.existsSync(p)
    ? JSON.parse(fs.readFileSync(p, 'utf8'))
    : { subscribers: [], topics: [], email_logs: [] };

// Clear existing subscribers before seeding
db.subscribers = [];

list.forEach((s, i) => {
    // Support both 'language' and 'lang' keys
    const lang = s.language || s.lang || s.languages;

    // Debug: Print the first subscriber object to see what's actually inside
    if (i === 0) {
        console.log('Debug - First subscriber object:', JSON.stringify(s));
    }

    const targetLangs = lang
        ? lang.split(',').map(l => l.trim().toLowerCase())
        : ['zh-cn', 'ja-jp', 'es-es']; // Default to all if not specified

    targetLangs.forEach((l) => {
        // Normalizing common language codes
        let normalized = l;
        if (l === 'japanese' || l === 'ja' || l === 'ja-jp') normalized = 'ja-JP';
        else if (l === 'spanish' || l === 'es' || l === 'es-es') normalized = 'es-ES';
        else if (l === 'chinese' || l === 'zh' || l === 'zh-cn') normalized = 'zh-CN';

        db.subscribers.push({
            id: db.subscribers.length + 1,
            email: s.email,
            level: s.level || 'beginner',
            language: normalized,
            topics: s.topics || 'daily,travel,business',
            timezone: s.timezone || 'Asia/Seoul',
            active: s.active !== false,
            created_at: new Date().toISOString()
        });
    });
});

fs.writeFileSync(p, JSON.stringify(db, null, 2));

console.log(`Seeded ${db.subscribers.length} total subscriber entries.`);
const stats = db.subscribers.reduce((acc, s) => {
    acc[s.language] = (acc[s.language] || 0) + 1;
    return acc;
}, {});
console.log('Language distribution:', JSON.stringify(stats));

// Debug: Print the keys of the first subscriber to see what's available
if (list.length > 0) {
    console.log('Detected keys in SUBSCRIBERS_JSON[0]:', Object.keys(list[0]).join(', '));
}
