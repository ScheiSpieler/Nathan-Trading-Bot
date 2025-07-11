async function checkFirstFullCompletion(prisma, user, client) {
    const allCards = await prisma.card.findMany();
    const userCards = await prisma.userCard.findMany({
        where: { userId: user.id }
    });

    const ownedCardIds = new Set(userCards.map(uc => uc.cardId));
    const hasAll = allCards.every(card => ownedCardIds.has(card.id));

    const completedFlag = await prisma.meta.findUnique({ where: { key: "firstToComplete" } });

    if (hasAll && !completedFlag) {
        await prisma.meta.create({
            data: { key: "firstToComplete", value: user.discordId }
        });

        const message = `
@everyone 🎉🎉🎉 HOLY NATHAN 🎉🎉🎉  
**<@${user.discordId}>** JUST BECAME THE **FIRST EVER** USER TO COMPLETE THE ENTIRE CARD COLLECTION!!!

🃏 That’s **100%** of all cards.
🏆 They win a **SIGNED PHYSICAL NATHAN CARD** of their choosing.
✨ This is a historic moment in the Nathan Trading Card Universe.

SPAM THE EMOTES!!! 🎊🔥🎊🔥  
@everyone @everyone @everyone`;

        const announcementChannel = client.channels.cache.find(
            c => c.name.toLowerCase().includes("general") || c.name.toLowerCase().includes("nathan")
        );

        if (announcementChannel?.isTextBased?.()) {
            for (let i = 0; i < 3; i++) {
                await announcementChannel.send(message);
            }
        }
    }
}

module.exports = { checkFirstFullCompletion };
