// Simple index page for the bot API
const fs = require('fs');
const path = require('path');

// Bot descriptions
const botDescriptions = {
  short: "Amethyst — продвинутый AI-ассистент от Amelit с поддержкой анализа изображений, доступом к интернету и возможностью работы в групповых чатах.",
  
  full: `Amethyst — мощный искусственный интеллект от компании Amelit, построенный на основе 24-миллиардной языковой модели с расширенными мультимодальными возможностями.

**Ключевые возможности:**
• **Анализ изображений:** Распознавание объектов, сцен и текста на фотографиях
• **Мультимодальность:** Работа с текстом и изображениями в одном контексте
• **Интернет-доступ:** Актуальная информация и поиск данных в реальном времени
• **Широкий контекст:** Память на 128 тысяч токенов для длительных диалогов
• **Групповые чаты:** Работа по команде .ai или при упоминании @имя_бота
• **Форматирование:** Поддержка **жирного текста** для выделения важной информации

**Идеально подходит для:**
• Ответов на вопросы и поиска информации
• Анализа и описания изображений
• Помощи с повседневными задачами
• Обучения и консультаций
• Развлечения и творчества

Разработан с приоритетом безопасности, приватности и этичного использования.`
};

// Admin password (in a real app, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'amelit_admin';

// Bot status file
const STATUS_FILE = path.join('/tmp', 'bot_status.json');

// Get bot status
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

// Save bot status
function saveBotStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status), 'utf8');
  } catch (error) {
    console.error('Error writing status file:', error);
  }
}

// Initialize status if not exists
if (!fs.existsSync(STATUS_FILE)) {
  saveBotStatus(getBotStatus());
}

module.exports = (req, res) => {
  // Handle admin actions
  if (req.method === 'POST' && req.query.action) {
    const { password } = req.body || {};
    
    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const status = getBotStatus();
    
    switch (req.query.action) {
      case 'enable':
        status.enabled = true;
        status.lastUpdate = new Date().toISOString();
        saveBotStatus(status);
        return res.json({ success: true, status });
        
      case 'disable':
        status.enabled = false;
        status.lastUpdate = new Date().toISOString();
        saveBotStatus(status);
        return res.json({ success: true, status });
        
      case 'restart':
        status.lastRestart = new Date().toISOString();
        saveBotStatus(status);
        return res.json({ success: true, status });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }
  
  // Show status page
  const status = getBotStatus();
  
  // Render HTML
  res.status(200).send(`
    <html>
      <head>
        <title>Amethyst AI Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 {
            color: #6a1b9a;
          }
          .logo {
            font-weight: bold;
            color: #6a1b9a;
          }
          .container {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
          }
          .status-enabled {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          .status-disabled {
            background-color: #ffebee;
            color: #c62828;
          }
          a {
            color: #6a1b9a;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .button {
            display: inline-block;
            padding: 8px 16px;
            margin: 5px;
            background-color: #6a1b9a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .button:hover {
            background-color: #8e24aa;
          }
          .button-disabled {
            background-color: #9e9e9e;
          }
          input[type="password"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
          }
          .admin-panel {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .bot-description {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f0ff;
            border-radius: 8px;
            border-left: 4px solid #6a1b9a;
          }
          .tabs {
            display: flex;
            margin-bottom: 15px;
          }
          .tab {
            padding: 8px 16px;
            cursor: pointer;
            border: 1px solid #ddd;
            background-color: #f5f5f5;
          }
          .tab.active {
            background-color: #6a1b9a;
            color: white;
            border-color: #6a1b9a;
          }
          .tab:first-child {
            border-radius: 4px 0 0 4px;
          }
          .tab:last-child {
            border-radius: 0 4px 4px 0;
          }
          .tab-content {
            display: none;
          }
          .tab-content.active {
            display: block;
          }
        </style>
      </head>
      <body>
        <h1>Amethyst AI Bot</h1>
        <div class="container">
          <p>Это <span class="logo">Amethyst</span> — AI-ассистент, созданный компанией <strong>Amelit</strong>.</p>
          
          <div class="tabs">
            <div class="tab active" onclick="showTab('short')">Краткое описание</div>
            <div class="tab" onclick="showTab('full')">Полное описание</div>
          </div>
          
          <div id="short-description" class="tab-content bot-description active">
            ${botDescriptions.short}
          </div>
          
          <div id="full-description" class="tab-content bot-description">
            ${botDescriptions.full.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}
          </div>
          
          <p>Для получения дополнительной информации посетите наш веб-сайт: <a href="https://amelit.vercel.app/" target="_blank">https://amelit.vercel.app/</a></p>
          <p>Нужна помощь? Свяжитесь с нами: <a href="https://t.me/amelit_chat" target="_blank">https://t.me/amelit_chat</a></p>
        </div>
        
        <div class="container">
          <h3>Статус бота:</h3>
          <p>
            Текущий статус: 
            <span class="status ${status.enabled ? 'status-enabled' : 'status-disabled'}">
              ${status.enabled ? 'Активен' : 'Отключен'}
            </span>
          </p>
          <p>Последний перезапуск: ${new Date(status.lastRestart).toLocaleString()}</p>
          <p>Последнее обновление: ${status.lastUpdate ? new Date(status.lastUpdate).toLocaleString() : 'Нет данных'}</p>
        </div>
        
        <div class="container admin-panel">
          <h3>Панель управления</h3>
          <p>Введите пароль администратора для управления ботом:</p>
          <input type="password" id="admin-password" placeholder="Пароль">
          <br>
          <button class="button" onclick="controlBot('enable')">Включить бота</button>
          <button class="button" onclick="controlBot('disable')">Отключить бота</button>
          <button class="button" onclick="controlBot('restart')">Перезапустить бота</button>
          <p id="admin-message"></p>
        </div>
        
        <script>
          function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
              tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
              tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + '-description').classList.add('active');
            document.querySelector('.tab[onclick="showTab(\\'' + tabName + '\\')"]').classList.add('active');
          }
          
          function controlBot(action) {
            const password = document.getElementById('admin-password').value;
            if (!password) {
              document.getElementById('admin-message').textContent = 'Введите пароль';
              return;
            }
            
            fetch('/?action=' + action, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ password }),
            })
            .then(response => response.json())
            .then(data => {
              if (data.error) {
                document.getElementById('admin-message').textContent = 'Ошибка: ' + data.error;
              } else {
                document.getElementById('admin-message').textContent = 'Успешно выполнено!';
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            })
            .catch(error => {
              document.getElementById('admin-message').textContent = 'Ошибка: ' + error.message;
            });
          }
        </script>
      </body>
    </html>
  `);
}; 