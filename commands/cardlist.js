const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!cards",
    execute: async (message, { prisma }) => {
        const [, rarityArg] = message.content.split(" ");
        const rarityFilter = rarityArg?.toUpperCase();
        const isValid = rarityFilter && Object.values(CardRarity).includes(rarityFilter);

        const allCards = await prisma.card.findMany({
            where: isValid ? { rarity: rarityFilter } : undefined
        });

        if (allCards.length === 0) return message.reply("📭 No cards found.");

        const sorted = {};
        for (const rarity of Object.values(CardRarity)) {
            sorted[rarity] = [];
        }

        for (const card of allCards) {
            sorted[card.rarity].push(card.name);
        }

        const pages = Object.entries(sorted)
            .filter(([, names]) => names.length)
            .map(([rarity, names]) => new EmbedBuilder()
                .setTitle(`${rarity} Cards`)
                .setDescription(names.sort().join("\n"))
                .setColor(0xeeeeee));

        let page = 0;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary).setDisabled(pages.length <= 1)
        );

        const sent = await message.channel.send({ embeds: [pages[page]], components: [row] });
        const collector = sent.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async interaction => {
            if (interaction.user.id !== message.author.id) return interaction.reply({ content: "Not for you.", ephemeral: true });
            page += interaction.customId === "next" ? 1 : -1;
            row.components[0].setDisabled(page === 0);
            row.components[1].setDisabled(page === pages.length - 1);
            await interaction.update({ embeds: [pages[page]], components: [row] });
        });
    }
};
