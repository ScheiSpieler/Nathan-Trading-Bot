const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!missingcards",
    execute: async (message, { prisma }) => {
        const args = message.content.split(" ").slice(1);

        let mention = message.mentions.users.first();
        let user = mention || message.author;
        let userId = user.id;

        const rarityArg = args.find(arg => Object.values(CardRarity).includes(arg.toUpperCase()));
        const rarity = rarityArg ? rarityArg.toUpperCase() : null;

        const dbUser = await prisma.user.findUnique({ where: { discordId: userId } });
        if (!dbUser) {
            return message.reply(`❌ ${user.username} does not have an account.`);
        }

        const allCards = await prisma.card.findMany({
            where: rarity ? { rarity } : undefined
        });

        const userCards = await prisma.userCard.findMany({
            where: { userId: dbUser.id },
            select: { cardId: true }
        });

        const ownedIds = new Set(userCards.map(uc => uc.cardId));
        const missing = allCards.filter(card => !ownedIds.has(card.id));

        if (missing.length === 0) {
            return message.reply(`✅ ${user.username} has **all ${rarity ? rarity : ""} cards**!`);
        }

        const cardList = missing.map(c => `• ${c.name}`).join("\n");

        const embed = new EmbedBuilder()
            .setTitle(`🕳️ Missing Cards — ${user.username}`)
            .setDescription(`${rarity ? `Filtered by **${rarity}**:\n\n` : ""}${cardList}`)
            .setColor(0xe74c3c)
            .setFooter({ text: `${missing.length} missing out of ${allCards.length} total${rarity ? ` (${rarity})` : ""}` });

        return message.reply({ embeds: [embed] });
    }
};
