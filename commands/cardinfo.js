const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "!cardinfo",
    execute: async (message, { prisma }) => {
        const name = message.content.replace("!cardinfo", "").trim();
        if (!name) return message.reply("❗ Provide the name of a card. Example: `!cardinfo Cool Nathan`");

        const card = await prisma.card.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
        if (!card) return message.reply("❌ Card not found.");

        const holders = await prisma.userCard.count({ where: { cardId: card.id } });
        const totalOwned = await prisma.userCard.aggregate({
            where: { cardId: card.id },
            _sum: { quantity: true }
        });

        const embed = new EmbedBuilder()
            .setTitle(card.name)
            .setDescription(`Rarity: **${card.rarity}**\nOwned by **${holders}** users\nTotal in circulation: **${totalOwned._sum.quantity || 0}**`)
            .setImage(card.imageUrl)
            .setColor(0x9999ff);

        return message.reply({ embeds: [embed] });
    }
};