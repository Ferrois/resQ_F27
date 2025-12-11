const webpush = require("web-push");
const PushSubscription = require("../Models/pushSubscription");

const publicVapidKey = process.env.PUBVAPID || ""
const privateVapidKey = process.env.PRIVAPID || "";

// Setup web-push with VAPID details
webpush.setVapidDetails("mailto:dominicchia35@gmail.com", publicVapidKey, privateVapidKey);

/**
 * Subscribe a user to push notifications
 */
async function subscribeUser(userId, subscriptionData) {
  try {
    const subscription = await PushSubscription.findOneAndUpdate(
      {
        userId,
        endpoint: subscriptionData.endpoint,
      },
      {
        userId,
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        },
        enabled: true,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );
    return { success: true, subscription };
  } catch (error) {
    console.error("Error subscribing user:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe a user from push notifications
 */
async function unsubscribeUser(userId, endpoint) {
  try {
    if (endpoint) {
      // Unsubscribe specific endpoint
      await PushSubscription.findOneAndDelete({ userId, endpoint });
    } else {
      // Disable all subscriptions for user
      await PushSubscription.updateMany({ userId }, { enabled: false, updatedAt: new Date() });
    }
    return { success: true };
  } catch (error) {
    console.error("Error unsubscribing user:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle push notifications for a user
 */
async function togglePushNotifications(userId, enabled) {
  try {
    await PushSubscription.updateMany({ userId }, { enabled, updatedAt: new Date() });
    return { success: true };
  } catch (error) {
    console.error("Error toggling push notifications:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to a user
 */
async function sendNotificationToUser(userId, payload) {
  console.log("Sending notification to user:", userId);
  try {
    const subscriptions = await PushSubscription.find({
      userId,
      enabled: true,
    });

    if (subscriptions.length === 0) {
      return { success: false, message: "No active subscriptions found" };
    }

    const results = [];
    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.push({ endpoint: sub.endpoint, success: true });
      } catch (error) {
        console.error(`Failed to send notification to ${sub.endpoint}:`, error);

        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id);
        }

        results.push({ endpoint: sub.endpoint, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount > 0,
      sent: successCount,
      total: subscriptions.length,
      results,
    };
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 */
async function sendNotificationToUsers(userIds, payload) {
  try {
    const subscriptions = await PushSubscription.find({
      userId: { $in: userIds },
      enabled: true,
    });

    if (subscriptions.length === 0) {
      return { success: false, message: "No active subscriptions found" };
    }

    const results = [];
    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.push({ userId: sub.userId, endpoint: sub.endpoint, success: true });
      } catch (error) {
        console.error(`Failed to send notification to ${sub.endpoint}:`, error);

        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id);
        }

        results.push({
          userId: sub.userId,
          endpoint: sub.endpoint,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount > 0,
      sent: successCount,
      total: subscriptions.length,
      results,
    };
  } catch (error) {
    console.error("Error sending notifications to users:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public VAPID key for client
 */
function getPublicVapidKey() {
  return publicVapidKey;
}

module.exports = {
  subscribeUser,
  unsubscribeUser,
  togglePushNotifications,
  sendNotificationToUser,
  sendNotificationToUsers,
  getPublicVapidKey,
};
