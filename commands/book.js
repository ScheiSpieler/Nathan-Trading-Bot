// commands/book.js
const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!book",
    execute: async (message, { prisma }) => {
        const args = message.content.split(" ").slice(1);
        const filterRarity = args[0]?.toUpperCase();
        const isValidFilter = filterRarity && Object.values(CardRarity).includes(filterRarity);

        const user = await prisma.user.findUnique({
            where: { discordId: message.author.id },
            include: {
                userCards: {
                    include: { card: true },
                    where: isValidFilter ? { card: { rarity: filterRarity } } : undefined
                }
            }
        });

        if (!user || user.userCards.length === 0) return message.reply("📭 You don't own any cards.");

        const grouped = {};
        for (const rarity of Object.values(CardRarity)) {
            grouped[rarity] = [];
        }

        for (const uc of user.userCards) {
            grouped[uc.card.rarity].push(`${uc.card.name} × ${uc.quantity}`);
        }

        const embeds = Object.entries(grouped)
            .filter(([, list]) => list.length)
            .map(([rarity, list]) => new EmbedBuilder()
                .setTitle(`${rarity} Collection`)
                .setDescription(list.sort().join("\n"))
                .setColor(0xaaffaa));

        for (const embed of embeds) {
            await message.channel.send({ embeds: [embed] });
        }
    }
};
