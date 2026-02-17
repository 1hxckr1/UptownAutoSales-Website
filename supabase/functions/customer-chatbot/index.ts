import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  COMPLIANCE_MESSAGES,
  isStopKeyword,
  isHelpKeyword,
  isStartKeyword,
  handleOptOut,
  handleReOptIn,
  checkOptInStatus,
  extractPhoneFromMessage,
  shouldShowConsentDisclosure,
} from "../_shared/smsCompliance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  message: string;
  phone?: string;
  context?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, phone, context }: ChatMessage = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ response: "Please provide a message." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const messageText = message.toLowerCase().trim();
    const userPhone = phone || extractPhoneFromMessage(message);

    if (isStopKeyword(messageText)) {
      const result = await handleOptOut(supabaseClient, userPhone || "unknown", message);
      return new Response(
        JSON.stringify({
          response: result.message,
          compliance_action: "opt_out",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (isHelpKeyword(messageText)) {
      return new Response(
        JSON.stringify({
          response: COMPLIANCE_MESSAGES.HELP_RESPONSE,
          compliance_action: "help",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (isStartKeyword(messageText) && userPhone) {
      const result = await handleReOptIn(supabaseClient, userPhone);
      return new Response(
        JSON.stringify({
          response: result.message,
          compliance_action: "re_opt_in",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (userPhone) {
      const optInStatus = await checkOptInStatus(supabaseClient, userPhone);

      if (optInStatus === 'opted_out') {
        return new Response(
          JSON.stringify({
            response: "We respect your privacy. You are currently opted out of SMS messages. Reply START if you'd like to re-subscribe.",
            compliance_action: "blocked_opted_out",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const { data: dealer } = await supabaseClient
      .from("dealer_info")
      .select("*")
      .eq("dealer_id", "trinity")
      .maybeSingle();

    const { data: vehicles, count } = await supabaseClient
      .from("vehicles")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .limit(5);

    const response = generateResponse(messageText, dealer, vehicles, count || 0);

    const responseData: any = { response };

    if (userPhone) {
      const optInStatus = await checkOptInStatus(supabaseClient, userPhone);
      if (shouldShowConsentDisclosure(true, optInStatus)) {
        responseData.consent_disclosure = COMPLIANCE_MESSAGES.CONSENT_DISCLOSURE;
        responseData.show_consent_notice = true;
      }
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({
        response: "I'm having trouble processing your request. Please try again or contact us directly.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function generateResponse(
  message: string,
  dealer: any,
  vehicles: any[],
  totalCount: number,
): string {
  if (
    message.includes("hello") ||
    message.includes("hi") ||
    message.includes("hey")
  ) {
    return `Hello! Welcome to ${dealer?.name || "our dealership"}! How can I help you today? I can assist you with information about our inventory, financing options, or answer any questions you may have.`;
  }

  if (
    message.includes("hour") ||
    message.includes("open") ||
    message.includes("close") ||
    message.includes("time")
  ) {
    return `We're open Monday through Saturday from 9:00 AM to 7:00 PM, and Sunday from 11:00 AM to 5:00 PM. You can also reach us anytime at ${dealer?.phone || "our phone number"}. Would you like to schedule a visit?`;
  }

  if (
    message.includes("location") ||
    message.includes("address") ||
    message.includes("where") ||
    message.includes("directions")
  ) {
    const address = dealer?.address
      ? `${dealer.address}, ${dealer.city}, ${dealer.state} ${dealer.zip_code}`
      : "our location";
    return `We're located at ${address}. You can find us easily using GPS or maps. Would you like directions or have any questions about visiting us?`;
  }

  if (
    message.includes("phone") ||
    message.includes("call") ||
    message.includes("contact") ||
    message.includes("reach")
  ) {
    return `You can reach us at ${dealer?.phone || "our phone number"}. We're available Monday through Saturday from 9:00 AM to 7:00 PM, and Sunday from 11:00 AM to 5:00 PM. Feel free to call us anytime during business hours!`;
  }

  if (
    message.includes("inventory") ||
    message.includes("car") ||
    message.includes("vehicle") ||
    message.includes("stock") ||
    message.includes("available")
  ) {
    if (totalCount > 0) {
      const makes = [...new Set(vehicles?.map((v) => v.make))].slice(0, 3);
      const makesList = makes.length > 0 ? makes.join(", ") : "various makes";
      return `We currently have ${totalCount} quality vehicles in stock, including ${makesList} and more! Each vehicle comes with a detailed history report. Would you like to browse our inventory online or schedule a test drive?`;
    }
    return `We have a great selection of quality vehicles available! I'd be happy to help you find the perfect one. What type of vehicle are you looking for?`;
  }

  if (
    message.includes("financing") ||
    message.includes("finance") ||
    message.includes("loan") ||
    message.includes("payment") ||
    message.includes("credit")
  ) {
    return `We offer flexible financing options for all credit types! Our finance team can help you find the best rates and terms. Would you like to get pre-approved online or speak with one of our finance specialists?`;
  }

  if (
    message.includes("trade") ||
    message.includes("trade-in") ||
    message.includes("sell my")
  ) {
    return `Great! We accept trade-ins and offer competitive valuations. You can get an instant estimate online by providing some basic information about your vehicle. Would you like me to guide you through the process?`;
  }

  if (
    message.includes("test drive") ||
    message.includes("schedule") ||
    message.includes("appointment") ||
    message.includes("visit")
  ) {
    return `I'd be happy to help you schedule a test drive! You can book an appointment online or give us a call at ${dealer?.phone || "our phone number"}. Is there a specific vehicle you're interested in?`;
  }

  if (
    message.includes("carfax") ||
    message.includes("history") ||
    message.includes("report") ||
    message.includes("accident")
  ) {
    return `All our vehicles come with comprehensive CARFAX history reports! You can view the full report on each vehicle's detail page. These reports include accident history, service records, and ownership information. Would you like to see our inventory?`;
  }

  if (
    message.includes("warranty") ||
    message.includes("guarantee") ||
    message.includes("protection")
  ) {
    return `We offer various warranty and protection options for your peace of mind. Our team can discuss extended warranties, service contracts, and other protection plans that fit your needs. Would you like to speak with one of our specialists?`;
  }

  if (
    message.includes("price") ||
    message.includes("cost") ||
    message.includes("how much")
  ) {
    return `Our prices are competitive and transparent! Each vehicle listing includes the full price, and we're always happy to discuss financing options. Would you like to browse our inventory to see current pricing, or do you have a specific budget in mind?`;
  }

  if (message.includes("thank")) {
    return `You're very welcome! If you have any other questions or would like to schedule a visit, feel free to ask. We're here to help!`;
  }

  if (
    message.includes("bye") ||
    message.includes("goodbye") ||
    message.includes("see you")
  ) {
    return `Thank you for chatting with us! If you need anything else, we're just a message away. Have a great day!`;
  }

  return `I'd be happy to help you! We can assist with:
• Browsing our ${totalCount > 0 ? totalCount + " quality vehicles" : "vehicle inventory"}
• Financing and pre-approval
• Trade-in valuations
• Scheduling test drives
• Vehicle history reports

What would you like to know more about?`;
}
