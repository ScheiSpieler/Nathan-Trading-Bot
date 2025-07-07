const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { CardRarity } = require("@prisma/client");

module.exports = {
    name: "!inventory",
    execute: async (message, { prisma }) => {
        const [, filterArg] = message.content.split(" ");
        const rarityFilter = filterArg?.toUpperCase();
        const validRarities = Object.values(CardRarity);
        const isValidFilter = rarityFilter && validRarities.includes(rarityFilter);

        const user = await prisma.user.findUnique({
            where: { discordId: message.author.id },
            include: {
                userCards: {
                    where: isValidFilter ? { card: { rarity: rarityFilter } } : undefined,
                    include: { card: true }
                }
            }
        });

        if (!user || user.userCards.length === 0) return message.reply("🗃️ Your inventory is empty!");

        const perPage = 1;
        let page = 0;

        const sendPage = async () => {
            const slice = user.userCards.slice(page * perPage, (page + 1) * perPage);
            const embeds = slice.map(uc => new EmbedBuilder()
                .setTitle(uc.card.name)
                .setDescription(`Rarity: **${uc.card.rarity}**\nQuantity: **${uc.quantity}**`)
                .setImage(uc.card.imageUrl)
                .setColor(0x00bfff));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary).setDisabled((page + 1) * perPage >= user.userCards.length)
            );

            const msg = await message.channel.send({ embeds, components: [row] });

            const collector = msg.createMessageComponentCollector({ time: 60000 });
            collector.on("collect", async interaction => {
                if (interaction.user.id !== message.author.id) return interaction.reply({ content: "Not for you.", ephemeral: true });

                page += interaction.customId === "next" ? 1 : -1;
                const nextSlice = user.userCards.slice(page * perPage, (page + 1) * perPage);
                const newEmbeds = nextSlice.map(uc => new EmbedBuilder()
                    .setTitle(uc.card.name)
                    .setDescription(`Rarity: **${uc.card.rarity}**\nQuantity: **${uc.quantity}**`)
                    .setImage(uc.card.imageUrl)
                    .setColor(0x00bfff));

                const newRow = ActionRowBuilder.from(row);
                newRow.components[0].setDisabled(page === 0);
                newRow.components[1].setDisabled((page + 1) * perPage >= user.userCards.length);

                await interaction.update({ embeds: newEmbeds, components: [newRow] });
            });
        };

        return sendPage();
    }
};
