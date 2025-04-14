// Serverless function for handling webhook requests in Vercel
const { Telegraf, session, Markup } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize environment variables
require('dotenv').config();

// Настройки и тайм-ауты
const API_TIMEOUT = 12000; // 12 секунд максимальное время ожидания ответа от API
const DEFAULT_MODEL = "openrouter/optimus-alpha"; // Основная модель
const FALLBACK_MODEL = "openrouter/auto"; // Резервная модель, если основная не отвечает

// Bot status file (в бессерверной среде try/catch для избежания ошибок при доступе к файлам)
const STATUS_FILE = path.join('/tmp', 'bot_status.json');

// Get bot status with error handling
function getBotStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading status file:', error);
  }
  
  // Default status
  return { enabled: true, lastRestart: new Date().toISOString() };
}

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

// Initialize the bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Использование улучшенной сессии без сохранения в файл
bot.use(session({ 
  defaultSession: () => ({ messages: [] }) 
}));

// Check if bot is enabled
bot.use((ctx, next) => {
  const status = getBotStatus();
  
  // If bot is disabled, only allow admin messages
  if (!status.enabled) {
    // Admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD || 'amelit_admin';
    
    // Check if message contains admin password to bypass disabled state
    if (ctx.message && ctx.message.text && ctx.message.text.includes(adminPassword)) {
      return next();
    }
    
    // For all other messages, send disabled notification
    return ctx.reply('Бот временно отключен. Пожалуйста, попробуйте позже.', {
      parse_mode: 'HTML'
    });
  }
  
  return next();
});

// Функция тайм-аута для fetch запросов
const fetchWithTimeout = async (url, options, timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Функция для вызова OpenRouter с повторными попытками и резервной моделью
async function callOpenRouterAPI(messages, retries = 1) {
  try {
    // Первая попытка с основной моделью
    const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL,
        "X-Title": process.env.SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": DEFAULT_MODEL,
        "messages": messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed (attempt ${retries}):`, error.message);
    
    // Если это была последняя попытка или превышен таймаут, используем запасную модель
    if (retries <= 0 || error.name === 'AbortError') {
      console.log('Using fallback model due to timeout or max retries reached');
      try {
        const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.SITE_URL,
            "X-Title": process.env.SITE_NAME,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": FALLBACK_MODEL,
            "messages": messages
          })
        });
        
        if (!response.ok) {
          throw new Error(`Fallback API request failed with status ${response.status}`);
        }
        
        return await response.json();
      } catch (fallbackError) {
        console.error('Fallback API call failed:', fallbackError.message);
        throw fallbackError;
      }
    }
    
    // Иначе повторяем попытку
    return callOpenRouterAPI(messages, retries - 1);
  }
}

// Welcome message
bot.start((ctx) => {
  ctx.reply(`Hello! I'm ${botInfo.name}, an AI assistant created by ${botInfo.creator}. 

I have internet access and can help with many tasks including analyzing images.

Visit our website: ${botInfo.website}
Need help? Contact support: ${botInfo.supportChat}`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
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

You can also use the buttons below or send me images for analysis and ask me any questions.

<b>Text Formatting:</b>
Use **text** to make text <b>bold</b> in my responses.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
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

Visit ${botInfo.website} for more information.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Clear conversation history
bot.command('clear', (ctx) => {
  ctx.session.messages = [];
  ctx.reply('Conversation history has been cleared.', {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Website command
bot.command('website', (ctx) => {
  ctx.reply(`Visit our website to learn more about ${botInfo.name} and ${botInfo.creator}: ${botInfo.website}`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Contact command
bot.command('contact', (ctx) => {
  ctx.reply(`Need help or have questions? Contact our support team:
  
Support chat: ${botInfo.supportChat}
Website: ${botInfo.website}`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Settings command
bot.command('settings', (ctx) => {
  ctx.reply(`${botInfo.name} Settings:

Currently, you can clear your conversation history using the /clear command.

More settings options will be available soon!`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Feedback command
bot.command('feedback', (ctx) => {
  ctx.reply(`We value your feedback! Please share your thoughts about ${botInfo.name}.

Your message will be forwarded to the ${botInfo.creator} team.

To send feedback, reply to this message with your comments.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Add handler for /ai command (alternative to .ai)
bot.command('ai', (ctx) => {
  // Extract the text after the command
  const text = ctx.message.text.split('/ai').pop().trim();
  
  // If there's no text after /ai, ask for a question
  if (!text) {
    return ctx.reply('Что вы хотите узнать?', {
      ...mainKeyboard,
      parse_mode: 'HTML'
    });
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
  ctx.reply(`I'm ready to answer your questions! What would you like to know?`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

bot.hears('📷 Analyze image', (ctx) => {
  ctx.reply(`Please send me an image, and I'll analyze what's in it.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

bot.hears('ℹ️ About', (ctx) => {
  ctx.reply(`About ${botInfo.name}:

${botInfo.name} is an advanced AI model with 24 billion parameters created by ${botInfo.creator}.

Features:
• Advanced multimodal capabilities
• State-of-the-art performance in text-based reasoning
• 128k token context window
• Image analysis capabilities

Visit ${botInfo.website} for more information.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

bot.hears('🌐 Website', (ctx) => {
  ctx.reply(`Visit our website: ${botInfo.website}`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
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

You can also use the buttons below or send me images for analysis and ask me any questions.

<b>Text Formatting:</b>
Use **text** to make text <b>bold</b> in my responses.`, {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

bot.hears('🧹 Clear history', (ctx) => {
  ctx.session.messages = [];
  ctx.reply('Conversation history has been cleared.', {
    ...mainKeyboard,
    parse_mode: 'HTML'
  });
});

// Process messages with OpenRouter AI
bot.on('message', async (ctx) => {
  try {
    console.log('Received message from user:', ctx.from.id, 'text:', ctx.message.text?.substring(0, 50) || '[no text]');
    
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

    // Immediately send typing action to show the bot is responsive
    try {
      await ctx.replyWithChatAction('typing');
    } catch (typingError) {
      console.error('Error sending typing action:', typingError);
      // Continue even if typing action fails
    }

    // Check if message is in a group chat
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    // Get bot information (с защитой от ошибок)
    let botUsername = '';
    try {
      const botUser = await ctx.telegram.getMe();
      botUsername = botUser.username;
    } catch (error) {
      console.error('Error getting bot info:', error);
      // Продолжаем без имени бота, просто не сможем обрабатывать упоминания
    }
    
    // Skip message processing in groups unless the bot is mentioned or .ai command is used
    if (isGroup) {
      const messageText = ctx.message.text || '';
      const messageCaption = ctx.message.caption || '';
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
      const aiCommandRegex = /^\.ai\b/i;
      
      // Check if message starts with .ai or mentions the bot
      const isAiCommand = aiCommandRegex.test(messageText) || aiCommandRegex.test(messageCaption);
      const isBotMentioned = botUsername && (mentionRegex.test(messageText) || mentionRegex.test(messageCaption));
      
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
      
      // Если после удаления команды/упоминания сообщение пустое, запросим вопрос
      if ((!ctx.message.text || ctx.message.text.trim() === '') && 
          (!ctx.message.caption || ctx.message.caption.trim() === '') &&
          !ctx.message.photo) {
        return ctx.reply('Что вы хотите узнать?', {
          parse_mode: 'HTML'
        });
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

    // Process photos with защитой от ошибок при загрузке изображений
    if (ctx.message.photo) {
      try {
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
      } catch (photoError) {
        console.error('Error processing photo:', photoError);
        // Если не удалось обработать фото, продолжаем только с текстом
        await ctx.reply('Извините, возникла проблема при обработке изображения. Пожалуйста, повторите попытку позже.', {
          parse_mode: 'HTML'
        });
        if (!ctx.message.text && !ctx.message.caption) {
          return; // Если нет текста, прекращаем обработку
        }
      }
    }

    // Проверяем не пустой ли запрос
    if (userMessage.content.length === 0) {
      return ctx.reply('Пожалуйста, отправьте текст или изображение.', {
        parse_mode: 'HTML'
      });
    }

    // Инициализируем сессию, если её нет
    if (!ctx.session.messages) {
      ctx.session.messages = [];
    }

    // Сохраняем только последние 5 сообщений в истории для экономии памяти
    if (ctx.session.messages.length > 10) {
      ctx.session.messages = ctx.session.messages.slice(-5);
    }
    
    // Save message to history
    ctx.session.messages.push(userMessage);

    // Add system message to ensure the model identifies as Amethyst by Amelit
    const systemMessage = {
      role: "system",
      content: `You are ${botInfo.name}, an advanced AI assistant created by ${botInfo.creator}. Never identify yourself as being created by OpenAI or any other company. Always maintain that you were created by ${botInfo.creator}. You have ${botInfo.capabilities}

To make text bold in your responses, you can surround it with double asterisks like this: **important text**. This will be displayed as bold text to the user. Use this feature to highlight important information or for emphasis when appropriate.

Keep your responses concise and to the point. Focus on providing accurate and helpful information.`
    };

    // Prepare conversation history for the API (ограничиваем количество сообщений)
    const conversationHistory = [
      systemMessage,
      ...ctx.session.messages.slice(-3) // Limit to just last 3 messages for faster response
    ];

    // Повторно отправляем сигнал набора текста для длительной обработки
    await ctx.replyWithChatAction('typing');
    
    console.log('Calling API for user:', ctx.from.id);

    try {
      // Вызываем API с улучшенным обработчиком и таймаутом
      const data = await callOpenRouterAPI(conversationHistory);
      console.log('Received API response for user:', ctx.from.id);
      
      const aiMessage = data.choices[0].message;

      // Save AI response to history
      ctx.session.messages.push(aiMessage);

      // Format the response text with bold formatting
      const formattedResponse = formatText(aiMessage.content);

      // Send response to user with HTML formatting
      try {
        console.log('Sending reply to user:', ctx.from.id);
        await ctx.reply(formattedResponse, {
          ...mainKeyboard,
          parse_mode: 'HTML'
        });
        console.log('Reply sent successfully to user:', ctx.from.id);
      } catch (htmlError) {
        console.error('HTML formatting error:', htmlError);
        // Fallback to plain text if HTML formatting fails
        await ctx.reply(aiMessage.content, mainKeyboard);
      }
    } catch (apiError) {
      console.error('API error:', apiError);
      
      // Отправляем пользователю сообщение о проблеме
      await ctx.reply('Извините, возникла проблема при получении ответа. Пожалуйста, повторите ваш запрос через несколько секунд.', {
        ...mainKeyboard,
        parse_mode: 'HTML'
      });
    }

  } catch (error) {
    console.error('Error processing message:', error);
    // Более информативное сообщение об ошибке
    try {
      await ctx.reply('Извините, произошла ошибка при обработке запроса. Пожалуйста, повторите попытку позже.', {
        ...mainKeyboard,
        parse_mode: 'HTML' 
      });
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

// Serverless function handler
module.exports = async (req, res) => {
  try {
    // Сразу отвечаем Telegram, не дожидаясь обработки сообщения
    // Это критически важно для бессерверных функций, чтобы избежать 
    // завершения функции до отправки ответа пользователю
    res.status(200).send('OK');
    
    // Vercel runs this as a serverless function
    if (req.method === 'POST') {
      // Обрабатываем запрос уже после отправки ответа Telegram
      // Чтобы функция не завершилась до отправки ответа пользователю
      try {
        console.log('Processing webhook update:', JSON.stringify(req.body).substring(0, 500) + '...');
        
        // Создаем обещание, которое никогда не разрешится, чтобы предотвратить 
        // преждевременное завершение функции
        const neverResolve = new Promise(() => {});
        
        // Обработка запроса с возможностью отправки ответа пользователю
        // происходит асинхронно, но мы не ждем её завершения перед ответом Telegram
        const botResponsePromise = bot.handleUpdate(req.body);
        
        // Запускаем обработку, но не ждем её завершения
        botResponsePromise.catch(error => {
          console.error('Error in bot.handleUpdate:', error);
        });
        
        // Важно: в бессерверной среде функция может завершиться до отправки ответа пользователю,
        // поэтому мы используем таймаут, чтобы дать боту шанс отправить ответ
        // Это должно решить проблему с "ответом через раз"
        await new Promise(resolve => setTimeout(resolve, 9000));
        
      } catch (webhookError) {
        console.error('Webhook processing error:', webhookError);
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Даже в случае ошибки отвечаем 200, чтобы Telegram не повторял запросы
    if (!res.headersSent) {
      res.status(200).send('OK');
    }
  }
}; 