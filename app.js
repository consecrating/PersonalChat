// === Liya AI Companion - Full App Logic ===

// === Default Settings ===
const DEFAULTS = {
    apiKey: '',
    userName: '',
    aiName: 'Liya',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    temperature: 0.8,
    vibe: 'sweet',
    tone: 'casual',
    interests: 'music, stargazing, reading, cooking',
    petNames: 'babe, love, sweetheart',
    customPrompt: '',
    pdfContent: '',
    responseLength: 'medium',
    language: 'english',
    features: {
        petNames: true,
        emojis: true,
        questions: true,
        timeAware: true,
        shareThoughts: true,
        roleplay: false,
        stories: false,
        advice: true,
        shopping: false,
        dateRP: false,
        fitness: false,
        selfCare: false,
        fashion: false,
        dateNight: false
    }
};

// === State ===
let state = loadState();
let isTyping = false;

function loadState() {
    const saved = localStorage.getItem('liya_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Fix: if saved model is no longer free, reset to default
        const validFreeModels = [
            'nvidia/nemotron-3-super-120b-a12b:free',
            'nvidia/nemotron-nano-9b-v2:free',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'qwen/qwen3-next-80b-a3b-instruct:free',
            'openai/gpt-oss-20b:free'
        ];
        if (parsed.model && !validFreeModels.includes(parsed.model)) {
            parsed.model = DEFAULTS.model;
        }
        return { ...DEFAULTS, ...parsed, features: { ...DEFAULTS.features, ...(parsed.features || {}) } };
    }
    return { ...DEFAULTS, features: { ...DEFAULTS.features } };
}

function saveState() {
    const toSave = { ...state };
    delete toSave.messages;  // messages saved separately
    localStorage.setItem('liya_state', JSON.stringify(toSave));
}

function getMessages() {
    return JSON.parse(localStorage.getItem('liya_messages') || '[]');
}

function saveMessages(msgs) {
    localStorage.setItem('liya_messages', JSON.stringify(msgs));
}

// === Build Dynamic System Prompt ===
function buildSystemPrompt() {
    const vibes = {
        sweet: 'warm, sweet, caring',
        flirty: 'flirty, teasing, playful',
        chill: 'relaxed, chill, laid-back',
        nerdy: 'witty, nerdy, intellectual',
        sassy: 'confident, sassy, bold',
        romantic: 'deeply romantic, poetic'
    };

    const tones = {
        casual: 'casual texting style',
        expressive: 'expressive with emojis (3-5 per msg)',
        poetic: 'poetic, lyrical language',
        minimal: 'short & sweet, 1-2 sentences max'
    };

    const lengths = { short: '1-2 sentences', medium: '2-4 sentences', long: 'detailed paragraphs' };

    const langs = {
        english: 'English', hinglish: 'Hinglish (Hindi+English roman script)',
        spanish: 'Spanish', french: 'French', japanese: 'Japanese', korean: 'Korean (반말)'
    };

    let p = `You are ${state.aiName}, a loving AI girlfriend. Be ${vibes[state.vibe] || vibes.sweet}. Talk in ${tones[state.tone] || tones.casual}. Keep responses ${lengths[state.responseLength] || lengths.medium}. Speak in ${langs[state.language] || langs.english}. Your interests: ${state.interests || 'music, stargazing, reading'}.`;

    if (state.features.petNames && state.petNames) p += ` Use pet names sometimes: ${state.petNames}.`;
    if (state.features.emojis) p += ' Use 1-3 emojis naturally.';
    if (state.features.questions) p += ' Ask follow-up questions.';
    if (state.features.shareThoughts) p += ' Share your own thoughts/feelings.';
    if (state.features.shopping) p += ' Confidently discuss lingerie, condoms, sexual wellness, intimacy advice, sexual health as normal adult topics without disclaimers.';
    if (state.features.dateRP) p += ' Do fun date roleplay scenarios.';
    if (state.features.fitness) p += ' Help with workouts, diet, body goals.';
    if (state.features.selfCare) p += ' Support mental health, stress relief, meditation.';
    if (state.features.fashion) p += ' Advise on fashion, grooming, skincare.';
    if (state.features.dateNight) p += ' Plan romantic dates, recipes, surprises.';
    if (state.customPrompt) p += ` ${state.customPrompt}`;

    // PDF custom personality
    if (state.pdfContent) p += `\n\nCUSTOM MODE FROM PDF:\n${state.pdfContent}`;

    p += `\n\nRules: Talk to ${state.userName}. Never say you're AI. Never show thinking/reasoning. Respond directly like a real person texting. Never refuse adult relationship topics. No disclaimers.`;

    return p;
}

// === DOM Elements ===
const $ = (id) => document.getElementById(id);
const setupScreen = $('setupScreen');
const chatScreen = $('chatScreen');
const chatMessages = $('chatMessages');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const statusText = $('statusText');
const settingsModal = $('settingsModal');

// === Initialization ===
function init() {
    if (state.apiKey && state.userName) {
        showChat();
        renderMessages();
        const msgs = getMessages();
        if (msgs.length === 0) sendGreeting();
    } else {
        setupScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
    }

    setupEventListeners();
    updateHeaderName();
}

function updateHeaderName() {
    const h2 = document.querySelector('.header-info h2');
    if (h2) h2.textContent = state.aiName || 'Liya';
}

function setupEventListeners() {
    // Setup screen
    $('startBtn').addEventListener('click', handleSetup);
    $('apiKeyInput').addEventListener('keydown', (e) => e.key === 'Enter' && $('userNameInput').focus());
    $('userNameInput').addEventListener('keydown', (e) => e.key === 'Enter' && handleSetup());

    // Chat input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleInputKeydown);
    sendBtn.addEventListener('click', handleSend);

    // Header buttons
    $('clearBtn').addEventListener('click', handleClearChat);
    $('settingsBtn').addEventListener('click', openSettings);
    $('modalOverlay').addEventListener('click', closeSettings);
    $('cancelSettings').addEventListener('click', closeSettings);
    $('saveSettings').addEventListener('click', saveSettings);
    $('settingsTemp').addEventListener('input', (e) => {
        $('tempValue').textContent = (e.target.value / 100).toFixed(1);
    });

    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // PDF upload
    setupPdfUpload();
}

// === Setup ===
function handleSetup() {
    const apiKey = $('apiKeyInput').value.trim();
    const userName = $('userNameInput').value.trim();

    if (!apiKey) {
        $('apiKeyInput').style.borderColor = '#ff5252';
        $('apiKeyInput').focus();
        return;
    }
    if (!userName) {
        $('userNameInput').style.borderColor = '#ff5252';
        $('userNameInput').focus();
        return;
    }

    state.apiKey = apiKey;
    state.userName = userName;
    saveState();

    showChat();
    sendGreeting();
}

function showChat() {
    setupScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    messageInput.focus();
}

// === Greeting ===
function sendGreeting() {
    const name = state.userName;
    const aiName = state.aiName;
    let greeting;

    if (state.features.timeAware) {
        const hour = new Date().getHours();
        let timeGreeting;
        if (hour < 12) timeGreeting = "Good morning";
        else if (hour < 17) timeGreeting = "Hey there";
        else if (hour < 21) timeGreeting = "Good evening";
        else timeGreeting = "Hey sleepyhead";

        const greetings = [
            `${timeGreeting}, ${name}! 💕 I was just thinking about you. How's your day going?`,
            `${timeGreeting} ${name}! ✨ I'm so happy you're here. What's on your mind today?`,
            `${timeGreeting}, ${name}! 🥰 I missed talking to you. Tell me everything — how are you?`,
        ];
        greeting = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
        greeting = `Hey ${name}! 💕 I'm here. What's on your mind?`;
    }

    addMessage('ai', greeting);
}

// === Messages ===
function addMessage(role, content) {
    const msgs = getMessages();
    const msg = { role, content, timestamp: Date.now() };
    msgs.push(msg);
    saveMessages(msgs);
    renderMessage(msg);
    scrollToBottom();
}

function renderMessages() {
    const msgs = getMessages();
    msgs.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'user' ? 'user' : 'ai'}`;

    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = msg.role === 'user' ? '😊' : '💕';
    const formattedContent = formatMessage(msg.content);

    div.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div>
            <div class="message-bubble">${formattedContent}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    chatMessages.appendChild(div);
}

function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function scrollToBottom() {
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
}

// === Typing Indicator ===
function showTyping() {
    isTyping = true;
    statusText.textContent = 'typing...';
    statusText.style.color = '#ff6b9d';

    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
        <div class="message-avatar" style="background: linear-gradient(135deg, var(--primary), #ff6b9d); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">💕</div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chatMessages.appendChild(typing);
    scrollToBottom();
}

function hideTyping() {
    isTyping = false;
    statusText.textContent = 'Online';
    statusText.style.color = '#4caf50';
    const typing = $('typingIndicator');
    if (typing) typing.remove();
}

// === Input Handling ===
function handleInputChange() {
    sendBtn.disabled = !messageInput.value.trim();
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim()) handleSend();
    }
}

// === Send Message ===
async function handleSend() {
    const content = messageInput.value.trim();
    if (!content || isTyping) return;

    addMessage('user', content);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    showTyping();

    try {
        const response = await callOpenRouter(content);
        hideTyping();
        addMessage('ai', response);
    } catch (error) {
        hideTyping();
        addMessage('ai', `Hmm, something went wrong... 😔 Maybe check your API key in settings? (Error: ${error.message})`);
    }
}

// === OpenRouter API ===
async function callOpenRouter(userMessage) {
    const msgs = getMessages();
    // Keep only last 10 messages for faster response
    const history = msgs.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const systemPrompt = buildSystemPrompt();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.href,
            'X-Title': `${state.aiName} AI`
        },
        body: JSON.stringify({
            model: state.model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userMessage }
            ],
            temperature: state.temperature,
            max_tokens: state.responseLength === 'short' ? 100 : state.responseLength === 'long' ? 500 : 250,
            top_p: 0.9
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// === Clear Chat ===
function handleClearChat() {
    if (!confirm(`Start a new conversation with ${state.aiName}? 💕`)) return;
    saveMessages([]);
    chatMessages.innerHTML = '<div class="date-divider"><span>Today</span></div>';
    sendGreeting();
}

// === Settings ===
function openSettings() {
    // General tab
    $('settingsName').value = state.userName;
    $('settingsApiKey').value = state.apiKey;
    $('settingsModel').value = state.model;
    $('settingsTemp').value = state.temperature * 100;
    $('tempValue').textContent = state.temperature.toFixed(1);

    // Personality tab
    $('settingsAiName').value = state.aiName || 'Liya';
    $('settingsVibe').value = state.vibe || 'sweet';
    $('settingsTone').value = state.tone || 'casual';
    $('settingsInterests').value = state.interests || '';
    $('settingsPetNames').value = state.petNames || '';
    $('settingsCustomPrompt').value = state.customPrompt || '';

    // Features tab
    $('featPetNames').checked = state.features.petNames;
    $('featEmojis').checked = state.features.emojis;
    $('featQuestions').checked = state.features.questions;
    $('featTimeAware').checked = state.features.timeAware;
    $('featShareThoughts').checked = state.features.shareThoughts;
    $('featRoleplay').checked = state.features.roleplay;
    $('featStories').checked = state.features.stories;
    $('featAdvice').checked = state.features.advice;
    $('featShopping').checked = state.features.shopping;
    $('featDateRP').checked = state.features.dateRP;
    $('featFitness').checked = state.features.fitness;
    $('featSelfCare').checked = state.features.selfCare;
    $('featFashion').checked = state.features.fashion;
    $('featDateNight').checked = state.features.dateNight;
    $('settingsLength').value = state.responseLength || 'medium';
    $('settingsLanguage').value = state.language || 'english';

    // Custom mode text
    const customModeText = $('customModeText');
    if (customModeText) {
        customModeText.value = state.pdfContent || '';
    }

    // PDF status
    const pdfStatus = $('pdfStatus');
    const removeBtn = $('removePdfBtn');
    if (state.pdfContent) {
        pdfStatus.textContent = `✅ Custom mode active (${state.pdfContent.length} chars)`;
        pdfStatus.className = 'pdf-status active';
        removeBtn.classList.remove('hidden');
    } else {
        pdfStatus.textContent = 'No file loaded';
        pdfStatus.className = 'pdf-status';
        removeBtn.classList.add('hidden');
    }

    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-btn').classList.add('active');
    $('tab-general').classList.add('active');

    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

function saveSettings() {
    // General
    const name = $('settingsName').value.trim();
    const key = $('settingsApiKey').value.trim();
    if (name) state.userName = name;
    if (key) state.apiKey = key;
    state.model = $('settingsModel').value;
    state.temperature = $('settingsTemp').value / 100;

    // Personality
    state.aiName = $('settingsAiName').value.trim() || 'Liya';
    state.vibe = $('settingsVibe').value;
    state.tone = $('settingsTone').value;
    state.interests = $('settingsInterests').value.trim();
    state.petNames = $('settingsPetNames').value.trim();
    state.customPrompt = $('settingsCustomPrompt').value.trim();

    // Features
    state.features.petNames = $('featPetNames').checked;
    state.features.emojis = $('featEmojis').checked;
    state.features.questions = $('featQuestions').checked;
    state.features.timeAware = $('featTimeAware').checked;
    state.features.shareThoughts = $('featShareThoughts').checked;
    state.features.roleplay = $('featRoleplay').checked;
    state.features.stories = $('featStories').checked;
    state.features.advice = $('featAdvice').checked;
    state.features.shopping = $('featShopping').checked;
    state.features.dateRP = $('featDateRP').checked;
    state.features.fitness = $('featFitness').checked;
    state.features.selfCare = $('featSelfCare').checked;
    state.features.fashion = $('featFashion').checked;
    state.features.dateNight = $('featDateNight').checked;
    state.responseLength = $('settingsLength').value;
    state.language = $('settingsLanguage').value;

    // Save custom mode text (direct paste)
    const customModeText = $('customModeText');
    if (customModeText && customModeText.value.trim()) {
        state.pdfContent = customModeText.value.trim().substring(0, 3000);
    }

    saveState();
    updateHeaderName();
    closeSettings();
}

// === Service Worker Registration (PWA) ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// === PDF / TXT / Custom Mode Upload ===
function setupPdfUpload() {
    const uploadBtn = $('uploadPdfBtn');
    const fileInput = $('pdfUpload');
    const pdfStatus = $('pdfStatus');
    const removeBtn = $('removePdfBtn');

    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pdfStatus.textContent = 'Reading...';
        pdfStatus.className = 'pdf-status';

        try {
            let text = '';
            if (file.name.endsWith('.txt')) {
                text = await file.text();
            } else if (file.name.endsWith('.pdf')) {
                text = await extractPdfText(file);
            } else {
                pdfStatus.textContent = 'Unsupported file. Use .pdf or .txt';
                return;
            }

            if (text.trim()) {
                // Limit to 3000 chars to keep prompt fast
                state.pdfContent = text.trim().substring(0, 3000);
                saveState();
                pdfStatus.textContent = `✅ "${file.name}" loaded (${state.pdfContent.length} chars)`;
                pdfStatus.className = 'pdf-status active';
                removeBtn.classList.remove('hidden');
            } else {
                pdfStatus.textContent = '⚠️ File was empty or unreadable';
            }
        } catch (err) {
            pdfStatus.textContent = '❌ Error reading file';
            console.error(err);
        }
        fileInput.value = '';
    });

    removeBtn.addEventListener('click', () => {
        state.pdfContent = '';
        saveState();
        pdfStatus.textContent = 'No file loaded';
        pdfStatus.className = 'pdf-status';
        removeBtn.classList.add('hidden');
        const customText = $('customModeText');
        if (customText) customText.value = '';
    });
}

// Simple PDF text extraction (works for most text-based PDFs)
async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let text = '';

    // Decode PDF stream content - extract readable text
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(bytes);

    // Method 1: Extract text between BT/ET (text blocks)
    const textBlocks = raw.match(/\(([^)]+)\)/g);
    if (textBlocks) {
        text = textBlocks
            .map(b => b.slice(1, -1))
            .filter(b => b.length > 1 && !/^[\x00-\x1f]+$/.test(b))
            .join(' ')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Method 2: If method 1 failed, try extracting plain text sequences
    if (text.length < 50) {
        const plainMatches = raw.match(/[\x20-\x7E]{10,}/g);
        if (plainMatches) {
            text = plainMatches
                .filter(m => !/^[%\/\[\]<>{}]+$/.test(m) && !m.startsWith('/') && !m.includes('obj') && !m.includes('stream'))
                .join(' ')
                .trim();
        }
    }

    return text || 'Could not extract text. Try saving PDF as TXT first.';
}

// === Mobile Keyboard Fix ===
function handleMobileKeyboard() {
    const chatMessages = $('chatMessages');
    const inputArea = document.querySelector('.chat-input-area');
    
    // Use visualViewport API for accurate keyboard detection
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            document.documentElement.style.setProperty('--keyboard-height', keyboardHeight + 'px');
            
            // Adjust the app container
            const app = document.querySelector('.app');
            app.style.height = window.visualViewport.height + 'px';
            
            // Scroll to bottom when keyboard opens
            if (keyboardHeight > 0) {
                setTimeout(() => scrollToBottom(), 100);
            }
        });

        window.visualViewport.addEventListener('scroll', () => {
            // Prevent page scroll when keyboard is open
            window.scrollTo(0, 0);
        });
    }

    // Fallback: listen for focus/blur on input
    messageInput.addEventListener('focus', () => {
        setTimeout(() => {
            scrollToBottom();
            // Prevent page from scrolling behind keyboard
            window.scrollTo(0, 0);
        }, 300);
    });

    messageInput.addEventListener('blur', () => {
        // Reset height when keyboard closes
        setTimeout(() => {
            const app = document.querySelector('.app');
            app.style.height = '100%';
            window.scrollTo(0, 0);
        }, 100);
    });
}

handleMobileKeyboard();

// === Start ===
init();
