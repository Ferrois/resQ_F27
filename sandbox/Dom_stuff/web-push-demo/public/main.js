const publicVapidKey = "BEtAm8SNrwxSx8gEEwaSvNiXqZf3h_IaQdRjY_LOB328doR6PRfhrhiqhlLAhd_CjoRXPiiKpGr-wIMxueXBIig";

// Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64) {
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const base64Str = (base64 + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64Str);
    return Uint8Array.from([...rawData].map(x => x.charCodeAt(0)));
}

document.getElementById("subscribeBtn").onclick = async () => {
    // Register Service Worker
    console.log("Registering service worker...");
    const register = await window.navigator.serviceWorker.register("serviceworker.js");
    console.log(register, "Service Worker registered");

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        alert("You must allow notifications");
        return;
    }

    // Subscribe to push service
    const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    // Send subscription to backend
    await fetch("http://192.168.88.5:3000/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: { "Content-Type": "application/json" }
    });

    alert("Subscribed!");
};

document.getElementById("sendNotifyBtn").onclick = async () => {
    console.log("Sending notification request to server");
    await fetch("http://192.168.88.5:3000/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "This is a test notification!" })
    });
};
