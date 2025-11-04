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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: BusinessRequestEmail = await req.json();
    
    console.log("Processing business request email:", requestData);

    const documentsList = requestData.documentUrls && requestData.documentUrls.length > 0
      ? `<h3>Attached Documents:</h3><ul>${requestData.documentUrls.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
      : '<p><em>No documents attached</em></p>';

    const emailResponse = await resend.emails.send({
      from: "Spott Business Requests <onboarding@resend.dev>",
      to: ["spott.business.request@gmail.com"],
      subject: `New Business Account Request - ${requestData.businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Business Account Request</h1>
          
          <h2 style="color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px;">Business Information</h2>
          <p><strong>Business Name:</strong> ${requestData.businessName}</p>
          <p><strong>Business Type:</strong> ${requestData.businessType}</p>
          <p><strong>Description:</strong> ${requestData.description || 'N/A'}</p>
          
          <h2 style="color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">Location Details</h2>
          <p><strong>Location Name:</strong> ${requestData.locationName}</p>
          <p><strong>Address:</strong> ${requestData.locationAddress}</p>
          
          <h2 style="color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">Contact Information</h2>
          <p><strong>Contact Email:</strong> ${requestData.contactEmail}</p>
          <p><strong>Contact Phone:</strong> ${requestData.contactPhone || 'N/A'}</p>
          
          <h2 style="color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">Applicant Details</h2>
          <p><strong>User Name:</strong> ${requestData.userName}</p>
          <p><strong>User Email:</strong> ${requestData.userEmail}</p>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            ${documentsList}
          </div>
          
          <p style="margin-top: 30px; color: #888; font-size: 12px;">
            This is an automated email from the Spott business request system.
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
