module.exports = {
    name: "!canceltrade",
    execute: async (message, { tradeSessions }) => {
        const userId = message.author.id;
        if (tradeSessions.has(userId)) {
            tradeSessions.delete(userId);
            return message.reply("🚫 Your trade session has been cancelled.");
        } else {
            return message.reply("❌ You don't have an active trade session.");
        }
    }
};
