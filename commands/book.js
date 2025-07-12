const { EmbedBuilder } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
  name: "!book",
  execute: async (message, { prisma }) => {
    const args = message.content.split(" ").slice(1);

    let targetUser = message.author;
    let filterRarity = null;

    for (const arg of args) {
      if (arg.startsWith("<@") && arg.endsWith(">")) {
        const id = arg.replace(/[<@!>]/g, "");
        const user = await message.client.users.fetch(id).catch(() => null);
        if (user) targetUser = user;
      } else if (Object.values(CardRarity).includes(arg.toUpperCase())) {
        filterRarity = arg.toUpperCase();
      }
    }

    const user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        userCards: {
          include: { card: true },
          where: filterRarity ? { card: { rarity: filterRarity } } : undefined,
        },
      },
    });

    if (!user || user.userCards.length === 0) {
      return message.reply(
        `${
          targetUser.id === message.author.id
            ? "📭 You"
            : `📭 ${targetUser.username}`
        } don't own any cards${
          filterRarity ? ` of rarity **${filterRarity}**` : ""
        }.`
      );
    }

    const grouped = {};
    for (const rarity of Object.values(CardRarity)) {
      grouped[rarity] = [];
    }

    for (const uc of user.userCards) {
      grouped[uc.card.rarity].push(`${uc.card.name} × ${uc.quantity}`);
    }

    const embeds = Object.entries(grouped)
      .filter(([, list]) => list.length)
      .map(([rarity, list]) =>
        new EmbedBuilder()
          .setTitle(`${rarity} Collection of ${targetUser.username}`)
          .setDescription(list.sort().join("\n"))
          .setColor(0xaaffaa)
      );

    for (const embed of embeds) {
      await message.channel.send({ embeds: [embed] });
    }
  },
};
