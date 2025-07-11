// index.js (main bot entry)
const { Client, GatewayIntentBits } = require("discord.js");
const { config } = require("dotenv");
const { PrismaClient, CardRarity } = require("@prisma/client");

config({ path: __dirname + "/.env" });
const prisma = new PrismaClient();
const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
// ME, NICK, JORGE, PIN
const ADMIN_IDS = ["224231121720705044", "543652818855133196", "429116919967121418", "363341878642343936"];
const tradeSessions = new Map();

bot.once("ready", () => {
    console.log(`${bot.user.username} is online!`);
});

const commands = [
    require("./commands/addcard"),
    require("./commands/book"),
    require("./commands/canceltrade"),
    require("./commands/cardinfo"),
    require("./commands/cardlist"),
    require("./commands/flex"),
    require("./commands/importcards"),
    require("./commands/inventory"),
    require("./commands/leaderboard"),
    require("./commands/ntchelp"),
    require("./commands/rarestcards"),
    require("./commands/spin"),
    require("./commands/trade")
];

bot.on("messageCreate", async message => {
    if (message.author.bot) return;
    const content = message.content.trim();

    for (const cmd of commands) {
        if (content.toLowerCase().startsWith(cmd.name)) {
            return cmd.execute(message, { prisma, bot, ADMIN_IDS, tradeSessions });
        }
    }
});

bot.login(process.env.TOKEN);
