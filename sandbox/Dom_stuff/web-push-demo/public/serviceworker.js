
self.addEventListener("push", event => {
    console.log(event)
    const data = event.data.json();
    console.log("Push Received...", data);
    event.waitUntil(
        (async () => {
            console.log("DEBUG: Showing notification…");
            const result = await self.registration.showNotification(data.title, {
                body: data.body,
                icon: "...",
                requireInteraction: true
            });
            console.log("DEBUG: Notification show result:", result);
        })()
    );
});
