# Amethyst Telegram Bot

A powerful AI assistant from Amelit with image analysis capabilities, powered by OpenRouter.

## Features

- Advanced AI capabilities with the 24B parameter Amethyst model
- Image analysis and understanding
- Conversation memory
- Internet access for up-to-date information
- Easy-to-use button interface
- Multiple command options

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Telegram Bot Token (from BotFather)
- OpenRouter API Key

### Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send the command `/newbot`
3. Follow the instructions to create a new bot
4. Name your bot "Amethyst" or similar
5. Copy the API token provided by BotFather

### Step 2: Get an OpenRouter API Key

1. Sign up at [OpenRouter](https://openrouter.ai)
2. Navigate to your dashboard and create an API key
3. Copy your API key

### Step 3: Configure Environment Variables

1. Open the `.env` file
2. Replace `your_telegram_bot_token` with the token you received from BotFather
3. Replace `your_openrouter_api_key` with your OpenRouter API key

### Step 4: Install Dependencies and Run Locally

```bash
# Install dependencies
npm install

# Start the bot in development mode
npm run dev

# Or start the bot in production mode
npm start
```

## Usage

### Button Interface

The bot provides a convenient button interface with the following options:

- 🔍 Ask a question - Start asking a question
- 📷 Analyze image - Prompt to send an image for analysis
- ℹ️ About - Learn about Amethyst
- 🌐 Website - Get the website link
- 📚 Commands - See all available commands
- 🧹 Clear history - Clear your conversation history

### Commands

The bot responds to the following commands:

- `/start` - Introduce the bot
- `/help` - Show available commands
- `/about` - Information about Amethyst and Amelit
- `/clear` - Clear conversation history
- `/settings` - Adjust bot settings
- `/feedback` - Send feedback to the Amelit team
- `/contact` - Get support contact information

You can also send:
- Text messages - Ask any question
- Images - The bot will analyze what's in the image

## Deployment

### GitHub

To deploy to GitHub:

1. Initialize a Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Add your GitHub repository:
   ```bash
   git remote add origin https://github.com/username/repo-name.git
   ```

3. Push to GitHub:
   ```bash
   git push -u origin main
   ```

### Vercel Deployment

To deploy the bot on Vercel:

1. Create a Vercel account at [Vercel](https://vercel.com)
2. Install the Vercel CLI: `npm i -g vercel`
3. Login to Vercel: `vercel login`
4. Deploy your bot: `vercel`
5. Set environment variables in Vercel dashboard:
   - TELEGRAM_BOT_TOKEN
   - OPENROUTER_API_KEY
   - NODE_ENV=production
   - WEBHOOK_URL (your Vercel deployment URL)
   - SITE_URL
   - SITE_NAME

6. After deployment, set your bot's webhook using:
   ```
   curl -F "url=https://your-vercel-app.vercel.app/webhook" https://api.telegram.org/bot<your_bot_token>/setWebhook
   ```

## Support

Need help? Contact us:
- Website: [https://amelit.vercel.app/](https://amelit.vercel.app/)
- Support chat: [https://t.me/amelit_chat](https://t.me/amelit_chat)

## Troubleshooting

- If your bot isn't responding, check the logs in Vercel dashboard
- Make sure all environment variables are correctly set
- Verify that your webhook URL is correctly configured 