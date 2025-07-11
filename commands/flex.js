const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "!flex",
    execute: async (message, { prisma }) => {
        const userId = message.author.id;
        const cardName = message.content.slice("!flex".length).trim();

        if (!cardName) {
            return message.reply("❌ Please specify a card name. Example: `!flex Cool Nathan`");
        }

        const card = await prisma.card.findFirst({ where: { name: { equals: cardName, mode: "insensitive" } } });
        if (!card) {
            return message.reply(`❌ Card not found: **${cardName}**`);
        }

        const user = await prisma.user.findUnique({ where: { discordId: userId } });
        if (!user) {
            return message.reply("❌ You don't have an account.");
        }

        const userCard = await prisma.userCard.findUnique({
            where: { userId_cardId: { userId: user.id, cardId: card.id } }
        });

        if (!userCard || userCard.quantity < 1) {
            return message.reply(`❌ You don't own any copies of **${card.name}**.`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Flex`)
            .setDescription(`✨ **${card.name}**\nRarity: **${card.rarity}**\nQuantity: **${userCard.quantity}**`)
            .setImage(card.imageUrl)
            .setColor(card.rarity === "LEGENDARY" ? 0xf1c40f :
                      card.rarity === "EPIC" ? 0x9b59b6 :
                      card.rarity === "RARE" ? 0x3498db :
                      card.rarity === "OVERLORD" ? 0xff5733 :
                      0x95a5a6)
            .setFooter({ text: `Total Cards Owned: ${userCard.quantity}` });

        return message.channel.send({ embeds: [embed] });
    }
};
