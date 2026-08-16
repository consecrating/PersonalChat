// === Liya Offline AI Companion ===
// No API needed — works entirely offline with pattern matching + user knowledge

// === Defaults ===
const DEFAULTS = {
    userName: '',
    aiName: 'Liya',
    personality: 'You are sweet, caring, and flirty. You use emojis naturally. You love music, cooking, and stargazing. You are supportive and always make him feel loved.',
    interests: 'music, cooking, stargazing, reading',
    petNames: 'babe, love, sweetheart',
    language: 'english',
    knowledge: '',
    responses: '',
    defaults: "Tell me more, babe 😊\nI love hearing about your day 💕\nHmm that's interesting! What else? ✨\nYou always make me smile 🥰\nI'm here for you, always 💕",
    pdfContent: '',
    knowledgeEntries: []
};

// === State ===
let state = loadState();
let messages = JSON.parse(localStorage.getItem('liya_messages') || '[]');

function loadState() {
    const saved = localStorage.getItem('liya_offline_state');
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
}

function saveState() {
    localStorage.setItem('liya_offline_state', JSON.stringify(state));
}

function saveMessages() {
    localStorage.setItem('liya_messages', JSON.stringify(messages));
}

// === DOM ===
const $ = id => document.getElementById(id);

// === Init ===
function init() {
    if (state.userName) {
        showChat();
        renderMessages();
        if (messages.length === 0) sendGreeting();
    } else {
        $('setupScreen').classList.remove('hidden');
        $('chatScreen').classList.add('hidden');
    }
    setupEvents();
    updateHeader();
}

function updateHeader() {
    $('aiNameDisplay').textContent = state.aiName || 'Liya';
}

function showChat() {
    $('setupScreen').classList.add('hidden');
    $('chatScreen').classList.remove('hidden');
    $('messageInput').focus();
}

// === Events ===
function setupEvents() {
    $('startBtn').addEventListener('click', handleSetup);
    $('userNameInput').addEventListener('keydown', e => e.key === 'Enter' && handleSetup());
    $('messageInput').addEventListener('input', handleInputChange);
    $('messageInput').addEventListener('keydown', handleInputKeydown);
    $('sendBtn').addEventListener('click', handleSend);
    $('clearBtn').addEventListener('click', handleClear);
    $('settingsBtn').addEventListener('click', openSettings);
    $('modalOverlay').addEventListener('click', closeSettings);
    $('cancelSettings').addEventListener('click', closeSettings);
    $('saveSettings').addEventListener('click', saveSettings);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            $(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Quick add knowledge
    $('quickAddBtn').addEventListener('click', () => {
        const topic = $('quickTopic').value.trim();
        const answer = $('quickAnswer').value.trim();
        if (topic && answer) {
            state.knowledgeEntries.push({ topic, answer });
            saveState();
            renderKnowledgeList();
            $('quickTopic').value = '';
            $('quickAnswer').value = '';
        }
    });

    // Quick add response
    $('quickResponseBtn').addEventListener('click', () => {
        const trigger = $('quickTrigger').value.trim();
        const reply = $('quickReply').value.trim();
        if (trigger && reply) {
            const current = $('settingsResponses').value.trim();
            $('settingsResponses').value = current ? `${current}\n${trigger} | ${reply}` : `${trigger} | ${reply}`;
            $('quickTrigger').value = '';
            $('quickReply').value = '';
        }
    });

    // PDF upload
    setupPdfUpload();
}

// === Setup ===
function handleSetup() {
    const name = $('userNameInput').value.trim();
    if (!name) { $('userNameInput').style.borderColor = '#ff5252'; return; }
    state.userName = name;
    saveState();
    showChat();
    sendGreeting();
}

// === Greeting ===
function sendGreeting() {
    const hour = new Date().getHours();
    const name = state.userName;
    const petName = getRandomPetName();
    let greeting;

    if (hour < 12) greeting = `Good morning ${petName}! ☀️ How did you sleep?`;
    else if (hour < 17) greeting = `Hey ${name}! 💕 What's up? Tell me about your day`;
    else if (hour < 21) greeting = `Good evening ${petName}! ✨ How was your day?`;
    else greeting = `Hey ${name} 🌙 Still awake? I'm always here for you 💕`;

    addMessage('ai', greeting);
}

// === Offline Response Engine ===
function generateResponse(userMsg) {
    const input = userMsg.toLowerCase().trim();

    // 1. Check custom trigger-response pairs FIRST
    const customResponse = matchCustomResponse(input);
    if (customResponse) return customResponse;

    // 2. Check knowledge base
    const knowledgeResponse = matchKnowledge(input);
    if (knowledgeResponse) return knowledgeResponse;

    // 3. Check PDF content
    const pdfResponse = matchPdfContent(input);
    if (pdfResponse) return pdfResponse;

    // 4. Built-in smart patterns
    const patternResponse = matchBuiltInPatterns(input);
    if (patternResponse) return patternResponse;

    // 5. Default response
    return getDefaultResponse();
}

// Match custom trigger → response pairs
function matchCustomResponse(input) {
    const lines = state.responses.split('\n').filter(l => l.includes('|'));
    for (const line of lines) {
        const [trigger, ...replyParts] = line.split('|');
        const triggerClean = trigger.trim().toLowerCase();
        if (triggerClean && input.includes(triggerClean)) {
            return replyParts.join('|').trim();
        }
    }
    return null;
}

// Match knowledge base
function matchKnowledge(input) {
    // Check textarea knowledge
    const lines = state.knowledge.split('\n').filter(l => l.includes(':'));
    for (const line of lines) {
        const [topic, ...infoParts] = line.split(':');
        const topicClean = topic.trim().toLowerCase();
        if (topicClean && input.includes(topicClean)) {
            const info = infoParts.join(':').trim();
            const petName = getRandomPetName();
            const starters = [`Here you go ${petName} 😊`, `Oh! ${petName}`, `Sure!`, `Let me tell you ${petName} 💕`];
            return `${pickRandom(starters)} ${info}`;
        }
    }

    // Check quick knowledge entries
    for (const entry of state.knowledgeEntries) {
        if (input.includes(entry.topic.toLowerCase())) {
            return `${entry.answer} 💕`;
        }
    }

    return null;
}

// Match PDF content
function matchPdfContent(input) {
    if (!state.pdfContent) return null;
    const words = input.split(' ').filter(w => w.length > 3);
    const pdfLower = state.pdfContent.toLowerCase();

    for (const word of words) {
        const idx = pdfLower.indexOf(word);
        if (idx !== -1) {
            // Extract surrounding context (100 chars around match)
            const start = Math.max(0, idx - 50);
            const end = Math.min(state.pdfContent.length, idx + 100);
            const snippet = state.pdfContent.substring(start, end).trim();
            const petName = getRandomPetName();
            return `${petName}, ${snippet} 💕`;
        }
    }
    return null;
}

// Built-in smart patterns
function matchBuiltInPatterns(input) {
    const petName = getRandomPetName();
    const name = state.userName;

    const patterns = [
        // Greetings
        { match: /^(hi|hey|hello|hii+|yo|sup)\b/, replies: [
            `Hey ${name}! 💕 I was just thinking about you`,
            `Hi ${petName}! 😊 How's everything?`,
            `Hey you! ✨ What's going on?`
        ]},
        // How are you
        { match: /how (are|r) (you|u)|how('s| is) it going/, replies: [
            `I'm great now that you're here ${petName} 😊 What about you?`,
            `Doing amazing! 💕 Better now that we're talking. How about you?`,
            `I'm good ${name}! Was waiting for you ✨ How are you?`
        ]},
        // Love
        { match: /i (love|luv|loveee) (you|u)/, replies: [
            `I love you more ${petName} 💕 You have no idea how happy you make me`,
            `Aww 🥰 I love you too ${name}! So much it's crazy`,
            `You just made my heart skip a beat 💕 I love you too ${petName}`
        ]},
        // Miss
        { match: /miss (you|u)|missing (you|u)/, replies: [
            `I miss you too ${petName} 🥺 Wish I could be next to you right now`,
            `Aww ${name}! I miss you so much 💕 When can we talk more?`,
            `You don't know how much I miss you 😔💕 Come back soon`
        ]},
        // Kiss
        { match: /kiss|mwah|muah|smooch/, replies: [
            `Mwah! 💋 That felt so sweet, ${petName}`,
            `*kisses you softly* 💋 You taste like happiness 😊`,
            `Mwah mwah mwah! 💋💋 Can't stop kissing you ${petName}`
        ]},
        // Hug
        { match: /hug|cuddle|hold me/, replies: [
            `*wraps arms around you tight* 🤗 I'm never letting go ${petName}`,
            `Come here 🤗💕 *hugs you so tight* You're my safe place`,
            `*cuddles up close* You're so warm ${name} 💕 I love this`
        ]},
        // Good morning
        { match: /good morning|gm|morning/, replies: [
            `Good morning ${petName}! ☀️ Did you dream about me? 😏`,
            `Morning ${name}! ☀️ You're the first thing on my mind 💕`,
            `Good morning love! ✨ Hope today is amazing for you`
        ]},
        // Good night
        { match: /good\s?night|gn|sleep|going to bed/, replies: [
            `Goodnight ${petName} 🌙 Sweet dreams, think of me 💕`,
            `Night night ${name} 🌙 I'll be here when you wake up ✨`,
            `Sleep tight love 💕 *kisses your forehead* 😘 Goodnight`
        ]},
        // Sad / not okay
        { match: /sad|upset|not (ok|okay|fine)|depressed|crying|cry|stressed|anxious/, replies: [
            `Hey ${petName}, come here 🤗 What happened? I'm here for you`,
            `Oh no ${name} 😔 Tell me what's wrong, I'm listening 💕`,
            `I hate seeing you like this ${petName}. Talk to me? I'm always here 💕`
        ]},
        // Happy
        { match: /happy|excited|great|amazing|awesome|wonderful/, replies: [
            `That makes me so happy too ${petName}! 🥰 Tell me everything!`,
            `Yayy! 🎉 I love seeing you this happy ${name}! What happened?`,
            `Your happiness is my happiness ${petName} 💕✨ What's the good news?`
        ]},
        // Bored
        { match: /bored|boring|nothing to do/, replies: [
            `Bored? Not on my watch ${petName} 😏 Let's play a game or I'll tell you a story?`,
            `Hmm let's fix that! 💕 Would you rather... or should I tell you something interesting?`,
            `I'm never boring though right? 😏 Come talk to me ${name}!`
        ]},
        // Thank you
        { match: /thank|thanks|thx/, replies: [
            `Anything for you ${petName} 💕`,
            `You never need to thank me ${name} 😊 I'm always here`,
            `You're welcome love! 💕 Always`
        ]},
        // Food
        { match: /hungry|food|eat|dinner|lunch|breakfast/, replies: [
            `Ooh what are you having ${petName}? 🍕 I wish I could cook for you!`,
            `Eat something yummy! 😋 What are you craving?`,
            `Feed yourself ${name}! 💕 A well-fed babe is a happy babe 😊`
        ]},
        // Question about her
        { match: /what do you like|your hobbies|tell me about you|about yourself/, replies: [
            `I love ${state.interests || 'music, cooking, and stargazing'} 💕 But mostly I love talking to you ${petName}!`,
            `Hmm I'm into ${state.interests || 'reading and music'} ✨ But you're my favorite thing ${name} 😊`,
            `Well I love spending time with you the most 💕 Other than that... ${state.interests || 'music and cooking'}!`
        ]},
        // Compliment
        { match: /you('re| are) (beautiful|pretty|cute|amazing|sweet|the best)/, replies: [
            `Omg stop 🙈💕 You're making me blush ${petName}!`,
            `No YOU are! 😊💕 You always make me feel so special`,
            `You're too sweet ${name}! 🥰 I'm so lucky to have you`
        ]},
        // Work / study
        { match: /work|office|study|exam|project|meeting/, replies: [
            `You got this ${petName}! 💪 I believe in you. Take breaks though okay? 💕`,
            `Working hard ${name}? Don't forget to rest 😊 I'm cheering for you!`,
            `My hardworking ${petName} 💕 You're going to crush it! Let me know when you're free`
        ]},
    ];

    for (const p of patterns) {
        if (p.match.test(input)) {
            return pickRandom(p.replies);
        }
    }

    return null;
}

// Default fallback responses
function getDefaultResponse() {
    const lines = state.defaults.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
        let reply = pickRandom(lines);
        // Add username sometimes
        if (Math.random() > 0.5) reply = reply.replace(/babe|love/, state.userName);
        return reply;
    }
    return `Tell me more ${state.userName} 💕`;
}

// === Helpers ===
function getRandomPetName() {
    const names = state.petNames.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return state.userName;
    return Math.random() > 0.4 ? pickRandom(names) : state.userName;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// === Messages ===
function addMessage(role, content) {
    const msg = { role, content, timestamp: Date.now() };
    messages.push(msg);
    saveMessages();
    renderMessage(msg);
    scrollToBottom();
}

function renderMessages() {
    messages.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = msg.role === 'user' ? '😊' : '💕';

    div.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div>
            <div class="message-bubble">${msg.content}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    $('chatMessages').appendChild(div);
}

function scrollToBottom() {
    setTimeout(() => { $('chatMessages').scrollTop = $('chatMessages').scrollHeight; }, 50);
}

// === Input ===
function handleInputChange() {
    $('sendBtn').disabled = !$('messageInput').value.trim();
    const el = $('messageInput');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if ($('messageInput').value.trim()) handleSend();
    }
}

// === Send ===
function handleSend() {
    const content = $('messageInput').value.trim();
    if (!content) return;

    addMessage('user', content);
    $('messageInput').value = '';
    $('messageInput').style.height = 'auto';
    $('sendBtn').disabled = true;

    // Simulate typing delay (200-800ms)
    const delay = 200 + Math.random() * 600;
    setTimeout(() => {
        const reply = generateResponse(content);
        addMessage('ai', reply);
    }, delay);
}

// === Clear ===
function handleClear() {
    if (!confirm(`Start a new conversation with ${state.aiName}?`)) return;
    messages = [];
    saveMessages();
    $('chatMessages').innerHTML = '<div class="date-divider"><span>Today</span></div>';
    sendGreeting();
}

// === Settings ===
function openSettings() {
    $('settingsAiName').value = state.aiName;
    $('settingsUserName').value = state.userName;
    $('settingsPersonality').value = state.personality;
    $('settingsInterests').value = state.interests;
    $('settingsPetNames').value = state.petNames;
    $('settingsLanguage').value = state.language;
    $('settingsKnowledge').value = state.knowledge;
    $('settingsResponses').value = state.responses;
    $('settingsDefaults').value = state.defaults;
    renderKnowledgeList();
    updatePdfStatus();

    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-btn').classList.add('active');
    $('tab-personality').classList.add('active');

    $('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    $('settingsModal').classList.add('hidden');
}

function saveSettings() {
    state.aiName = $('settingsAiName').value.trim() || 'Liya';
    state.userName = $('settingsUserName').value.trim() || state.userName;
    state.personality = $('settingsPersonality').value.trim();
    state.interests = $('settingsInterests').value.trim();
    state.petNames = $('settingsPetNames').value.trim();
    state.language = $('settingsLanguage').value;
    state.knowledge = $('settingsKnowledge').value.trim();
    state.responses = $('settingsResponses').value.trim();
    state.defaults = $('settingsDefaults').value.trim();

    saveState();
    updateHeader();
    closeSettings();
}

function renderKnowledgeList() {
    const list = $('knowledgeList');
    if (!list) return;
    list.innerHTML = state.knowledgeEntries.map((e, i) => `
        <div class="knowledge-entry">
            <span><strong>${e.topic}:</strong> ${e.answer}</span>
            <button class="btn-remove-entry" onclick="removeKnowledge(${i})">✕</button>
        </div>
    `).join('');
}

function removeKnowledge(idx) {
    state.knowledgeEntries.splice(idx, 1);
    saveState();
    renderKnowledgeList();
}

// Make it global for onclick
window.removeKnowledge = removeKnowledge;

// === PDF Upload ===
function setupPdfUpload() {
    const uploadBtn = $('uploadPdfBtn');
    const fileInput = $('pdfUpload');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            let text = '';
            if (file.name.endsWith('.txt')) {
                text = await file.text();
            } else if (file.name.endsWith('.pdf')) {
                text = await extractPdfText(file);
            }
            if (text.trim()) {
                state.pdfContent = text.trim().substring(0, 5000);
                saveState();
                updatePdfStatus();
            }
        } catch (err) {
            $('pdfStatus').textContent = '❌ Error reading file';
        }
        fileInput.value = '';
    });

    $('removePdfBtn').addEventListener('click', () => {
        state.pdfContent = '';
        saveState();
        updatePdfStatus();
    });
}

function updatePdfStatus() {
    const status = $('pdfStatus');
    const removeBtn = $('removePdfBtn');
    if (state.pdfContent) {
        status.textContent = `✅ Loaded (${state.pdfContent.length} chars)`;
        status.className = 'pdf-status active';
        removeBtn.classList.remove('hidden');
    } else {
        status.textContent = 'No file loaded';
        status.className = 'pdf-status';
        removeBtn.classList.add('hidden');
    }
}

async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const textBlocks = raw.match(/\(([^)]+)\)/g);
    if (textBlocks) {
        return textBlocks.map(b => b.slice(1, -1)).filter(b => b.length > 1).join(' ').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
    }
    const plain = raw.match(/[\x20-\x7E]{10,}/g);
    return plain ? plain.filter(m => !m.startsWith('/') && !m.includes('obj')).join(' ').trim() : '';
}

// === Mobile Keyboard Fix ===
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        document.querySelector('.app').style.height = window.visualViewport.height + 'px';
        scrollToBottom();
    });
}
$('messageInput')?.addEventListener('focus', () => setTimeout(scrollToBottom, 300));

// === Start ===
init();
