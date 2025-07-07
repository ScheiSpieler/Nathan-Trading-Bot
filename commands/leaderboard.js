// commands/leaderboard.js
const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!leaderboard",
    execute: async (message, { prisma }) => {
        const args = message.content.split(" ").slice(1);
        const filterRarity = args[0]?.toUpperCase();
        const isValidRarity = filterRarity && Object.values(CardRarity).includes(filterRarity);

        const grouped = await prisma.userCard.groupBy({
            by: ["userId"],
            _sum: { quantity: true },
            where: isValidRarity ? { card: { rarity: filterRarity } } : undefined,
            orderBy: { _sum: { quantity: "desc" } },
            take: 10
        });

        const users = await Promise.all(
            grouped.map(async entry => {
                const user = await prisma.user.findUnique({ where: { id: entry.userId } });
                return { id: user.discordId, quantity: entry._sum.quantity };
            })
        );

        const list = await Promise.all(
            users.map(async (u, i) => {
                const member = await message.guild.members.fetch(u.id).catch(() => null);
                const name = member ? member.displayName : `User ${u.id}`;
                return `**#${i + 1}** ${name} — ${u.quantity} ${isValidRarity ? filterRarity.toLowerCase() : "total"} cards`;
            })
        );

        const embed = new EmbedBuilder()
            .setTitle(`📊 Top 10 Collectors${isValidRarity ? ` of ${filterRarity}` : ""}`)
            .setDescription(list.join("\n"))
            .setColor(0xf1c40f);

        return message.reply({ embeds: [embed] });
    }
};
