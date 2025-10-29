import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Policy {
  id: string;
  policy_name: string;
  policy_provider: string;
  policy_number: string;
  monthly_emi: number;
  emi_date: number;
  user_id: string;
}

interface Profile {
  email: string;
  full_name: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting EMI reminder check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();

    console.log(`Checking for EMIs due on day: ${tomorrowDay}`);

    // Get all active policies with EMI due tomorrow
    const { data: policies, error: policiesError } = await supabase
      .from("insurance_policies")
      .select("id, policy_name, policy_provider, policy_number, monthly_emi, emi_date, user_id")
      .eq("policy_status", "active")
      .eq("emi_date", tomorrowDay)
      .not("monthly_emi", "is", null);

    if (policiesError) {
      console.error("Error fetching policies:", policiesError);
      throw policiesError;
    }

    console.log(`Found ${policies?.length || 0} policies with EMI due tomorrow`);

    if (!policies || policies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No EMI reminders to send", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group policies by user
    const policiesByUser = policies.reduce((acc: { [key: string]: Policy[] }, policy: Policy) => {
      if (!acc[policy.user_id]) {
        acc[policy.user_id] = [];
      }
      acc[policy.user_id].push(policy);
      return acc;
    }, {});

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send emails to each user
    for (const [userId, userPolicies] of Object.entries(policiesByUser)) {
      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${userId}:`, profileError);
          emailsFailed++;
          continue;
        }

        const totalEMI = userPolicies.reduce((sum, p) => sum + Number(p.monthly_emi), 0);

        // Create email HTML
        const policiesHTML = userPolicies
          .map(
            (policy) => `
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${policy.policy_name}</h3>
              <p style="margin: 4px 0; color: #64748b;"><strong>Provider:</strong> ${policy.policy_provider}</p>
              <p style="margin: 4px 0; color: #64748b;"><strong>Policy Number:</strong> ${policy.policy_number}</p>
              <p style="margin: 4px 0; color: #2563eb; font-size: 20px; font-weight: bold;">₹${Number(policy.monthly_emi).toLocaleString('en-IN')}</p>
            </div>
          `
          )
          .join("");

        const emailHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">InsurTrack</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">EMI Payment Reminder</p>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h2 style="color: #1e293b; margin: 0 0 16px 0;">Hello ${profile.full_name || 'there'},</h2>
                  
                  <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
                    This is a friendly reminder that you have <strong>${userPolicies.length}</strong> insurance 
                    ${userPolicies.length === 1 ? 'policy' : 'policies'} with EMI payment due <strong>tomorrow (${tomorrow.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })})</strong>.
                  </p>

                  <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                    <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: bold;">
                      Total Amount Due: ₹${totalEMI.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <h3 style="color: #1e293b; margin: 0 0 16px 0;">Policy Details:</h3>
                  ${policiesHTML}

                  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                    Please ensure sufficient funds are available in your account to avoid any late payment charges or policy lapses.
                  </p>

                  <div style="text-align: center; margin-top: 32px;">
                    <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; 
                              padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Dashboard
                    </a>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
                  <p>© 2024 InsurTrack. All rights reserved.</p>
                  <p>This is an automated reminder from your insurance management system.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "InsurTrack <onboarding@resend.dev>",
          to: [profile.email],
          subject: `EMI Payment Reminder - ₹${totalEMI.toLocaleString('en-IN')} Due Tomorrow`,
          html: emailHTML,
        });

        console.log(`Email sent successfully to ${profile.email}:`, emailResponse);
        emailsSent++;
      } catch (error) {
        console.error(`Error sending email for user ${userId}:`, error);
        emailsFailed++;
      }
    }

    const response = {
      message: "EMI reminders processed",
      policiesFound: policies.length,
      emailsSent,
      emailsFailed,
      usersNotified: emailsSent,
    };

    console.log("Final result:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-emi-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
