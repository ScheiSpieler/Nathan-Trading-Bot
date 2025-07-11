const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!completeleaderboard",
    execute: async (message, { prisma }) => {
        const args = message.content.split(" ").slice(1);
        const rarityFilter = args[0]?.toUpperCase();
        const isValidRarity = rarityFilter && Object.values(CardRarity).includes(rarityFilter);

        const allCards = await prisma.card.findMany({
            where: isValidRarity ? { rarity: rarityFilter } : undefined,
            select: { id: true }
        });

        if (allCards.length === 0) {
            return message.reply(`📭 No cards found${isValidRarity ? ` for rarity **${rarityFilter}**` : ""}.`);
        }

        const totalCards = allCards.length;
        const cardIds = allCards.map(c => c.id);

        const userCards = await prisma.userCard.findMany({
            where: {
                cardId: { in: cardIds }
            },
            select: {
                userId: true,
                cardId: true
            }
        });

        const userIdToCards = new Map();
        for (const uc of userCards) {
            if (!userIdToCards.has(uc.userId)) userIdToCards.set(uc.userId, new Set());
            userIdToCards.get(uc.userId).add(uc.cardId);
        }

        const allUsers = await prisma.user.findMany();

        const leaderboard = allUsers.map(user => {
            const owned = userIdToCards.get(user.id) || new Set();
            const percent = (owned.size / totalCards) * 100;
            return { user, percent, ownedCount: owned.size };
        }).filter(entry => entry.ownedCount > 0);

        leaderboard.sort((a, b) => b.percent - a.percent);

        if (leaderboard.length === 0) {
            return message.reply("📭 No users have collected any cards yet.");
        }

        const lines = leaderboard.slice(0, 10).map((entry, i) =>
            `**#${i + 1}** <@${entry.user.discordId}> — ${entry.ownedCount}/${totalCards} cards (${entry.percent.toFixed(1)}%)`
        );

        const embed = new EmbedBuilder()
            .setTitle(`📊 Completion Leaderboard${isValidRarity ? ` (${rarityFilter})` : ""}`)
            .setDescription(lines.join("\n"))
            .setColor(0x00bcd4);

        return message.reply({ embeds: [embed] });
    }
};
