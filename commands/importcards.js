// commands/importcards.js
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!importcards",
    execute: async (message, { prisma }) => {
        const ALLOWED_USER_ID = "224231121720705044"; // your Discord user ID
        if (message.author.id !== ALLOWED_USER_ID) return;

        const args = message.content.split(" ");
        const channelId = args[1];
        if (!channelId) return message.reply("❗ Usage: `!importcards <channel_id>`");

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 0) return message.reply("❌ Invalid channel ID or not a text channel.");

        const messages = await channel.messages.fetch({ limit: 100 });
        let added = 0, skipped = 0;

        for (const [, msg] of messages) {
            const content = msg.content.trim();
            const parts = content.split("-");
            const name = parts[0]?.trim();
            let rawRarity = parts[1] ? parts[1].trim().toUpperCase().replace(/[^A-Z]/g, "") : null;

            if (!name || !Object.keys(CardRarity).includes(rawRarity)) {
                skipped++;
                continue;
            }

            const image = msg.attachments.first()?.url;
            if (!image) {
                skipped++;
                continue;
            }

            const exists = await prisma.card.findFirst({ where: { name } });
            if (exists) {
                skipped++;
                continue;
            }

            await prisma.card.create({ data: { name, imageUrl: image, rarity: rawRarity } });
            added++;
        }

        return message.reply(`✅ Import complete! Added: ${added}, Skipped: ${skipped}`);
    }
};
