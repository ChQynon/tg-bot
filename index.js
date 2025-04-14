require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const fetch = require('node-fetch');

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

// Text formatting function - converts **text** to HTML bold formatting
function formatText(text) {
  if (!text) return text;
  
  try {
    // Replace **text** with <b>text</b> for HTML formatting
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // Escape HTML entities in the rest of the text to prevent rendering issues
    // Only if there's actual HTML formatting in the text
    if (formatted !== text) {
      // Escape < and > characters that aren't part of the HTML tags we've just added
      return formatted
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Restore our <b> tags
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>');
    }
    
    return formatted;
  } catch (error) {
    console.error('Error formatting text:', error);
    return text; // Return original text if there's an error
  }
}

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

    // Использование функции с таймаутом и повторными попытками
    let response;
    let retries = 2; // Количество попыток
    
    while (retries >= 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 секунд таймаут
        
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          break;
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`API request failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду перед повторной попыткой
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        retries--;
        if (retries >= 0) {
          console.log(`API request error, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw fetchError;
        }
      }
    }

    if (!response || !response.ok) {
      const errorData = response ? await response.json().catch(() => ({})) : {};
      console.error('OpenRouter API error:', errorData);
      throw new Error(`API request failed with status ${response ? response.status : 'unknown'}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message;

    // Save AI response to history
    ctx.session.messages.push(aiMessage);

    // Send response to user with proper formatting
    try {
      // Attempt to use HTML formatting
      const formattedText = formatText(aiMessage.content);
      await ctx.reply(formattedText, {
        ...mainKeyboard,
        parse_mode: 'HTML'
      });
    } catch (formatError) {
      console.error('Formatting error:', formatError);
      // Fallback to plain text if HTML formatting fails
      await ctx.reply(aiMessage.content, mainKeyboard);
    }

  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply('Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз через несколько секунд.', {
      ...mainKeyboard
    });
  }
});

// Webhook setup for production (Vercel)
if (process.env.NODE_ENV === 'production') {
  // Set webhook
  const PORT = process.env.PORT || 8080;
  const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://tg-bot-blush.vercel.app';
  
  // Webhook setup for Express
  const express = require('express');
  const app = express();
  
  // Add body parser middleware
  app.use(express.json());
  
  // Hello world route
  app.get('/', (req, res) => {
    res.send(`${botInfo.name} Bot is running!`);
  });
  
  // Webhook route with error handling
  app.post('/webhook', (req, res) => {
    try {
      // Pass the request to the bot webhook callback
      bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(200).send(); // Always return 200 to Telegram
    }
  });
  
  // Start Express server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Bot webhook set to ${WEBHOOK_URL}/webhook`);
  });
  
  // Set the webhook with Telegram
  bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`)
    .then((result) => {
      console.log('Webhook set successfully:', result);
    })
    .catch((error) => {
      console.error('Error setting webhook:', error);
    });
    
} else {
  // Launch the bot in polling mode for development
  bot.launch().then(() => {
    console.log(`${botInfo.name} bot is running in polling mode!`);
  }).catch(err => {
    console.error('Failed to launch bot:', err);
  });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 