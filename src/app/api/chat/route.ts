import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ignoatjmfuhdxrmjycpp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SUPABASE_CHAT_CONFIG_ID = 'goinfi-system-ap1-chat-messages';

export interface ChatMessage {
  id: string;
  senderPin: string;
  senderName: string;
  senderRole?: string; // 'admin' | 'lead' | 'staff'
  department?: string;
  photoUrl?: string;
  text: string;
  type?: 'normal' | 'urgent' | 'announcement';
  createdAt: string;
  likes?: string[];
  pinned?: boolean;
}

function getLocalChatCachePath(): string {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }
    return path.join(dataDir, 'ap1_group_chat_messages.json');
  } catch {}
  return '/tmp/ap1_group_chat_messages.json';
}

// In-memory cache for ultra-fast multi-user polling
let memoryChatCache: { messages: ChatMessage[]; lastFetched: number } | null = null;

const INITIAL_WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome-sys-1',
    senderPin: '1',
    senderName: 'AP1 Newsroom Admin',
    senderRole: 'admin',
    department: 'Management & IT',
    photoUrl: '',
    text: '🙏 AP1 Television आधिकारिक Staff Group Chat मा सम्पूर्ण कर्मचारी तथा प्राविधिक टिमलाई स्वागत छ! यहाँ प्रसारण, सिफ्ट, अफिस सूचना तथा आपसी समन्वयका कुराकानी गर्न सक्नुहुन्छ।',
    type: 'announcement',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likes: ['1'],
    pinned: true,
  }
];

async function loadChatMessages(forceRefresh = false): Promise<ChatMessage[]> {
  const now = Date.now();
  if (!forceRefresh && memoryChatCache && now - memoryChatCache.lastFetched < 2000) {
    return memoryChatCache.messages;
  }

  // 1. Fetch from persistent local file
  try {
    const p = getLocalChatCachePath();
    const fallbackP = '/tmp/ap1_group_chat_messages.json';
    const filePath = fs.existsSync(p) ? p : (fs.existsSync(fallbackP) ? fallbackP : null);
    if (filePath) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryChatCache = { messages: parsed, lastFetched: now };
        return parsed;
      }
    }
  } catch {}

  // 2. Fetch from Supabase Cloud
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', SUPABASE_CHAT_CONFIG_ID)
      .maybeSingle();

    if (!error && data?.content?.[0]?.messages) {
      const msgs = Array.isArray(data.content[0].messages) ? data.content[0].messages : [];
      if (msgs.length > 0) {
        memoryChatCache = { messages: msgs, lastFetched: now };
        // Sync to local file
        try {
          fs.writeFileSync(getLocalChatCachePath(), JSON.stringify(msgs, null, 2), 'utf-8');
        } catch {}
        return msgs;
      }
    }
  } catch (err) {
    console.warn('[Chat API] Supabase read note:', err);
  }

  // Fallback to initial welcome message
  memoryChatCache = { messages: INITIAL_WELCOME_MESSAGES, lastFetched: now };
  return INITIAL_WELCOME_MESSAGES;
}

async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  // Keep only the most recent 300 messages to keep storage snappy
  const trimmed = messages.slice(-300);
  memoryChatCache = { messages: trimmed, lastFetched: Date.now() };

  const raw = JSON.stringify(trimmed, null, 2);

  // 1. Save to local persistent file
  try {
    fs.writeFileSync(getLocalChatCachePath(), raw, 'utf-8');
    try {
      fs.writeFileSync('/tmp/ap1_group_chat_messages.json', raw, 'utf-8');
    } catch {}
  } catch (err) {
    console.error('[Chat API] Local save error:', err);
  }

  // 2. Save to Supabase Cloud
  try {
    await supabase.from('articles').upsert({
      id: SUPABASE_CHAT_CONFIG_ID,
      slug: 'goinfi-chat-ap1',
      title: 'AP1 Enterprise HRMS Staff Chat',
      category: 'team_chat',
      content: [{ messages: trimmed, updatedAt: new Date().toISOString() }]
    });
  } catch (err) {
    console.error('[Chat API] Supabase save error:', err);
  }
}

// GET /api/chat - List all chat messages
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const allMessages = await loadChatMessages();

    let filtered = allMessages;
    if (since) {
      filtered = allMessages.filter(m => m.createdAt > since);
    } else {
      filtered = allMessages.slice(-limit);
    }

    return NextResponse.json({
      success: true,
      messages: filtered,
      total: allMessages.length,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a new group message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderPin, senderName, senderRole, department, photoUrl, text, type } = body;

    if (!senderPin || !senderName) {
      return NextResponse.json(
        { success: false, error: 'Sender PIN and name are required' },
        { status: 400 }
      );
    }

    const cleanText = (text || '').trim();
    if (!cleanText) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    if (cleanText.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderPin: String(senderPin).trim(),
      senderName: String(senderName).trim(),
      senderRole: senderRole || 'staff',
      department: department || 'AP1 Staff',
      photoUrl: photoUrl || '',
      text: cleanText,
      type: type === 'urgent' ? 'urgent' : (type === 'announcement' ? 'announcement' : 'normal'),
      createdAt: new Date().toISOString(),
      likes: [],
      pinned: type === 'announcement' && senderRole === 'admin',
    };

    const currentMessages = await loadChatMessages(true);
    const updated = [...currentMessages, newMessage];
    await saveChatMessages(updated);

    return NextResponse.json({
      success: true,
      message: newMessage,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat - Like / Acknowledge a message or Pin/Unpin
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, pin, action } = body;

    if (!messageId || !pin) {
      return NextResponse.json(
        { success: false, error: 'messageId and pin required' },
        { status: 400 }
      );
    }

    const messages = await loadChatMessages(true);
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const target = { ...messages[idx] };
    const likesSet = new Set(target.likes || []);

    if (action === 'toggle_like') {
      if (likesSet.has(pin)) {
        likesSet.delete(pin);
      } else {
        likesSet.add(pin);
      }
      target.likes = Array.from(likesSet);
    } else if (action === 'toggle_pin') {
      target.pinned = !target.pinned;
    }

    messages[idx] = target;
    await saveChatMessages(messages);

    return NextResponse.json({
      success: true,
      message: target
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update message' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat - Delete a message (Sender or Admin)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const messageId = url.searchParams.get('id');
    const pin = url.searchParams.get('pin');
    const isAdmin = url.searchParams.get('isAdmin') === 'true';

    if (!messageId || !pin) {
      return NextResponse.json(
        { success: false, error: 'id and pin required' },
        { status: 400 }
      );
    }

    const messages = await loadChatMessages(true);
    const target = messages.find(m => m.id === messageId);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    // Only original sender or Admin can delete
    if (target.senderPin !== pin && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized to delete this message' }, { status: 403 });
    }

    const updated = messages.filter(m => m.id !== messageId);
    await saveChatMessages(updated);

    return NextResponse.json({ success: true, deletedId: messageId });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
