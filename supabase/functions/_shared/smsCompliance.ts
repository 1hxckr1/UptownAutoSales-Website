export const COMPLIANCE_MESSAGES = {
  CONSENT_DISCLOSURE: `By submitting this form or continuing, you agree to receive text messages from Trinity Motorcar Company about vehicles, pricing, and appointments. Message frequency varies. Message & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. We do not share mobile information with third parties.`,

  OPT_OUT_CONFIRMATION: `You have been opted out and will no longer receive text messages from us. Reply START to re-subscribe.`,

  HELP_RESPONSE: `Trinity Motorcar Company support: call 706-237-7668. Reply STOP to opt out. Message frequency varies. Message & data rates may apply.`,

  RE_OPT_IN_CONFIRMATION: `You have been re-subscribed and will receive text messages from Trinity Motorcar Company. Reply STOP to opt out anytime.`,
};

export const STOP_KEYWORDS = [
  'stop',
  'stopall',
  'unsubscribe',
  'cancel',
  'end',
  'quit',
];

export const HELP_KEYWORDS = [
  'help',
  'info',
  'support',
];

export const START_KEYWORDS = [
  'start',
  'unstop',
  'subscribe',
  'yes',
];

export function isStopKeyword(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return STOP_KEYWORDS.includes(normalized);
}

export function isHelpKeyword(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return HELP_KEYWORDS.includes(normalized);
}

export function isStartKeyword(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return START_KEYWORDS.includes(normalized);
}

export async function handleOptOut(
  supabaseClient: any,
  phone: string,
  keyword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const timestamp = new Date().toISOString();

    const updates = {
      sms_opt_in_status: 'opted_out',
      sms_opt_out_timestamp: timestamp,
      sms_opt_out_keyword: keyword.toUpperCase(),
    };

    const updatePromises = [
      supabaseClient.from('leads').update(updates).eq('phone', phone),
      supabaseClient.from('finance_applications').update(updates).eq('phone', phone),
      supabaseClient.from('trade_ins').update(updates).eq('phone', phone),
    ];

    await Promise.all(updatePromises);

    return {
      success: true,
      message: COMPLIANCE_MESSAGES.OPT_OUT_CONFIRMATION,
    };
  } catch (error) {
    console.error('Error handling opt-out:', error);
    return {
      success: false,
      message: COMPLIANCE_MESSAGES.OPT_OUT_CONFIRMATION,
    };
  }
}

export async function handleReOptIn(
  supabaseClient: any,
  phone: string
): Promise<{ success: boolean; message: string }> {
  try {
    const timestamp = new Date().toISOString();

    const updates = {
      sms_opt_in_status: 'opted_in',
      sms_opt_in_timestamp: timestamp,
      sms_opt_in_method: 'inbound_text',
      sms_opt_in_language_snapshot: COMPLIANCE_MESSAGES.RE_OPT_IN_CONFIRMATION,
      sms_opt_out_timestamp: null,
      sms_opt_out_keyword: null,
    };

    const updatePromises = [
      supabaseClient.from('leads').update(updates).eq('phone', phone),
      supabaseClient.from('finance_applications').update(updates).eq('phone', phone),
      supabaseClient.from('trade_ins').update(updates).eq('phone', phone),
    ];

    await Promise.all(updatePromises);

    return {
      success: true,
      message: COMPLIANCE_MESSAGES.RE_OPT_IN_CONFIRMATION,
    };
  } catch (error) {
    console.error('Error handling re-opt-in:', error);
    return {
      success: false,
      message: COMPLIANCE_MESSAGES.RE_OPT_IN_CONFIRMATION,
    };
  }
}

export async function checkOptInStatus(
  supabaseClient: any,
  phone: string
): Promise<'opted_in' | 'opted_out' | 'unknown'> {
  try {
    const { data: lead } = await supabaseClient
      .from('leads')
      .select('sms_opt_in_status')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lead?.sms_opt_in_status) {
      return lead.sms_opt_in_status;
    }

    const { data: financeApp } = await supabaseClient
      .from('finance_applications')
      .select('sms_opt_in_status')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (financeApp?.sms_opt_in_status) {
      return financeApp.sms_opt_in_status;
    }

    const { data: tradeIn } = await supabaseClient
      .from('trade_ins')
      .select('sms_opt_in_status')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return tradeIn?.sms_opt_in_status || 'unknown';
  } catch (error) {
    console.error('Error checking opt-in status:', error);
    return 'unknown';
  }
}

export function extractPhoneFromMessage(message: string): string | null {
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const match = message.match(phoneRegex);
  return match ? match[0].replace(/\D/g, '') : null;
}

export function shouldShowConsentDisclosure(
  hasPhone: boolean,
  optInStatus: string
): boolean {
  return hasPhone && (optInStatus === 'unknown' || optInStatus === 'opted_out');
}
