// lib/templates/resetPasswordEmail.ts
export function getResetPasswordEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer tu contraseña</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    .container {
      max-width: 480px;
      margin: 48px auto;
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .header {
  background: linear-gradient(135deg, #007AFF, #0A84FF);
  padding: 28px 24px;
  text-align: center;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

    .header img {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      object-fit: contain;
    }
    .logo-text {
      font-weight: 700;
      font-size: 22px;
      letter-spacing: -0.4px;
    }
    .content {
      padding: 42px 28px 36px;
      text-align: center;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 14px;
      color: #1d1d1f;
    }
    .message {
      font-size: 15px;
      color: #515154;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #0A84FF, #007AFF);
      color: #fff !important;
      font-weight: 600;
      letter-spacing: -0.3px;
      font-size: 16.5px;
      padding: 14px 38px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(10,132,255,0.35);
      transition: all 0.25s ease;
    }
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(10,132,255,0.45);
      background: linear-gradient(135deg, #007AFF, #0066CC);
    }
    .footer {
      padding: 26px;
      text-align: center;
      font-size: 12.5px;
      color: #8e8e93;
      background: #f8f8fa;
      border-top: 1px solid rgba(0,0,0,0.05);
    }
    .link {
      color: #007AFF;
      text-decoration: none;
      font-weight: 500;
    }
    .link:hover {
      text-decoration: underline;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #000; color: #f5f5f7; }
      .container { background: #1c1c1e; border-color: #2c2c2e; box-shadow: 0 8px 28px rgba(0,0,0,0.6); }
      .greeting, .message { color: #f5f5f7; }
      .footer { background: #1c1c1e; color: #98989d; border-top-color: #2c2c2e; }
      .button { box-shadow: 0 8px 24px rgba(10,132,255,0.4); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
  <img
    src="https://res.cloudinary.com/dkwosk8qd/image/upload/v1761104289/Logo_Final_oywvic.png"
    alt="Myckeo Logo"
    style="width:34px;height:34px;border-radius:8px;object-fit:contain;margin-right:8px;"
  />
  <div class="logo-text" style="font-weight:700;font-size:22px;letter-spacing:-0.4px;">
    Myckeo
  </div>
</div>
    <div class="content">
      <h1 class="greeting">Hola${name ? `, ${name}` : ''}</h1>
      <p class="message">
        Hemos recibido una solicitud para restablecer tu contraseña.<br />
        Pulsa el botón de abajo para crear una nueva de forma segura.
      </p>
      <a href="${resetUrl}" class="button" target="_blank">
        Restablecer contraseña
      </a>
      <p class="message" style="margin-top: 28px; font-size: 13px; color: #8e8e93;">
        Si no solicitaste este cambio, ignora este mensaje. El enlace expirará en 1 hora.
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Myckeo. Todos los derechos reservados.</p>
      <p><a href="https://myckeo.com" class="link">myckeo.com</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
