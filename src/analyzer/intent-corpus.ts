/**
 * Intent Query Corpus
 * The 50 most common agent queries by category.
 * These are what agents actually search for when selecting tools.
 */

export type Category =
  | 'data-feeds'
  | 'computation'
  | 'research'
  | 'crypto-defi'
  | 'media'
  | 'communication'
  | 'general';

export const INTENT_QUERIES: Record<Category, string[]> = {
  'data-feeds': [
    'get current price of token',
    'fetch real-time market data',
    'lookup token price in USDC',
    'get trending tokens right now',
    'fetch token market cap and volume',
    'get exchange rate between two assets',
    'historical price data for asset',
    'get token holder count',
    'on-chain activity for wallet',
    'fetch DEX liquidity data',
  ],
  'computation': [
    'run python code',
    'execute calculation',
    'process data with custom logic',
    'transform JSON data',
    'compute statistics on dataset',
    'run LLM inference',
    'generate embeddings for text',
    'classify text into categories',
    'extract entities from text',
    'summarize long document',
  ],
  'research': [
    'search the web for recent news',
    'find information about topic',
    'get latest tweets about subject',
    'research company background',
    'find academic papers on topic',
    'get trending topics on social media',
    'search for documentation',
    'find similar content to URL',
    'get answers from the web',
    'extract content from webpage',
  ],
  'crypto-defi': [
    'swap token on DEX',
    'get swap quote for tokens',
    'get best route for token swap',
    'fetch wallet portfolio',
    'get wallet token balances',
    'check token allowance',
    'bridge tokens cross-chain',
    'get gas price estimate',
    'fetch transaction history',
    'check if address is contract',
  ],
  'media': [
    'generate image from text prompt',
    'edit existing image',
    'create video from text',
    'animate image to video',
    'transcribe audio to text',
    'generate speech from text',
    'upscale image resolution',
    'remove background from image',
    'generate music from description',
    'create 3D model from image',
  ],
  'communication': [
    'send email to recipient',
    'read emails from inbox',
    'create new email inbox for agent',
    'send message to user',
    'post to social media',
    'read messages from channel',
    'schedule message for later',
    'get unread notifications',
    'search email threads',
    'forward email to address',
  ],
  'general': [
    'get current time and date',
    'convert units of measurement',
    'translate text to another language',
    'parse structured data',
    'validate input format',
    'generate random identifier',
    'format data as markdown',
    'check URL is reachable',
    'compress or encode data',
    'decrypt or decode content',
  ],
};

export function detectCategory(toolName: string, description: string): Category {
  const text = `${toolName} ${description}`.toLowerCase();

  const signals: Record<Category, string[]> = {
    'crypto-defi': ['swap', 'defi', 'token', 'wallet', 'chain', 'gas', 'solana', 'eth', 'base', 'usdc', 'dex', 'pool', 'bridge'],
    'data-feeds': ['price', 'market', 'feed', 'rate', 'ticker', 'quote', 'trending', 'volume'],
    'media': ['image', 'video', 'audio', 'music', '3d', 'generate', 'animation', 'speech', 'transcribe', 'upscale'],
    'research': ['search', 'web', 'tweet', 'twitter', 'news', 'article', 'find', 'similar', 'answer', 'extract', 'content'],
    'computation': ['compute', 'calculate', 'run', 'execute', 'inference', 'embedding', 'classify', 'transform'],
    'communication': ['email', 'send', 'inbox', 'message', 'notify', 'post', 'slack', 'discord'],
    'general': [],
  };

  let best: Category = 'general';
  let bestScore = 0;

  for (const [cat, words] of Object.entries(signals) as [Category, string[]][]) {
    const score = words.filter(w => text.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return best;
}
