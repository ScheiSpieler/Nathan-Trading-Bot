const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!completion",
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
            where: rarity ? { rarity } : undefined,
            select: { id: true }
        });
        const totalCardCount = allCards.length;
        const allCardIds = new Set(allCards.map(c => c.id));

        const userCards = await prisma.userCard.findMany({
            where: { userId: dbUser.id },
            select: { cardId: true }
        });

        const collectedIds = new Set(userCards.map(uc => uc.cardId).filter(id => allCardIds.has(id)));
        const uniqueCollected = collectedIds.size;
        const percent = totalCardCount === 0 ? 0 : ((uniqueCollected / totalCardCount) * 100).toFixed(2);

        const embed = new EmbedBuilder()
            .setTitle(`📚 Collection Progress — ${user.username}`)
            .setDescription(
                `${rarity ? `For **${rarity}** cards:\n` : ""}` +
                `You have collected **${uniqueCollected} / ${totalCardCount}** cards.\n` +
                `That’s **${percent}%** complete!`
            )
            .setColor(rarity === "OVERLORD" ? 0x8e44ad :
                      rarity === "LEGENDARY" ? 0xf1c40f :
                      rarity === "EPIC" ? 0xe67e22 :
                      rarity === "RARE" ? 0x3498db :
                      rarity === "COMMON" ? 0x95a5a6 :
                      0x2ecc71);

        return message.reply({ embeds: [embed] });
    }
};
