# Discord Economy Bot

A simple Discord bot with an economy system featuring balance checks, daily rewards, chests, and admin commands.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `config.json` file and add your bot token:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN_HERE"
}
```

3. Run the bot:
```bash
npm start
```

## Commands

### User Commands
- `-bal` or `-balance` - Check your current cash balance
- `-daily` - Claim your daily reward (10-40 cash, once per 24 hours)
- `-chest` - Buy a chest for $100 (with confirm/deny buttons)
- `-open` - Open a chest to get a random reward 50-150 cash (with confirm/deny buttons)

### Admin Commands
- `-gp <user> <amount>` - Give cash to a user
- `-rp <user> <amount>` - Remove cash from a user

## Admin User IDs
```
1450544639621992579
1292538951562821735
```

## Data Storage
All economy data is saved in `economy.json` automatically.