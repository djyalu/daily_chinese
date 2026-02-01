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
    const lang = s.language || s.lang;

    if (lang) {
        // If language is explicitly provided (could be "ja-JP" or "ja-JP,es-ES")
        const langs = lang.split(',').map(l => l.trim().toLowerCase());
        langs.forEach((l, idx) => {
            // Normalizing common language codes
            let normalized = l;
            if (l === 'japanese' || l === 'ja') normalized = 'ja-JP';
            if (l === 'spanish' || l === 'es') normalized = 'es-ES';
            if (l === 'chinese' || l === 'zh') normalized = 'zh-CN';

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
    } else {
        // If no language provided, default to zh-CN but log it
        db.subscribers.push({
            id: db.subscribers.length + 1,
            email: s.email,
            level: s.level || 'beginner',
            language: 'zh-CN',
            topics: s.topics || 'daily,travel,business',
            timezone: s.timezone || 'Asia/Seoul',
            active: s.active !== false,
            created_at: new Date().toISOString()
        });
    }
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
