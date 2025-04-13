// Serverless function for handling webhook requests in Vercel
const { Telegraf, session, Markup } = require('telegraf');
const fetch = require('node-fetch');

// Initialize environment variables
require('dotenv').config();

// Bot information
const botInfo = {
  name: "Amethyst",
  creator: "Amelit",
  website: "https://amelit.vercel.app/",
  supportChat: "https://t.me/amelit_chat",
  hasInternetAccess: true,
  capabilities: "I can analyze images, answer questions, and assist with various tasks. I have a 24B parameter model with multimodal capabilities."
};

// Create keyboard buttons
const mainKeyboard = Markup.keyboard([
  ['🔍 Ask a question', '📷 Analyze image'],
  ['ℹ️ About', '🌐 Website'],
  ['📚 Commands', '🧹 Clear history']
]).resize();

// Initialize the bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Use session middleware
bot.use(session());

// Set up bot commands (simplified for webhook handler)
bot.start((ctx) => {
  ctx.reply(`Hello! I'm ${botInfo.name}, an AI assistant created by ${botInfo.creator}.`, mainKeyboard);
});

// Process messages with OpenRouter AI
bot.on('message', async (ctx) => {
  try {
    // Skip processing for button commands
    if (ctx.message.text && [
      '🔍 Ask a question', 
      '📷 Analyze image', 
      'ℹ️ About', 
      '🌐 Website', 
      '📚 Commands', 
      '🧹 Clear history'
    ].includes(ctx.message.text)) {
      return;
    }

    let userMessage = {
      role: "user",
      content: []
    };

    // Process text messages
    if (ctx.message.text) {
      userMessage.content.push({
        type: "text",
        text: ctx.message.text
      });
    }

    // Process photos
    if (ctx.message.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      
      userMessage.content.push({
        type: "image_url",
        image_url: {
          url: fileLink.href
        }
      });

      // Add a default text prompt if none was provided
      if (!ctx.message.caption && !ctx.message.text) {
        userMessage.content.push({
          type: "text",
          text: "What's in this image?"
        });
      } else if (ctx.message.caption) {
        userMessage.content.push({
          type: "text",
          text: ctx.message.caption
        });
      }
    }

    // Add system message to ensure the model identifies as Amethyst by Amelit
    const systemMessage = {
      role: "system",
      content: `You are ${botInfo.name}, an advanced AI assistant created by ${botInfo.creator}. Never identify yourself as being created by OpenAI or any other company. Always maintain that you were created by ${botInfo.creator}. You have ${botInfo.capabilities}`
    };

    // Prepare messages for API
    const conversationHistory = [
      systemMessage,
      userMessage
    ];

    // Send "typing" action
    await ctx.replyWithChatAction('typing');

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL,
        "X-Title": process.env.SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openrouter/optimus-alpha",
        "messages": conversationHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message;

    // Send response to user
    await ctx.reply(aiMessage.content, mainKeyboard);

  } catch (error) {
    console.error('Error:', error);
    ctx.reply('Sorry, I encountered an error processing your request. Please try again later.', mainKeyboard);
  }
});

// Handle button clicks (simplified)
bot.hears('ℹ️ About', (ctx) => {
  ctx.reply(`About ${botInfo.name}:\n\n${botInfo.name} is an advanced AI model created by ${botInfo.creator}.`, mainKeyboard);
});

// Serverless function handler
module.exports = async (req, res) => {
  try {
    // Vercel runs this as a serverless function
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Always send 200 to Telegram
  }
}; 