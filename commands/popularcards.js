// commands/popularcards.js
const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

const rarityOrder = {
    OVERLORD: 0,
    LEGENDARY: 1,
    EPIC: 2,
    RARE: 3,
    COMMON: 4
};

module.exports = {
    name: "!popularcards",
    execute: async (message, { prisma }) => {
        const args = message.content.split(" ").slice(1);
        const filterRarity = args[0]?.toUpperCase();
        const isValidRarity = filterRarity && Object.values(CardRarity).includes(filterRarity);

        const allCards = await prisma.card.findMany({
            where: isValidRarity ? { rarity: filterRarity } : undefined
        });

        const cardQuantities = await Promise.all(
            allCards.map(async card => {
                const sum = await prisma.userCard.aggregate({
                    where: { cardId: card.id },
                    _sum: { quantity: true }
                });
                return {
                    name: card.name,
                    rarity: card.rarity,
                    quantity: sum._sum.quantity || 0
                };
            })
        );

        const sorted = cardQuantities
            .sort((a, b) => {
                if (b.quantity !== a.quantity) return b.quantity - a.quantity;
                return rarityOrder[b.rarity] - rarityOrder[a.rarity]; // COMMON wins tie
            })
            .slice(0, 10);

        if (sorted.length === 0) {
            return message.reply(`📭 No cards found${isValidRarity ? ` for rarity **${filterRarity}**` : ""}.`);
        }

        const lines = sorted.map((c, i) =>
            `**#${i + 1}** ${c.name} — ${c.quantity} owned (${c.rarity})`
        );

        const embed = new EmbedBuilder()
            .setTitle(`🔥 Top 10 Most Popular ${isValidRarity ? filterRarity : "Cards"}`)
            .setDescription(lines.join("\n"))
            .setColor(0xf5a623);

        return message.reply({ embeds: [embed] });
    }
};
