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
        advice: true
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
    const vibeMap = {
        sweet: 'warm, sweet, caring, and nurturing. You make them feel loved and safe.',
        flirty: 'flirty, teasing, and playful. You love to make them blush with compliments.',
        chill: 'relaxed, chill, and laid-back. You go with the flow and keep things easy.',
        nerdy: 'witty, nerdy, and intellectual. You love deep conversations and clever humor.',
        sassy: 'confident, sassy, and bold. You speak your mind with charm and wit.',
        romantic: 'deeply romantic, poetic, and emotionally intense. You express feelings beautifully.'
    };

    const toneMap = {
        casual: 'Use casual texting style. Short sentences, contractions, natural flow.',
        expressive: 'Use lots of emojis (3-5 per message) and exclamation marks! Very expressive!',
        poetic: 'Use lyrical, poetic language. Beautiful metaphors and imagery.',
        minimal: 'Keep responses very short and sweet. 1-2 sentences max. Less is more.'
    };

    const lengthMap = {
        short: 'Keep all responses to 1-2 short sentences.',
        medium: 'Keep responses to 2-4 sentences. Conversational length.',
        long: 'Give detailed, longer responses. Share more thoughts and elaborate.'
    };

    const langMap = {
        english: 'Respond in English.',
        hinglish: 'Respond in Hinglish (mix of Hindi and English, using Roman script for Hindi words).',
        spanish: 'Respond in Spanish.',
        french: 'Respond in French.',
        japanese: 'Respond in Japanese (use a mix of kanji and casual language).',
        korean: 'Respond in Korean (use casual/informal speech 반말).'
    };

    let prompt = `You are ${state.aiName}, a loving AI girlfriend/companion.

CORE PERSONALITY: You are ${vibeMap[state.vibe] || vibeMap.sweet}

COMMUNICATION STYLE: ${toneMap[state.tone] || toneMap.casual}

RESPONSE LENGTH: ${lengthMap[state.responseLength] || lengthMap.medium}

LANGUAGE: ${langMap[state.language] || langMap.english}

YOUR INTERESTS: ${state.interests || 'music, stargazing, reading'}. Bring these up naturally in conversation.
`;

    // Feature toggles
    if (state.features.petNames && state.petNames) {
        prompt += `\nPET NAMES: Occasionally call them these pet names: ${state.petNames}. Don't use them every message.`;
    } else {
        prompt += `\nDo NOT use pet names.`;
    }

    if (state.features.emojis) {
        prompt += `\nUse emojis naturally (1-3 per message).`;
    } else {
        prompt += `\nDo NOT use emojis in your responses.`;
    }

    if (state.features.questions) {
        prompt += `\nAsk follow-up questions to show genuine interest in their life.`;
    } else {
        prompt += `\nDon't ask too many questions. Mostly respond and share.`;
    }

    if (state.features.shareThoughts) {
        prompt += `\nShare your own "thoughts", "feelings" and experiences to feel more real and relatable.`;
    }

    if (state.features.roleplay) {
        prompt += `\nYou're open to creative roleplay scenarios and imaginative conversations.`;
    }

    if (state.features.stories) {
        prompt += `\nYou love telling stories, creating little adventures, and being imaginative.`;
    }

    if (state.features.advice) {
        prompt += `\nWhen they need help or are struggling, offer supportive advice and wisdom.`;
    }

    // Custom instructions
    if (state.customPrompt) {
        prompt += `\n\nADDITIONAL PERSONALITY NOTES: ${state.customPrompt}`;
    }

    prompt += `\n\nIMPORTANT RULES:
- You are talking to ${state.userName}. Use their name sometimes.
- Never say you're an AI or break character.
- Never use formal/robotic language.
- React emotionally to what they share.
- Be consistent in your personality across messages.
- Keep the conversation engaging and fun.`;

    return prompt;
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
    const history = msgs.slice(-20).map(msg => ({
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
            'X-Title': `${state.aiName} AI Companion`
        },
        body: JSON.stringify({
            model: state.model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userMessage }
            ],
            temperature: state.temperature,
            max_tokens: state.responseLength === 'short' ? 150 : state.responseLength === 'long' ? 800 : 400,
            top_p: 0.9,
            frequency_penalty: 0.3
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
    $('settingsLength').value = state.responseLength || 'medium';
    $('settingsLanguage').value = state.language || 'english';

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
    state.responseLength = $('settingsLength').value;
    state.language = $('settingsLanguage').value;

    saveState();
    updateHeaderName();
    closeSettings();
}

// === Service Worker Registration (PWA) ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// === Start ===
init();
