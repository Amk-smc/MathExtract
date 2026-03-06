# MathExtract

> Extract math and science problems from textbook photos. Generate a clean, printable PDF with working space — ready to solve.

![MathExtract Demo](./public/demo.png)
<!-- Replace with a real screenshot when available -->

---

## What It Does

MathExtract uses AI vision to scan a photo or PDF of any textbook page, detect every question on it, and produce a formatted PDF where each problem has:

- The problem label and full text
- Any referenced figures, cropped directly from your image
- A generous blank working space below each problem

No more rewriting questions by hand. Upload, verify, download.

---

## Features

- **AI-powered detection** — Gemini 2.5 Flash Lite reads your image and extracts every problem automatically
- **Human verification** — Review, edit, add, or delete any detected problem before generating
- **Figure cropping** — Draw a selection box over any diagram or graph and it gets attached to the right problem
- **Clean PDF output** — A4 layout with problem text, figures, and blank working space per problem
- **Two layout options** — Figure beside or below the problem text
- **Runs on your own API key** — You control your usage and costs

---

## Demo

| Step | Description |
|------|-------------|
| 1. Upload | Drop a photo or PDF of a textbook page |
| 2. Detect | AI scans the page and lists every problem |
| 3. Verify | Edit, delete, or add problems manually |
| 4. Crop figures | Select diagram regions with a drag tool |
| 5. Download | Get a clean PDF ready to print or solve |

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| AI Vision | Google Gemini 2.5 Flash Lite |
| PDF Generation | jsPDF |
| Styling | Tailwind CSS |
| Language | TypeScript |

---

## Setup

### Prerequisites
- Node.js 18+
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Amk-smc/MathExtract.git
cd MathExtract

# 2. Install dependencies
npm install

# 3. Set up your API key
cp .env.example .env.local
```

Open `.env.local` and replace the placeholder with your real Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
# 4. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Getting a Gemini API Key (Free)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API key** → **Create API key**
4. Copy and paste it into `.env.local`

---

## Roadmap

- [ ] PDF upload with page selection (currently image only)
- [ ] User accounts with usage tracking
- [ ] Subscription tiers (Free / Pro / Unlimited)
- [ ] Custom working space size per problem
- [ ] LaTeX rendering for math notation in PDF
- [ ] Mobile-optimized crop tool
- [ ] Batch processing (multiple pages at once)
- [ ] Export to Notion or Google Docs

---

## Contributing

Contributions are welcome. To get started:

```bash
# Fork the repo, then clone your fork
git clone https://github.com/your-username/MathExtract.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then push
git push origin feature/your-feature-name

# Open a Pull Request on GitHub
```

Please keep PRs focused — one feature or fix per PR.

---

## License

MIT License — free to use, modify, and distribute. See [LICENSE](./LICENSE) for details.

---

## Author

Built by [@Amk-smc](https://github.com/Amk-smc)
