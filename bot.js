const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Admin user IDs
const ADMINS = ['1450544639621992579', '1292538951562821735'];

// Load or create economy data
const economyFile = path.join(__dirname, 'economy.json');
let economy = {};

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
    saveEconomy();
  }
  return economy[userId];
}

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  loadEconomy();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args[0].toLowerCase();

  // -balance or -bal command
  if (command === 'bal' || command === 'balance') {
    const userData = getUserData(message.author.id);
    return message.reply(`💰 You have **$${userData.balance}** cash.`);
  }

  // -daily command
  if (command === 'daily') {
    const userData = getUserData(message.author.id);
    const now = Date.now();
    const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (userData.lastDaily && now - userData.lastDaily < dailyCooldown) {
      const timeLeft = Math.ceil((userData.lastDaily + dailyCooldown - now) / 1000 / 60 / 60);
      return message.reply(`⏰ You can claim your daily reward in **${timeLeft}** hours.`);
    }

    const reward = Math.floor(Math.random() * 31) + 10; // 10-40
    userData.balance += reward;
    userData.lastDaily = now;
    saveEconomy();

    return message.reply(`🎁 You claimed your daily reward! You got **$${reward}** cash.
💰 Total: **$${userData.balance}**`);
  }

  // -chest command
  if (command === 'chest') {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('chest_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('chest_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁 Buy a Chest')
      .setDescription('A chest costs **$100** cash. Do you want to buy it?');

    return message.reply({ embeds: [embed], components: [row] });
  }

  // -open command
  if (command === 'open') {
    const userData = getUserData(message.author.id);

    if (userData.chests <= 0) {
      return message.reply(`❌ You don't have any chests to open!`);
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('open_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📦 Open a Chest')
      .setDescription(`You have **${userData.chests}** chests. Do you want to open one?`);

    return message.reply({ embeds: [embed], components: [row] });
  }

  // -gp command (admin only)
  if (command === 'gp') {
    if (!ADMINS.includes(message.author.id)) {
      return message.reply(`❌ You don't have permission to use this command.`);
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount) || amount < 1) {
      return message.reply(`Usage: -gp <user> <amount>`);
    }

    const userData = getUserData(user.id);
    userData.balance += amount;
    saveEconomy();

    return message.reply(`✅ Gave **$${amount}** to ${user.tag}. New balance: **$${userData.balance}**`);
  }

  // -rp command (admin only)
  if (command === 'rp') {
    if (!ADMINS.includes(message.author.id)) {
      return message.reply(`❌ You don't have permission to use this command.`);
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount) || amount < 1) {
      return message.reply(`Usage: -rp <user> <amount>`);
    }

    const userData = getUserData(user.id);
    userData.balance = Math.max(0, userData.balance - amount);
    saveEconomy();

    return message.reply(`✅ Removed **$${amount}** from ${user.tag}. New balance: **$${userData.balance}**`);
  }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const userData = getUserData(userId);

  if (interaction.customId === 'chest_confirm') {
    if (userData.balance < 100) {
      return interaction.reply({ content: `❌ You don't have enough cash! You need **$100**, but you only have **$${userData.balance}**.`, ephemeral: true });
    }

    userData.balance -= 100;
    userData.chests += 1;
    saveEconomy();

    return interaction.reply({ content: `✅ You bought a chest! 🎁\n💰 New balance: **$${userData.balance}**\n📦 Chests: **${userData.chests}**`, ephemeral: true });
  }

  if (interaction.customId === 'chest_deny') {
    return interaction.reply({ content: `❌ Cancelled chest purchase.`, ephemeral: true });
  }

  if (interaction.customId === 'open_confirm') {
    const reward = Math.floor(Math.random() * 100) + 50; // 50-150 cash reward
    userData.balance += reward;
    userData.chests -= 1;
    saveEconomy();

    return interaction.reply({ content: `🎁 You opened a chest and got **$${reward}** cash!\n💰 New balance: **$${userData.balance}**\n📦 Chests: **${userData.chests}**`, ephemeral: true });
  }

  if (interaction.customId === 'open_deny') {
    return interaction.reply({ content: `❌ Cancelled opening chest.`, ephemeral: true });
  }
});

client.login(token);