require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const ADMINS = ['1450544639621992579', '1292538951562821735'];

const economyFile = path.join(__dirname, 'economy.json');
let economy = {};

const CHEST_PRICE = 200;

const CHEST_REWARDS = [
  { rarity: 'Common', chance: 60, min: 50, max: 90 },
  { rarity: 'Rare', chance: 25, min: 100, max: 175 },
  { rarity: 'Epic', chance: 10, min: 200, max: 350 },
  { rarity: 'Legendary', chance: 5, min: 400, max: 700 }
];

function loadEconomy() {
  if (fs.existsSync(economyFile)) {
    economy = JSON.parse(fs.readFileSync(economyFile, 'utf8'));
  }
}

function saveEconomy() {
  fs.writeFileSync(economyFile, JSON.stringify(economy, null, 2));
}

function getUserData(userId) {
  if (!economy[userId]) {
    economy[userId] = { balance: 0, lastDaily: null, chests: 0 };
  }
  return economy[userId];
}

function rollChest() {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const reward of CHEST_REWARDS) {
    cumulative += reward.chance;
    if (roll <= cumulative) {
      const amount =
        Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
      return { rarity: reward.rarity, amount };
    }
  }
}

client.once('ready', () => {
  loadEconomy();
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args[0].toLowerCase();
  const userData = getUserData(message.author.id);

  // Balance
  if (command === 'bal' || command === 'balance') {
    return message.reply(
      `💰 Balance: **$${userData.balance}**\n📦 Chests: **${userData.chests}**`
    );
  }

  // Daily
  if (command === 'daily') {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (userData.lastDaily && now - userData.lastDaily < cooldown) {
      const hours = Math.ceil(
        (userData.lastDaily + cooldown - now) / 3600000
      );
      return message.reply(`⏳ Come back in **${hours}h**.`);
    }

    const reward = Math.floor(Math.random() * 31) + 10;
    userData.balance += reward;
    userData.lastDaily = now;
    saveEconomy();

    return message.reply(
      `🎁 Daily claimed: **$${reward}**\n💰 Total: **$${userData.balance}**`
    );
  }

  // Buy Chest
  if (command === 'chest') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buy_confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('buy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁 Buy Chest')
      .setDescription(
        `Cost: **$${CHEST_PRICE}**\n\nThis chest contains random rarity rewards.\nProceed with purchase?`
      );

    return message.reply({ embeds: [embed], components: [row] });
  }

  // Open Chest Preview
  if (command === 'open') {
    if (userData.chests <= 0) {
      return message.reply(`❌ You have no chests.`);
    }

    const rewardInfo = CHEST_REWARDS.map(r =>
      `**${r.rarity}** (${r.chance}%) → $${r.min} - $${r.max}`
    ).join('\n');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_confirm')
        .setLabel('Open Chest')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('open_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle('📦 Open Chest')
      .setDescription(
        `You have **${userData.chests}** chest(s).\n\n` +
        `🎲 **Possible Rewards:**\n${rewardInfo}\n\n` +
        `Are you sure you want to open one?`
      );

    return message.reply({ embeds: [embed], components: [row] });
  }

  // Admin Give
  if (command === 'gp') {
    if (!ADMINS.includes(message.author.id)) return;

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (!user || isNaN(amount) || amount < 1) return;

    const target = getUserData(user.id);
    target.balance += amount;
    saveEconomy();

    return message.reply(`✅ Gave **$${amount}** to ${user.tag}`);
  }

  // Admin Remove
  if (command === 'rp') {
    if (!ADMINS.includes(message.author.id)) return;

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (!user || isNaN(amount) || amount < 1) return;

    const target = getUserData(user.id);
    target.balance = Math.max(0, target.balance - amount);
    saveEconomy();

    return message.reply(`✅ Removed **$${amount}** from ${user.tag}`);
  }
});

// Button Handling
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const userData = getUserData(interaction.user.id);

  if (interaction.customId === 'buy_confirm') {
    if (userData.balance < CHEST_PRICE) {
      return interaction.reply({
        content: `❌ Not enough money.`,
        ephemeral: true
      });
    }

    userData.balance -= CHEST_PRICE;
    userData.chests += 1;
    saveEconomy();

    return interaction.reply({
      content:
        `✅ Chest purchased.\n💰 Balance: **$${userData.balance}**\n📦 Chests: **${userData.chests}**`,
      ephemeral: true
    });
  }

  if (interaction.customId === 'buy_cancel') {
    return interaction.reply({ content: `❌ Purchase cancelled.`, ephemeral: true });
  }

  if (interaction.customId === 'open_confirm') {
    if (userData.chests <= 0) {
      return interaction.reply({
        content: `❌ No chests available.`,
        ephemeral: true
      });
    }

    const result = rollChest();
    userData.balance += result.amount;
    userData.chests -= 1;
    saveEconomy();

    return interaction.reply({
      content:
        `🎉 **${result.rarity} Reward!**\n` +
        `💰 You received **$${result.amount}**\n\n` +
        `💰 Balance: **$${userData.balance}**\n` +
        `📦 Chests left: **${userData.chests}**`
    });
  }

  if (interaction.customId === 'open_cancel') {
    return interaction.reply({ content: `❌ Opening cancelled.`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
