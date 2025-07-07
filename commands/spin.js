const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

const rarityChances = [
    { rarity: CardRarity.COMMON, weight: 61 },
    { rarity: CardRarity.RARE, weight: 31 },
    { rarity: CardRarity.EPIC, weight: 6 },
    { rarity: CardRarity.LEGENDARY, weight: 1.5 },
    { rarity: CardRarity.OVERLORD, weight: 0.5 }
];

const rarityColors = {
    COMMON: 0xA0A0A0,
    RARE: 0x3B82F6,
    EPIC: 0x9333EA,
    LEGENDARY: 0xF59E0B,
    OVERLORD: 0xEF4444
};

function pickRarity() {
    const total = rarityChances.reduce((sum, r) => sum + r.weight, 0);
    const roll = Math.random() * total;
    let cumulative = 0;
    for (const entry of rarityChances) {
        cumulative += entry.weight;
        if (roll < cumulative) return entry.rarity;
    }
    return CardRarity.COMMON;
}

module.exports = {
    name: "!spin",
    execute: async (message, { prisma }) => {
        const userId = message.author.id;
        let user = await prisma.user.findUnique({ where: { discordId: userId } });
        const now = Date.now();
        const oneHour = 3600000;

        if (!user) {
            user = await prisma.user.create({ data: { discordId: userId, spinsLeft: 2, lastSpin: now } });
        } else {
            const lastSpin = Number(user.lastSpin);
            if (user.spinsLeft <= 0 && now - lastSpin > oneHour) {
                user = await prisma.user.update({ where: { discordId: userId }, data: { spinsLeft: 2, lastSpin: now } });
            } else if (user.spinsLeft > 0) {
                user = await prisma.user.update({ where: { discordId: userId }, data: { spinsLeft: { decrement: 1 }, lastSpin: now } });
            } else {
                const nextSpinTimestamp = lastSpin + oneHour;
                return message.reply(`❌ You're out of spins! Next spin available <t:${Math.floor(nextSpinTimestamp / 1000)}:R>.`);
            }
        }

        const rarity = pickRarity();
        const cards = await prisma.card.findMany({ where: { rarity } });
        if (cards.length === 0) return message.reply(`🎲 You rolled **${rarity}**, but no cards exist for it!`);

        const card = cards[Math.floor(Math.random() * cards.length)];
        const existing = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: user.id, cardId: card.id } } });

        let quantity = 1;
        let unlocked = false;

        if (existing) {
            await prisma.userCard.update({
                where: { userId_cardId: { userId: user.id, cardId: card.id } },
                data: { quantity: { increment: 1 } }
            });
            quantity = existing.quantity + 1;
        } else {
            await prisma.userCard.create({ data: { userId: user.id, cardId: card.id, quantity: 1 } });
            unlocked = true;
        }

        const totalOwned = await prisma.userCard.aggregate({
            where: { userId: user.id },
            _sum: { quantity: true }
        });

        const totalCards = totalOwned._sum.quantity || 0;

        const embed = new EmbedBuilder()
            .setTitle(`🎉 You rolled a ${rarity}!`)
            .setDescription(unlocked
                ? `You unlocked **${card.name}**!`
                : `You already own **${card.name}** — now you have **x${quantity}**!`)
            .setImage(card.imageUrl)
            .setColor(rarityColors[rarity])
            .setFooter({ text: `You now own ${totalCards} total cards` });

        return message.reply({ embeds: [embed] });
    }
};
