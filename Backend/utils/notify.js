import Notification from "../models/Notification.js";

export async function createNotification(io, userId, message, link = "/") {
  if (!userId) return;
  const notification = await Notification.create({ user: userId, message, link });
  io?.to(`user:${userId}`).emit("notification", notification);
}
