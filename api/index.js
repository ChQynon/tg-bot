// Simple index page for the bot API
module.exports = (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Amethyst AI Bot</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 {
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
          a {
            color: #6a1b9a;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1>Amethyst AI Bot</h1>
        <div class="container">
          <p>This is the <span class="logo">Amethyst</span> AI assistant created by <strong>Amelit</strong>.</p>
          <p>The bot has been deployed and should be accessible through Telegram.</p>
          <p>For more information, visit our website: <a href="https://amelit.vercel.app/" target="_blank">https://amelit.vercel.app/</a></p>
          <p>Need help? Contact our support chat: <a href="https://t.me/amelit_chat" target="_blank">https://t.me/amelit_chat</a></p>
        </div>
        <div class="container">
          <h3>Status:</h3>
          <p>Webhook is active and ready to receive messages.</p>
          <p>Last updated: ${new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  `);
}; 