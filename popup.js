console.log("🔥 popup.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    // Corrected the ID to match your HTML 'followbutton'
    const btn = document.getElementById("followbutton");
    console.log("🔍 Button element found:", btn);

    // 1. Check if it's already saved when the popup opens
    chrome.storage.local.get(["allowMoreBookmarks"], (result) => {
        if (result.allowMoreBookmarks) {
            setButtonAsUnlocked(btn);
        }
    });

    // 2. Handle the click event
    btn.addEventListener("click", () => {
        chrome.storage.local.set({ allowMoreBookmarks: true }, () => {
            console.log("✅ Stored: allowMoreBookmarks = true");
            setButtonAsUnlocked(btn);
        });
    });
});

// Helper function to update UI
function setButtonAsUnlocked(buttonElement) {
    buttonElement.textContent = "Unlocked ✅";
    buttonElement.classList.add("unlocked");
    buttonElement.disabled = true; // Prevents re-clicking
}