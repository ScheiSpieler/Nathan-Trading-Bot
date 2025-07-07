const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function validateUserCards(prisma, userId, cards) {
    for (const { card, quantity } of cards) {
        const uc = await prisma.userCard.findUnique({
            where: { userId_cardId: { userId, cardId: card.id } }
        });
        if (!uc || uc.quantity < quantity) return false;
    }
    return true;
}

async function applyTrade(prisma, senderId, receiverId, offer, request) {
    const transfer = async (fromId, toId, cards) => {
        for (const { card, quantity } of cards) {
            await prisma.userCard.update({
                where: { userId_cardId: { userId: fromId, cardId: card.id } },
                data: { quantity: { decrement: quantity } }
            });
            const updated = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: fromId, cardId: card.id } } });
            if (updated.quantity <= 0) await prisma.userCard.delete({ where: { userId_cardId: { userId: fromId, cardId: card.id } } });

            const existing = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: toId, cardId: card.id } } });
            if (existing) {
                await prisma.userCard.update({ where: { userId_cardId: { userId: toId, cardId: card.id } }, data: { quantity: { increment: quantity } } });
            } else {
                await prisma.userCard.create({ data: { userId: toId, cardId: card.id, quantity } });
            }
        }
    };

    await transfer(senderId, receiverId, offer);
    await transfer(receiverId, senderId, request);
}

module.exports = {
    name: "!trade",
    execute: async (message, { prisma, tradeSessions }) => {
        const senderId = message.author.id;
        if (tradeSessions.has(senderId)) return message.reply("⚠️ You're already in a trade session.");

        tradeSessions.set(senderId, {});
        try {
            await message.reply("🔁 Who do you want to trade with? Please `@mention` the user.");
            const mentionCollector = message.channel.createMessageCollector({ filter: m => m.author.id === senderId, max: 1, time: 30000 });

            mentionCollector.on("collect", async (mentionMsg) => {
                const targetUser = mentionMsg.mentions.users.first();
                if (!targetUser || targetUser.bot || targetUser.id === senderId) {
                    tradeSessions.delete(senderId);
                    return message.reply("❌ Invalid user mention. Trade canceled.");
                }

                const sender = await prisma.user.findUnique({ where: { discordId: senderId } });
                const receiver = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
                if (!sender || !receiver) {
                    tradeSessions.delete(senderId);
                    return message.reply("❌ One or both users do not have an account.");
                }

                const session = { targetUser, sender, receiver };
                tradeSessions.set(senderId, session);

                await message.reply("📦 What **cards and quantities** do you want to offer?\nFormat: `Card Name | Quantity`, separate multiple with commas.\nExample: `Cool Nathan | 2, Pixel Nathan | 1`");

                const offerCollector = message.channel.createMessageCollector({ filter: m => m.author.id === senderId, max: 1, time: 60000 });

                offerCollector.on("collect", async (offerMsg) => {
                    const offerList = offerMsg.content.split(",").map(s => s.trim()).map(s => {
                        const [name, qtyStr] = s.split("|").map(t => t.trim());
                        return { name, quantity: parseInt(qtyStr) };
                    });

                    if (offerList.some(e => !e.name || isNaN(e.quantity) || e.quantity < 1)) {
                        tradeSessions.delete(senderId);
                        return message.reply("❌ Invalid format in one or more entries. Use `Card Name | Quantity`. Trade canceled.");
                    }

                    const cardData = [];
                    for (const offer of offerList) {
                        const card = await prisma.card.findFirst({ where: { name: offer.name } });
                        if (!card) return message.reply(`❌ Card not found: ${offer.name}. Trade canceled.`);

                        const userCard = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: sender.id, cardId: card.id } } });
                        if (!userCard || userCard.quantity < offer.quantity) return message.reply(`❌ You don't have enough of: ${offer.name}. Trade canceled.`);

                        cardData.push({ card, quantity: offer.quantity });
                    }

                    session.offer = cardData;

                    await message.reply("🎁 What **cards and quantities** do you want **from ${targetUser.username}**?\nFormat: `Card Name | Quantity`, separate multiple with commas.\nExample: `Cool Nathan | 2, Pixel Nathan | 1`");

                    const requestCollector = message.channel.createMessageCollector({ filter: m => m.author.id === senderId, max: 1, time: 60000 });

                    requestCollector.on("collect", async (reqMsg) => {
                        const requestList = reqMsg.content.split(",").map(s => s.trim()).map(s => {
                            const [name, qtyStr] = s.split("|").map(t => t.trim());
                            return { name, quantity: parseInt(qtyStr) };
                        });

                        if (requestList.some(e => !e.name || isNaN(e.quantity) || e.quantity < 1)) {
                            tradeSessions.delete(senderId);
                            return message.reply("❌ Invalid format in one or more entries. Use `Card Name | Quantity`. Trade canceled.");
                        }

                        const wantedData = [];
                        for (const req of requestList) {
                            const card = await prisma.card.findFirst({ where: { name: req.name } });
                            if (!card) return message.reply(`❌ Card not found: ${req.name}. Trade canceled.`);

                            const userCard = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: receiver.id, cardId: card.id } } });
                            if (!userCard || userCard.quantity < req.quantity) return message.reply(`❌ ${targetUser.username} doesn't have enough of: ${req.name}. Trade canceled.`);

                            wantedData.push({ card, quantity: req.quantity });
                        }

                        session.request = wantedData;

                        const embed = new EmbedBuilder()
                            .setTitle("📥 Trade Request")
                            .setDescription(`${message.author} wants to trade:\n\n__**Offering:**__\n${session.offer.map(e => `${e.quantity}x ${e.card.name}`).join("\n")}\n\n__**For:**__\n${session.request.map(e => `${e.quantity}x ${e.card.name}`).join("\n")}`)
                            .setFooter({ text: "Do you accept this trade?" })
                            .setColor(0xffcc00);

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId("accept_trade").setLabel("✅ Accept").setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId("decline_trade").setLabel("❌ Decline").setStyle(ButtonStyle.Danger)
                        );

                        const sent = await message.channel.send({ content: `${targetUser}`, embeds: [embed], components: [row] });
                        let tradeCompleted = false;
                        const buttonCollector = sent.createMessageComponentCollector({ time: 30000 });

                        buttonCollector.on("collect", async interaction => {
                            if (interaction.user.id !== targetUser.id) return interaction.reply({ content: "This trade isn't for you.", ephemeral: true });

                            if (interaction.customId === "decline_trade") {
                                tradeSessions.delete(senderId);
                                tradeCompleted = true;
                                return interaction.update({ content: "❌ Trade declined.", embeds: [], components: [] });
                            }

                            const stillValid = await validateUserCards(prisma, session.sender.id, session.offer) &&
                                               await validateUserCards(prisma, session.receiver.id, session.request);
                            if (!stillValid) {
                                tradeSessions.delete(senderId);
                                tradeCompleted = true;
                                return interaction.update({ content: "❌ One or both users no longer have the required cards.", embeds: [], components: [] });
                            }

                            await applyTrade(prisma, session.sender.id, session.receiver.id, session.offer, session.request);
                            tradeSessions.delete(senderId);
                            tradeCompleted = true;

                            const resultEmbed = new EmbedBuilder()
                                .setTitle("✅ Trade Completed!")
                                .setDescription(
                                    `${message.author} gave:\n${session.offer.map(e => `- ${e.quantity}x ${e.card.name}`).join("\n")}\n\n` +
                                    `${targetUser} gave:\n${session.request.map(e => `- ${e.quantity}x ${e.card.name}`).join("\n")}`
                                )
                                .setColor(0x57F287);

                            await interaction.update({ content: "🎉 Trade successful!", embeds: [resultEmbed], components: [] });
                        });

                        buttonCollector.on("end", () => {
                            if (!tradeCompleted) {
                                sent.edit({ content: "⌛ Trade request expired.", embeds: [], components: [] });
                                tradeSessions.delete(senderId);
                            }
                        });
                    });
                });
            });
        } catch (err) {
            console.error("Trade error:", err);
            tradeSessions.delete(senderId);
            message.reply("⚠️ Trade session failed due to an error.");
        }
    }
};
