const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "!ntchelp",
    execute: async (message) => {
        const embed = new EmbedBuilder()
            .setTitle("📘 Card Bot Help Menu")
            .setDescription("Here are all available commands:")
            .addFields(
                { name: "🎲 !spin", value: "Spin for a random card. 2 spins/hour." },
                { name: "🧾 !inventory [rarity] (optional)", value: "View your card collection one at a time with images. Filter by rarity if desired." },
                { name: "📕 !book [rarity] (optional)", value: "View your entire collection in a compact text-only list. Filter by rarity optionally." },
                { name: "📦 !cards [rarity] (optional)", value: "List all cards. Filter by rarity optionally." },
                { name: "🔍 !cardinfo <card name>", value: "Show details and stats for a specific card." },
                { name: "🎭 !flex <card name>", value: "Show off a card you own with its image and rarity flair." },
                { name: "🔁 !trade", value: "Start a trade with another user for any combination of cards." },
                { name: "❌ !canceltrade", value: "Force-exit your current trade session if stuck." },
                { name: "📈 !leaderboard [rarity] (optional)", value: "Top 10 collectors overall or filtered by a specific rarity." },
                { name: "🕵️ !rarestcards [rarity] (optional)", value: "See the 10 least owned cards overall or by rarity." },
                { name: "🔥 !popularcards [rarity] (optional)", value: "See the 10 most owned cards overall or by rarity." },
                { name: "⚙️ !addcard <rarity>, <name>, <imageURL>", value: "(Admin only) Add a new card to the database." },
                { name: "❓ Rarity Options", value: "Common, Rare, Epic, Legendary, Overlord" }
            )
            .setColor(0x3498db)
            .setFooter({ text: "Need more help? Contact an admin." });

        return message.reply({ embeds: [embed] });
    }
};
