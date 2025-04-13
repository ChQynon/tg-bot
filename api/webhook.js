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

// Use session middleware to remember chat history
bot.use(session());

// Initialize session data
bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {
      messages: [],
      userInfo: {}
    };
  }
  return next();
});

// Welcome message
bot.start((ctx) => {
  ctx.reply(`Hello! I'm ${botInfo.name}, an AI assistant created by ${botInfo.creator}. 

I have internet access and can help with many tasks including analyzing images.

Visit our website: ${botInfo.website}
Need help? Contact support: ${botInfo.supportChat}`, mainKeyboard);
});

// Help command
bot.help((ctx) => {
  ctx.reply(`${botInfo.name} Bot Commands:
  
/start - Start or restart the bot
/help - Show this help message
/about - Learn about ${botInfo.name} and ${botInfo.creator}
/clear - Clear your conversation history
/settings - Adjust bot settings
/feedback - Send feedback to our team
/contact - Get support contact information

You can also use the buttons below or send me images for analysis and ask me any questions.`, mainKeyboard);
});

// About command
bot.command('about', (ctx) => {
  ctx.reply(`About ${botInfo.name}:

${botInfo.name} is an advanced AI model with 24 billion parameters created by ${botInfo.creator}.

Features:
• Advanced multimodal capabilities
• State-of-the-art performance in text-based reasoning
• 128k token context window
• Image analysis capabilities

Visit ${botInfo.website} for more information.`, mainKeyboard);
});

// Clear conversation history
bot.command('clear', (ctx) => {
  ctx.session.messages = [];
  ctx.reply('Conversation history has been cleared.', mainKeyboard);
});

// Website command
bot.command('website', (ctx) => {
  ctx.reply(`Visit our website to learn more about ${botInfo.name} and ${botInfo.creator}: ${botInfo.website}`, mainKeyboard);
});

// Contact command
bot.command('contact', (ctx) => {
  ctx.reply(`Need help or have questions? Contact our support team:
  
Support chat: ${botInfo.supportChat}
Website: ${botInfo.website}`, mainKeyboard);
});

// Settings command
bot.command('settings', (ctx) => {
  ctx.reply(`${botInfo.name} Settings:

Currently, you can clear your conversation history using the /clear command.

More settings options will be available soon!`, mainKeyboard);
});

// Feedback command
bot.command('feedback', (ctx) => {
  ctx.reply(`We value your feedback! Please share your thoughts about ${botInfo.name}.

Your message will be forwarded to the ${botInfo.creator} team.

To send feedback, reply to this message with your comments.`, mainKeyboard);
});

// Add handler for /ai command (alternative to .ai)
bot.command('ai', (ctx) => {
  // Extract the text after the command
  const text = ctx.message.text.split('/ai').pop().trim();
  
  // If there's no text after /ai, ask for a question
  if (!text) {
    return ctx.reply('Что вы хотите узнать?', mainKeyboard);
  }
  
  // Set the message text to be processed by the regular message handler
  ctx.message.text = text;
  
  // Pass to the regular message handler (without recursion)
  bot.handleUpdate({
    update_id: ctx.update.update_id,
    message: ctx.message
  });
});

// Handle button clicks
bot.hears('🔍 Ask a question', (ctx) => {
  ctx.reply(`I'm ready to answer your questions! What would you like to know?`, mainKeyboard);
});

bot.hears('📷 Analyze image', (ctx) => {
  ctx.reply(`Please send me an image, and I'll analyze what's in it.`, mainKeyboard);
});

bot.hears('ℹ️ About', (ctx) => {
  ctx.reply(`About ${botInfo.name}:

${botInfo.name} is an advanced AI model with 24 billion parameters created by ${botInfo.creator}.

Features:
• Advanced multimodal capabilities
• State-of-the-art performance in text-based reasoning
• 128k token context window
• Image analysis capabilities

Visit ${botInfo.website} for more information.`, mainKeyboard);
});

bot.hears('🌐 Website', (ctx) => {
  ctx.reply(`Visit our website: ${botInfo.website}`, mainKeyboard);
});

bot.hears('📚 Commands', (ctx) => {
  ctx.reply(`${botInfo.name} Bot Commands:
  
/start - Start or restart the bot
/help - Show this help message
/about - Learn about ${botInfo.name} and ${botInfo.creator}
/clear - Clear your conversation history
/settings - Adjust bot settings
/feedback - Send feedback to our team
/contact - Get support contact information

You can also use the buttons below or send me images for analysis and ask me any questions.`, mainKeyboard);
});

bot.hears('🧹 Clear history', (ctx) => {
  ctx.session.messages = [];
  ctx.reply('Conversation history has been cleared.', mainKeyboard);
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

    // Check if message is in a group chat
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    // Get bot information
    const botUser = await ctx.telegram.getMe();
    const botUsername = botUser.username;
    
    // Skip message processing in groups unless the bot is mentioned or .ai command is used
    if (isGroup) {
      const messageText = ctx.message.text || '';
      const messageCaption = ctx.message.caption || '';
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
      const aiCommandRegex = /^\.ai\b/i;
      
      // Check if message starts with .ai or mentions the bot
      const isAiCommand = aiCommandRegex.test(messageText) || aiCommandRegex.test(messageCaption);
      const isBotMentioned = mentionRegex.test(messageText) || mentionRegex.test(messageCaption);
      
      // Skip if not a command for the bot in a group chat
      if (!isAiCommand && !isBotMentioned) {
        return;
      }
      
      // Remove command or mention from the message text
      if (ctx.message.text) {
        if (isAiCommand) {
          ctx.message.text = ctx.message.text.replace(aiCommandRegex, '').trim();
        } else if (isBotMentioned) {
          ctx.message.text = ctx.message.text.replace(mentionRegex, '').trim();
        }
      }
      
      // Remove command or mention from caption if present
      if (ctx.message.caption) {
        if (isAiCommand) {
          ctx.message.caption = ctx.message.caption.replace(aiCommandRegex, '').trim();
        } else if (isBotMentioned) {
          ctx.message.caption = ctx.message.caption.replace(mentionRegex, '').trim();
        }
      }
    }
    
    // Continue with normal message processing...
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
      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get the highest quality photo
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
        // Add caption as text content
        userMessage.content.push({
          type: "text",
          text: ctx.message.caption
        });
      }
    }

    // Save message to history
    ctx.session.messages.push(userMessage);

    // Add system message to ensure the model identifies as Amethyst by Amelit
    const systemMessage = {
      role: "system",
      content: `You are ${botInfo.name}, an advanced AI assistant created by ${botInfo.creator}. Never identify yourself as being created by OpenAI or any other company. Always maintain that you were created by ${botInfo.creator}. You have ${botInfo.capabilities}`
    };

    // Prepare conversation history for the API
    const conversationHistory = [
      systemMessage,
      ...ctx.session.messages.slice(-10) // Limit to last 10 messages
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

    // Save AI response to history
    ctx.session.messages.push(aiMessage);

    // Send response to user
    await ctx.reply(aiMessage.content, mainKeyboard);

  } catch (error) {
    console.error('Error:', error);
    ctx.reply('Sorry, I encountered an error processing your request. Please try again later.', mainKeyboard);
  }
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