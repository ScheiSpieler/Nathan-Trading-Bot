const { CardRarity } = require("@prisma/client");

module.exports = {
  name: "!addcard",
  execute: async (message, { prisma, ADMIN_IDS }) => {
    if (!ADMIN_IDS.includes(message.author.id)) {
      return message.reply("⛔ You don't have permission.");
    }

    const rawArgs = message.content.replace("!addcard", "").trim();
    const [rarity, name, imageUrlInput] = rawArgs
      .split(",")
      .map((arg) => arg.trim());
    const imageUrl = message.attachments.first()?.url || imageUrlInput;
    const validRarities = Object.values(CardRarity).join(", ");

    if (!rarity || !name || !imageUrl) {
      return message.reply(
        `❗ **Invalid format.**\nUse: \`!addcard <rarity>, <name>, <imageUrl>\`\nExample: \`!addcard rare, Cool Nathan, https://example.com/nathan.png\`\nValid rarities: ${validRarities}`
      );
    }

    const upper = rarity.toUpperCase();
    if (!CardRarity[upper]) {
      return message.reply(
        `❌ **Invalid rarity.** Valid options: ${validRarities}`
      );
    }

    try {
      const card = await prisma.card.create({
        data: { name, imageUrl, rarity: upper },
      });
      return message.reply(`✅ Card added: **${card.name}** (${card.rarity})`);
    } catch (err) {
      console.error("Card add error:", err);
      return message.reply("⚠️ Something went wrong while adding the card.");
    }
  },
};
