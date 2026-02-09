console.log("✅ Chat Anchor Extension: Performance Optimized Edition");

const PROCESSED_ATTR = "data-anchor-processed";
const ANCHORED_ATTR = "data-anchor-marked";
let anchors = [];
let dashboard;
let lastPath = location.pathname;
let isUpdatingSidebar = false;

const M3 = {
    surface: "#1d1b20",
    primary: "#d0bcff",
    brightBg: "#fef7ff",
    brightText: "#6750a4",
    successBg: "#b4f0ad",
    successText: "#00390a",
    outline: "#49454f"
};

// --- 1. FIXED SIDEBAR RENAMER ---
function updateSidebarTitle() {
    if (isUpdatingSidebar) return; 
    isUpdatingSidebar = true;

    const sidebarLinks = document.querySelectorAll('nav a[href*="/c/"]');
    
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        const match = href.match(/\/c\/([a-z0-9-]+)/);
        if (!match) return;
        
        const chatId = match[1];
        const savedData = JSON.parse(localStorage.getItem(`anchors_${chatId}`) || "[]");
        const count = savedData.length;

        let emoji = "";
        if (count === 1) emoji = "🔵";
        else if (count === 2) emoji = "🟢";
        else if (count === 3) emoji = "🔴";
        else if (count === 4) emoji = "🟠";
        else if (count >= 5) emoji = "🟣";

        const titleElement = link.querySelector('div.relative.grow') || link.querySelector('div.flex-1.truncate') || link.querySelector('div');
        
        if (titleElement) {
            let currentText = titleElement.innerText.trim();
            // Clean any existing anchor emojis first
            let cleanText = currentText.replace(/^[🔵🟢🔴🟠🟣]\s*/, "");
            
            let newText = count > 0 ? `${emoji} ${cleanText}` : cleanText;
            
            if (currentText !== newText) {
                titleElement.innerText = newText;
            }
        }
    });

    setTimeout(() => { isUpdatingSidebar = false; }, 500);
}

// --- PERSISTENCE LOGIC ---
function getChatId() {
    const match = location.pathname.match(/\/c\/([a-z0-9-]+)/);
    return match ? match[1] : null;
}

function saveToStorage() {
    const chatId = getChatId();
    if (!chatId) return;
    const data = anchors.map(a => ({ name: a.name, text: a.element.innerText.substring(0, 50) }));
    localStorage.setItem(`anchors_${chatId}`, JSON.stringify(data));
    updateSidebarTitle();
}

function loadFromStorage() {
    const chatId = getChatId();
    if (!chatId) return [];
    const saved = localStorage.getItem(`anchors_${chatId}`);
    return saved ? JSON.parse(saved) : [];
}

// --- UI & MESSAGE LOGIC ---
function createDashboard() {
    if (document.getElementById("anchor-dash")) return;
    dashboard = document.createElement("div");
    dashboard.id = "anchor-dash";
    Object.assign(dashboard.style, {
        position: "fixed", right: "20px", top: "100px", width: "220px",
        maxHeight: "300px", overflowY: "auto", background: M3.surface, 
        border: `1px solid ${M3.outline}`, borderRadius: "8px", padding: "8px",
        zIndex: "9999", fontSize: "13px", color: "#e6e1e5", boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
    });
    dashboard.innerHTML = `<div style="text-align:center;"><b style="color:${M3.primary}">Current Anchors</b></div><hr style="border:0; border-top:1px solid ${M3.outline}; margin: 5px 0;"/><div id="anchor-list"></div>`;
    document.body.appendChild(dashboard);
}

function resetForNewChat() {
    anchors = [];
    const container = document.getElementById("anchor-list");
    if (container) container.innerHTML = "";
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR));
}

// --- 2. FIXED MESSAGE FILTERING (No more buttons) ---
function processMessages() {
    if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        resetForNewChat();
    }
    if (!location.pathname.includes("/c/")) return;
    createDashboard();

    // Specific selector for ChatGPT's message body to avoid UI buttons
    const messages = document.querySelectorAll(
  'article .whitespace-pre-wrap'
);
    const savedData = loadFromStorage();

    messages.forEach((msg) => {
        if (msg.hasAttribute(PROCESSED_ATTR)) return;
        
        // Validation: Ensure it's not a button, a tool-tip, or part of the sidebar
        const isButton = msg.closest('button') || msg.closest('nav') || msg.closest('.sr-only');
        const isSmallUI = msg.innerText.length < 2; // Usually icons

        if (isButton || isSmallUI) {
            msg.setAttribute(PROCESSED_ATTR, "skipped");
            return;
        }

        const bar = createAnchorBar(msg);
        msg.parentNode.insertBefore(bar, msg);
        msg.setAttribute(PROCESSED_ATTR, "true");
        
        const match = savedData.find(s => msg.innerText.includes(s.text));
        if (match) markAnchor(msg, match.name, bar, true);
    });
}

function checkFollowStatus(callback) {
    chrome.storage.local.get(["allowMoreBookmarks"], (result) => {
        const isAllowed = result.allowMoreBookmarks || false; 
        callback(isAllowed);
    });
}

function createAnchorBar(messageEl) {
    const bar = document.createElement("div");
    bar.textContent = "📌 Click to mark anchor";
    
    Object.assign(bar.style, {
        width: "100%", height: "24px", cursor: "pointer", background: M3.brightBg, 
        borderRadius: "4px", marginBottom: "6px", display: "flex", alignItems: "center", 
        paddingLeft: "8px", fontSize: "12px", color: M3.brightText, border: `2px solid ${M3.brightText}`,
        fontWeight: "bold"
    });

    bar.addEventListener("click", () => {
        if (messageEl.hasAttribute(ANCHORED_ATTR)) {
            messageEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        checkFollowStatus((isAllowed) => {
            if (anchors.length >= 5 && !isAllowed) {
                alert("Limit reached! For more tokens click the extension icon");
                return;
            }

            let name;

while (true) {
    name = prompt("Enter anchor name:");
    
    // User clicked Cancel
    if (name === null) return;

    name = name.trim();

    // Empty input
    if (!name) {
        alert("Anchor name cannot be empty.");
        continue;
    }

    // Duplicate check
    const isDuplicate = anchors.some(
        a => a.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
        alert("An anchor with this name already exists. Please choose another name.");
        continue; // ask again
    }

    // Valid + unique name
    break;
}

// ✅ use `name` safely here

            markAnchor(messageEl, name.trim(), bar);
            saveToStorage();
        });
    });

    return bar;
}

function markAnchor(messageEl, name, bar, isLoading = false) {
    messageEl.setAttribute(ANCHORED_ATTR, "true");
    bar.style.background = M3.successBg; 
    bar.style.color = M3.successText;
    bar.style.border = `2px solid ${M3.successText}`;
    bar.textContent = `✅ ${name}`;
    anchors.push({ name: name, element: messageEl, bar: bar });

    const list = document.getElementById("anchor-list");
    const item = document.createElement("div");
    item.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;";
    
    const label = document.createElement("span");
    label.textContent = `🔖 ${name}`;
    label.style.cssText = `cursor:pointer; color:${M3.primary}; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;`;
    label.onclick = () => messageEl.scrollIntoView({ behavior: "smooth", block: "center" });

    const del = document.createElement("span");
    del.textContent = "✖";
    del.style.cssText = "cursor:pointer; margin-left:8px; color:#ffb4ab; font-weight:bold;";
    del.onclick = (e) => {
        e.stopPropagation();
        anchors = anchors.filter(a => a.name !== name);
        messageEl.removeAttribute(ANCHORED_ATTR);
        bar.style.background = M3.brightBg;
        bar.style.color = M3.brightText;
        bar.style.border = `2px solid ${M3.brightText}`;
        bar.textContent = "📌 Click to mark anchor";
        item.remove();
        saveToStorage();
    };

    item.appendChild(label);
    item.appendChild(del);
    if (list) list.appendChild(item);
    
    if (!isLoading) updateSidebarTitle();
}

// --- INITIALIZE & OBSERVE ---
createDashboard();
processMessages();
updateSidebarTitle();

const observer = new MutationObserver(() => {
    processMessages();
    updateSidebarTitle();
});
observer.observe(document.body, { childList: true, subtree: true });