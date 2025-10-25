# ARYA WhatsApp Bot - Replit Configuration

## Project Overview

**ARYA Bot** is a WhatsApp Business automation system that provides comprehensive service management across 12+ main categories and 70+ sub-services for PlanB Global Network Ltd Şti.

### Main Features
- 🛡️ **Insurance Services** (Traffic, Kasko, DASK, Housing, etc.)
- 💻 **Software Requests** (Custom Software, Mobile Apps)
- 🔒 **Cyber Security** (Network Security, Penetration Testing, Training)
- 🚚 **Logistics Services** (Domestic/International Shipping, Warehousing)
- 🌍 **Import/Export** (Market Research, Customs Services)
- 📊 **Professional Auditing** (Internal Audit, Supplier Audit)
- 🏠 **Construction & Real Estate** (Property, Contracting Services)
- 🤝 **CRM Services** (Customer Selection, Acquisition, Retention)
- 👕 **Textile Products** (Men's/Women's Clothing, Home Textiles)
- 💄 **Cosmetic Products** (Perfume, Personal Care, Medical)
- ✈️ **Tour Organization** (Domestic/International Tours, Shuttle Service)
- ☀️ **Solar Energy** (Installation, Efficiency Calculation)
- 🏢 **Corporate Services** (Consulting, Training, Strategy)

## Technical Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js (REST API)
- **WhatsApp Integration**: whatsapp-web.js (with Puppeteer)
- **AI Assistant**: Hugging Face Turkish BERT model
- **Browser**: Chromium (headless)

## Project Structure

```
arya-bot/
├── index.js                 # Main entry point
├── huggingface-asistan.js   # AI assistant for Turkish NLP
├── modules/                 # Core modules
│   ├── messageHandler.js    # Message processing
│   ├── menuHandler.js       # Menu navigation
│   ├── serviceFlow.js       # Service flow management
│   ├── sessionManager.js    # User session management
│   └── utils/               # Utility functions
├── data/                    # Service data (JSON)
├── config/                  # Configuration files
├── applications/            # Saved applications
└── session/                 # WhatsApp session data (auto-generated)
```

## Replit Setup

### Environment Configuration

The bot is configured to run on Replit with the following settings:

1. **Port**: 5000 (Replit standard)
2. **Host**: 0.0.0.0 (to work with Replit's proxy)
3. **Browser**: System Chromium (`/nix/store/.../chromium-browser`)

### Environment Variables

Create a `.env` file or set these in Replit Secrets:

```bash
PORT=5000
NODE_ENV=development
BOT_NAME=ARYA
COMPANY_NAME=PlanB Global Network Ltd Şti

# Optional: Hugging Face API (for enhanced AI responses)
HUGGINGFACE_API_KEY=your_key_here
HUGGINGFACE_MODEL=akdeniz27/bert-base-turkish-cased-ner
```

### System Dependencies

The following Nix packages are required and have been installed:

- **chromium** - Headless browser for WhatsApp Web
- **nss, atk, at-spi2-atk** - Accessibility libraries
- **cups** - Printing support
- **gtk3, gdk-pixbuf, pango, cairo** - Graphics libraries
- **libxkbcommon** - Keyboard handling
- **dbus** - Inter-process communication
- **alsa-lib** - Audio support

## Running the Bot

### Workflow Configuration

The bot runs via the "ARYA WhatsApp Bot" workflow:
- **Command**: `node index.js`
- **Port**: 5000
- **Output**: Console + Web UI

### Starting the Bot

1. Click the "Run" button in Replit
2. Wait for the QR code to appear in the console
3. Scan the QR code with WhatsApp (Settings > Linked Devices)
4. Bot will connect and be ready to receive messages

### API Endpoints

Once running, the bot exposes these endpoints:

- **GET /** - API information
- **GET /health** - Health check and bot status
- **GET /services** - List all available services

Access via: `https://[your-repl-name].[username].repl.co/health`

## How It Works

### Message Flow

1. User sends message to connected WhatsApp number
2. Message is processed by `messageHandler.js`
3. Bot determines intent (greeting, service request, menu navigation)
4. Appropriate response is generated
5. If needed, AI assistant provides fallback responses

### Service Request Flow

1. User selects service from menu
2. Bot asks sequential questions based on service type
3. Answers are validated and saved
4. Application is stored in `applications/` folder
5. User receives confirmation

### AI Integration

- Primary: Rule-based message handling
- Fallback: Hugging Face Turkish BERT for intelligent responses
- Handles edge cases and unknown queries

## Development Notes

### Session Management

- WhatsApp session data is stored in `./session/` directory
- This is auto-generated on first QR code scan
- Session persists across restarts
- To reset: delete `./session/` folder and restart

### Modular Architecture

The bot uses a modular structure:
- **modules/messageHandler/** - Message processing logic
- **modules/menuHandler/** - Menu and navigation
- **modules/saleFlow/** - Sales conversation management
- **modules/utils/** - Shared utilities

### Data Format

Service definitions are stored as JSON files:
```json
{
  "service_id": "unique_id",
  "service_name": "Service Name",
  "questions": [
    {
      "question": "Question text",
      "field": "field_name",
      "type": "text|number|date"
    }
  ]
}
```

## Troubleshooting

### Bot Not Starting

1. Check logs for Chromium errors
2. Verify system dependencies are installed
3. Clear session data and restart

### QR Code Not Appearing

1. Wait 30-60 seconds for Chromium to load
2. Check console logs for errors
3. Ensure port 5000 is not blocked

### WhatsApp Connection Lost

1. Bot auto-reconnects after 5 seconds
2. If persistent, delete `./session/` and re-authenticate
3. Check WhatsApp linked devices limit (max 5)

### Messages Not Responding

1. Check session is active
2. Verify message handler is loaded
3. Review logs for errors

## Deployment Considerations

### Production Deployment

When deploying to production:

1. Set `NODE_ENV=production` in environment
2. Use proper secrets management for API keys
3. Consider using a dedicated WhatsApp Business API
4. Implement proper logging and monitoring
5. Set up database for application storage

### Scaling

Current setup is single-instance. For scaling:
- Use WhatsApp Business API instead of Web
- Implement database for session/data storage
- Use message queue for async processing
- Deploy multiple instances with load balancing

## Recent Changes

- **2025-10-13**: Initial Replit import setup
  - Updated port from 3000 to 5000
  - Configured host as 0.0.0.0 for Replit proxy
  - Installed Chromium and required system dependencies
  - Updated puppeteer to use system Chromium
  - Moved API keys to environment variables
  - Created workflow configuration

## Support

For issues or questions:
- Developer: EurAsia Trade And Technology Bulgaria EOOD - ÆSIR Team
- Company: PlanB Global Network Ltd Şti
- Check logs in `/tmp/logs/` for debugging
