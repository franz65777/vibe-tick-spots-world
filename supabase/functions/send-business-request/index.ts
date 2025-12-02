import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessRequestEmail {
  businessName: string;
  businessType: string;
  description: string;
  contactEmail: string;
  contactPhone?: string;
  locationName: string;
  locationAddress: string;
  userName: string;
  userEmail: string;
  documentUrls?: string[];
}

// HTML sanitization to prevent XSS/injection in emails
const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validate URL to only allow http/https protocols
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: BusinessRequestEmail = await req.json();
    
    console.log("Processing business request email:", requestData);

    // Sanitize all user inputs before interpolating into HTML
    const safeBusinessName = escapeHtml(requestData.businessName);
    const safeBusinessType = escapeHtml(requestData.businessType);
    const safeDescription = escapeHtml(requestData.description) || 'N/A';
    const safeLocationName = escapeHtml(requestData.locationName);
    const safeLocationAddress = escapeHtml(requestData.locationAddress);
    const safeContactEmail = escapeHtml(requestData.contactEmail);
    const safeContactPhone = escapeHtml(requestData.contactPhone) || 'N/A';

    // Filter and sanitize document URLs - only allow http/https
    const safeDocumentUrls = (requestData.documentUrls || [])
      .filter(isValidUrl)
      .map(url => escapeHtml(url));

    const documentsList = safeDocumentUrls.length > 0
      ? `<h3>Attached Documents:</h3><ul>${safeDocumentUrls.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
      : '<p><em>No documents attached</em></p>';

    // Send email to the user making the request (since external domains need verification)
    const emailResponse = await resend.emails.send({
      from: "Spott Business <onboarding@resend.dev>",
      to: [requestData.userEmail],
      cc: [requestData.contactEmail],
      subject: `Business Account Request Received - ${safeBusinessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Business Account Request Received</h1>
          <p style="font-size: 16px; color: #666;">Thank you for submitting your business account request. We have received your application and will review it shortly.</p>
          
          <h2 style="color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">Submitted Information</h2>
          
          <h3 style="color: #555; margin-top: 20px;">Business Information</h3>
          <p><strong>Business Name:</strong> ${safeBusinessName}</p>
          <p><strong>Business Type:</strong> ${safeBusinessType}</p>
          <p><strong>Description:</strong> ${safeDescription}</p>
          
          <h3 style="color: #555; margin-top: 20px;">Location Details</h3>
          <p><strong>Location Name:</strong> ${safeLocationName}</p>
          <p><strong>Address:</strong> ${safeLocationAddress}</p>
          
          <h3 style="color: #555; margin-top: 20px;">Contact Information</h3>
          <p><strong>Contact Email:</strong> ${safeContactEmail}</p>
          <p><strong>Contact Phone:</strong> ${safeContactPhone}</p>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            ${documentsList}
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 5px;">
            <p style="margin: 0; color: #1976d2; font-weight: bold;">What's Next?</p>
            <p style="margin: 10px 0 0 0; color: #555;">Our team will review your request and get back to you within 1-2 business days. You will receive an email notification once your account is approved.</p>
          </div>
          
          <p style="margin-top: 30px; color: #888; font-size: 12px;">
            This is an automated confirmation from Spott. If you have any questions, please reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending business request email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
